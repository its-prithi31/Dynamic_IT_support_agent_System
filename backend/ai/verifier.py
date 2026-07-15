"""Response quality gate. Unsafe or unsupported answers escalate."""
from typing import Any, Dict
from .guardrails import Guardrails


class ResponseVerifier:
    def __init__(self):
        self.guardrails = Guardrails()

    def evaluate(self, response: Dict[str, Any]) -> Dict[str, Any]:
        answer = (response.get("response") or "").strip()
        sources = response.get("sources") or []
        security_reasons = response.get("security_reasons") or []
        issues = []

        if not response.get("allowed", False):
            issues.append("unsafe_response")
        if security_reasons:
            issues.extend([r for r in security_reasons if r not in issues])
        if not answer or len(answer) < 100:
            issues.append("incomplete_response")
        if not self.guardrails.allow_response(answer):
            issues.append("response_guardrail_blocked")
        if not sources:
            issues.append("no_supporting_source")
            issues.append("hallucination_risk")
        if response.get("model") is None:
            issues.append("missing_model_metadata")

        accuracy_penalty = 0
        if "unsafe_response" in issues or "response_guardrail_blocked" in issues:
            accuracy_penalty += 40
        if "incomplete_response" in issues:
            accuracy_penalty += 20
        if "no_supporting_source" in issues or "hallucination_risk" in issues:
            accuracy_penalty += 15
        if "prompt_injection" in issues or "malicious_instruction" in issues:
            accuracy_penalty += 25

        confidence = max(0, min(100, 100 - accuracy_penalty))
        final_ok = not any(reason in issues for reason in ["unsafe_response", "response_guardrail_blocked", "incomplete_response", "malicious_instruction"])

        return {
            "ok": final_ok,
            "issues": issues,
            "confidence": confidence,
            "source_available": bool(sources),
            "model": response.get("model"),
            "response_length": len(answer),
            "raw_response": response.get("raw_response"),
            "hallucination_risk": "hallucination_risk" in issues,
        }
