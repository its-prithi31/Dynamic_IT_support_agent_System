from typing import List, Dict, Any
from sqlalchemy.orm import Session
from .embeddings import get_embedding
import re, json, math


class RAG:
    """Simple RAG retrieval layer.

    Modes:
      - keyword: basic term matching against Knowledge.title and content
      - (placeholder) vector: integrate embeddings when available
    """

    def __init__(self, mode: str = "keyword"):
        self.mode = mode

    def retrieve(self, db: Session, query: str, limit: int = 3) -> List[Any]:
        # Import models at call time: app.py constructs the router while defining
        # these models, so a module-level import would create a startup cycle.
        from ..app import Knowledge, Embedding
        # attempt vector retrieval if embeddings are available
        q = query.strip()
        # load embeddings from DB
        emb_rows = {e.knowledge_id: json.loads(e.vector) for e in db.query(Embedding).all()}
        results = []
        if emb_rows:
            q_emb = get_embedding(q)
            if q_emb:
                def cosine(a, b):
                    dot = sum(x*y for x,y in zip(a,b))
                    la = math.sqrt(sum(x*x for x in a)); lb = math.sqrt(sum(y*y for y in b))
                    return dot / (la*lb + 1e-12)
                for k in db.query(Knowledge).all():
                    v = emb_rows.get(k.id)
                    if v:
                        score = cosine(q_emb, v)
                        results.append((score, k))
                results.sort(key=lambda x: x[0], reverse=True)
                return [r[1] for r in results[:limit]]

        # fallback to keyword retrieval
        qlow = q.lower()
        for k in db.query(Knowledge).all():
            score = 0
            t = (k.title or "").lower(); c = (k.content or "").lower()
            for tok in re.findall(r"[a-zA-Z]{3,}", qlow):
                if tok in t: score += 3
                if tok in c: score += 1
            if score>0:
                results.append((score,k))
        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:limit]]
