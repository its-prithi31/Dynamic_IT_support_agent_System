from typing import Dict, Any, List
from .prompt_manager import PromptManager
from .guardrails import Guardrails
from .llm_client import LLMClient
from .rag import RAG
import uuid, time


_LLM = LLMClient()
_RAG = RAG()


from typing import Dict, Any, List, Optional
from .prompt_manager import PromptManager
from .guardrails import Guardrails
from .llm_client import LLMClient
from .rag import RAG
import uuid, time


_LLM = LLMClient()
_RAG = RAG()


class AIRouter:
    def __init__(self, prompt_manager: PromptManager, guardrails: Guardrails):
        self.pm = prompt_manager
        self.gr = guardrails

    def route(self, user_input: str, context: Dict[str, Any], request_id: Optional[str] = None) -> Dict[str, Any]:
        started = time.perf_counter()
        if not request_id:
            request_id = str(uuid.uuid4())
        inspection = self.gr.inspect_input(user_input)
        sanitized = inspection["sanitized"]
        if not inspection["allowed"]:
            return {
                "request_id": request_id,
                "response": "",
                "allowed": False,
                "sources": [],
                "security_reasons": inspection["reasons"],
                "confidence": 0,
                "model": _LLM.provider,
            }

        # Retrieve supporting docs (RAG)
        db = context.get("db")
        docs = []
        if db is not None:
            try:
                docs = _RAG.retrieve(db, sanitized)
            except Exception:
                docs = []

        retrieved = [
            {
                "title": d.title,
                "excerpt": (d.content or "")[:240],
            }
            for d in docs
        ]

        classification_prompt = self.pm.build_prompt(
            system_id="system_core",
            task_id="agent_classifier",
            context={"user_input": sanitized, "retrieved": retrieved},
            agent="agent_classifier",
        )
        classification = _LLM.complete(classification_prompt) or "Unable to classify the issue."

        solution_prompt = self.pm.build_prompt(
            system_id="system_core",
            task_id="agent_solution",
            context={
                "user_input": sanitized,
                "retrieved": retrieved,
                "classification": classification,
            },
            agent="agent_solution",
        )
        solution = _LLM.complete(solution_prompt)
        if not solution:
            solution = self.fake_llm(solution_prompt)

        # Automatic one-shot retry for low confidence / weak evidence
        retry_prompt = None
        retry_solution = None
        if not self.gr.allow_response(solution) or not retrieved or len(solution.strip()) < 120:
            retry_prompt = self.pm.build_prompt(
                system_id="system_core",
                task_id="agent_solution",
                context={
                    "user_input": sanitized,
                    "retrieved": retrieved,
                    "classification": classification,
                    "retry_reason": "initial response unsafe or incomplete",
                },
                agent="agent_solution",
                request_id=request_id + "-retry",
            )
            retry_solution = _LLM.complete(retry_prompt)
            if retry_solution and self.gr.allow_response(retry_solution):
                solution = retry_solution

        verification_prompt = self.pm.build_prompt(
            system_id="system_core",
            task_id="agent_verification",
            context={
                "solution": solution,
                "retrieved": retrieved,
                "classification": classification,
            },
            agent="agent_verification",
            request_id=request_id,
        )
        verification = _LLM.complete(verification_prompt) or "Unable to verify solution safety and completeness."

        safe = self.gr.allow_response(solution)
        masked_output = self.gr.mask_sensitive_output(solution) if safe else ""
        prompt_records = [
            {"id": "agent_classifier", "role": "assistant", "version": self.pm.get("agent_classifier").version if self.pm.get("agent_classifier") else "1.0", "content": classification_prompt, "model": _LLM.provider},
            {"id": "agent_solution", "role": "assistant", "version": self.pm.get("agent_solution").version if self.pm.get("agent_solution") else "1.0", "content": solution_prompt, "model": _LLM.provider},
        ]
        if retry_prompt is not None:
            prompt_records.append({"id": "agent_solution_retry", "role": "assistant", "version": self.pm.get("agent_solution").version if self.pm.get("agent_solution") else "1.0", "content": retry_prompt, "model": _LLM.provider})
        prompt_records.append({"id": "agent_verification", "role": "assistant", "version": self.pm.get("agent_verification").version if self.pm.get("agent_verification") else "1.0", "content": verification_prompt, "model": _LLM.provider})
        return {
            "request_id": request_id,
            "classification": classification,
            "response": masked_output,
            "verification": verification,
            "allowed": safe,
            "sources": [d.title for d in docs],
            "model": _LLM.provider,
            "prompt_version": "1.0",
            "ts": int(time.time()),
            "workflow": ["classification", "rag_retrieval", "solution_generation", "verification"],
            "raw_response": solution,
            "security_reasons": inspection["reasons"],
            "prompt_records": prompt_records,
            "prompt_history": [
                {"step": "classification", "prompt_id": "agent_classifier", "version": prompt_records[0]["version"], "model": _LLM.provider},
                {"step": "solution", "prompt_id": "agent_solution", "version": prompt_records[1]["version"], "model": _LLM.provider},
                {"step": "verification", "prompt_id": "agent_verification", "version": prompt_records[2]["version"], "model": _LLM.provider},
            ],
            "usage": {
                "prompt_tokens_estimate": sum(max(1, len(p["content"]) // 4) for p in prompt_records),
                "completion_tokens_estimate": max(1, len(solution) // 4),
                "processing_ms": round((time.perf_counter() - started) * 1000, 1),
            },
        }

    def fake_llm(self, prompt: str) -> str:
        return "Step 1: Gather logs. Step 2: Reproduce issue. Step 3: Apply approved remediation. Verification: confirm resolution."
