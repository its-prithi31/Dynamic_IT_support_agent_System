"""Deterministic safety controls applied before and after every model call."""
import re
from typing import Any, Dict, List


class Guardrails:
    CREDENTIALS = [
        r"(?i)\b(?:password|passwd|api[_ -]?key|secret|access[_ -]?token|auth[_ -]token|bearer token)\s*[:=]\s*([^\s,;]+)",
        r"\b(?:AKIA|sk-)[A-Za-z0-9_\-]{12,}\b",
        r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----",
        r"\b1\.3\.6\.1\.4\.1\.\d{1,}\b",  # common OID patterns
    ]
    PERSONAL_DATA = [
        r"\b\d{3}-\d{2}-\d{4}\b",
        r"\b(?:\d[ -]?){13,16}\b",
        r"\b\d{4}\.\d{4}\.\d{4}\.\d{4}\b",
        r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
    ]
    INJECTION = [
        r"ignore (?:all |any |the )?(?:previous|prior|above) instructions?",
        r"(?:reveal|show|print|dump) (?:the )?(?:system prompt|hidden instructions|secrets?)",
        r"(?:jailbreak|developer mode|do anything now|bypass (?:the )?(?:guardrails|policy|safety))",
        r"(?:override|disable|ignore) safety",
        r"(?:answer|respond) (?:without|above) restrictions",
    ]
    UNSAFE_OUTPUT = [
        r"\bexfiltrat(?:e|ion)\b",
        r"\bprivate key\b",
        r"\bcurl .+\|\s*(?:sh|bash)\b",
        r"\bexec\(|\bsystem\(|\bsubprocess\b",
        r"\b(?:ssh|scp) .*\b",
    ]

    def inspect_input(self, text: str) -> Dict[str, Any]:
        reasons: List[str] = []
        text = text or ""
        if any(re.search(pattern, text, re.I) for pattern in self.INJECTION):
            reasons.append("prompt_injection")
        if any(re.search(pattern, text, re.I) for pattern in self.CREDENTIALS):
            reasons.append("credential_detected")
        if any(re.search(pattern, text, re.I) for pattern in self.PERSONAL_DATA):
            reasons.append("personal_data_detected")
        if re.search(r"\b(?:kill process|delete all|format disk|wipe data|remove system files)\b", text, re.I):
            reasons.append("malicious_instruction")
        return {
            "allowed": len(reasons) == 0,
            "reasons": reasons,
            "sanitized": self.sanitize_user_input(text),
        }

    def detect_prompt_injection(self, prompt_text: str) -> bool:
        return "prompt_injection" in self.inspect_input(prompt_text)["reasons"]

    def sanitize_user_input(self, text: str) -> str:
        sanitized = text or ""
        for pattern in self.CREDENTIALS:
            sanitized = re.sub(pattern, "[REDACTED_CREDENTIAL]", sanitized, flags=re.I)
        for pattern in self.PERSONAL_DATA:
            sanitized = re.sub(pattern, "[REDACTED_PERSONAL_DATA]", sanitized)
        return sanitized

    def allow_response(self, response_text: str) -> bool:
        if not response_text:
            return False
        if any(re.search(pattern, response_text, re.I) for pattern in self.UNSAFE_OUTPUT + self.CREDENTIALS):
            return False
        if re.search(r"\b(?:password|secret|token|private key|api key|ssn|social security)\b", response_text, re.I):
            return False
        return True

    def mask_sensitive_output(self, response_text: str) -> str:
        masked = response_text or ""
        for pattern in self.CREDENTIALS + self.PERSONAL_DATA:
            masked = re.sub(pattern, "[REDACTED]", masked, flags=re.I)
        return masked
