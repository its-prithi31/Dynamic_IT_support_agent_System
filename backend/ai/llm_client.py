import os
import requests
from typing import Optional


class LLMClient:
    """Simple LLM client supporting Ollama via HTTP or falling back to None.

    Configure via env var `LLM_PROVIDER` (ollama|openai|none) and provider-specific vars.
    """

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "ollama")
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.openai_key = os.getenv("OPENAI_API_KEY")

    def complete(self, prompt: str, model: Optional[str] = None) -> str:
        if self.provider == "ollama":
            try:
                url = f"{self.ollama_url.rstrip('/')}/api/generate"
                payload = {"model": model or os.getenv("OLLAMA_MODEL", "llama3.2"), "prompt": prompt, "stream": False}
                r = requests.post(url, json=payload, timeout=30)
                r.raise_for_status()
                data = r.json()
                return data.get("response") or data.get("completion") or ""
            except Exception:
                return ""
        if self.provider == "openai" and self.openai_key:
            try:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {"Authorization": f"Bearer {self.openai_key}", "Content-Type": "application/json"}
                body = {"model": model or os.getenv("OPENAI_MODEL", "gpt-4o-mini"), "messages": [{"role": "user", "content": prompt}], "max_tokens": 800}
                r = requests.post(url, json=body, headers=headers, timeout=30)
                r.raise_for_status()
                data = r.json()
                return data["choices"][0]["message"]["content"]
            except Exception:
                return ""
        # fallback
        return ""
