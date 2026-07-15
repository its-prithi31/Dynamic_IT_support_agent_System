import os
import requests
from typing import List


def openai_embedding(text: str, model: str = "text-embedding-3-small") -> List[float]:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return []
    url = "https://api.openai.com/v1/embeddings"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    body = {"model": model, "input": text}
    r = requests.post(url, json=body, headers=headers, timeout=20)
    r.raise_for_status()
    data = r.json()
    return data.get("data", [])[0].get("embedding", [])


def get_embedding(text: str) -> List[float]:
    # Currently supports OpenAI embeddings only; return empty if no key
    return openai_embedding(text)
