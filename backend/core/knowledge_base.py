import math
import re
import uuid
from collections import Counter
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


def _tokenize(text: str) -> list[str]:
    return re.findall(r'\b\w+\b', text.lower())


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    words = text.split()
    if len(words) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        start += chunk_size - overlap
    return chunks


class TFIDFIndex:
    def __init__(self):
        self.documents: dict[str, list[str]] = {}
        self.idf_cache: dict[str, float] = {}
        self._dirty = True

    def add(self, doc_id: str, tokens: list[str]):
        self.documents[doc_id] = tokens
        self._dirty = True

    def remove(self, doc_id: str):
        self.documents.pop(doc_id, None)
        self._dirty = True

    def _compute_idf(self):
        if not self._dirty:
            return
        n = len(self.documents)
        if n == 0:
            self.idf_cache = {}
            self._dirty = False
            return
        doc_freq: Counter = Counter()
        for tokens in self.documents.values():
            unique = set(tokens)
            for token in unique:
                doc_freq[token] += 1
        self.idf_cache = {
            term: math.log((n + 1) / (df + 1)) + 1
            for term, df in doc_freq.items()
        }
        self._dirty = False

    def search(self, query: str, top_k: int = 5) -> list[tuple[str, float]]:
        self._compute_idf()
        query_tokens = _tokenize(query)
        if not query_tokens or not self.documents:
            return []

        query_tf = Counter(query_tokens)
        query_vec = {t: tf * self.idf_cache.get(t, 1.0) for t, tf in query_tf.items()}
        q_norm = math.sqrt(sum(v * v for v in query_vec.values()))
        if q_norm == 0:
            return []

        scores = []
        for doc_id, tokens in self.documents.items():
            doc_tf = Counter(tokens)
            doc_vec = {t: tf * self.idf_cache.get(t, 1.0) for t, tf in doc_tf.items()}
            d_norm = math.sqrt(sum(v * v for v in doc_vec.values()))
            if d_norm == 0:
                continue

            dot = sum(query_vec.get(t, 0) * doc_vec.get(t, 0) for t in set(query_vec) | set(doc_vec))
            score = dot / (q_norm * d_norm)
            if score > 0:
                scores.append((doc_id, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]


_index = TFIDFIndex()


async def ingest_document(filename: str, content: str, content_type: str = "text/plain") -> dict:
    doc_id = _id()
    chunks = _chunk_text(content)

    async with get_db() as db:
        await db.execute(
            "INSERT INTO kb_documents (id, filename, content_type, size_bytes, chunk_count, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (doc_id, filename, content_type, len(content.encode()), len(chunks), _now()),
        )

        for i, chunk in enumerate(chunks):
            chunk_id = _id()
            tokens = _tokenize(chunk)
            await db.execute(
                "INSERT INTO kb_chunks (id, document_id, chunk_index, content, tokens, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (chunk_id, doc_id, i, chunk, len(tokens), _now()),
            )
            _index.add(chunk_id, tokens)

        await db.commit()

    return {"id": doc_id, "filename": filename, "chunk_count": len(chunks), "size_bytes": len(content.encode())}


async def delete_document(doc_id: str):
    async with get_db() as db:
        cursor = await db.execute("SELECT id FROM kb_chunks WHERE document_id = ?", (doc_id,))
        chunk_rows = await cursor.fetchall()
        for row in chunk_rows:
            _index.remove(dict(row)["id"])

        await db.execute("DELETE FROM kb_chunks WHERE document_id = ?", (doc_id,))
        await db.execute("DELETE FROM kb_documents WHERE id = ?", (doc_id,))
        await db.commit()


async def list_documents() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM kb_documents ORDER BY created_at DESC")
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def search_knowledge(query: str, top_k: int = 5) -> list[dict]:
    results = _index.search(query, top_k)
    if not results:
        return []

    chunk_ids = [r[0] for r in results]
    scores = {r[0]: r[1] for r in results}

    placeholders = ",".join("?" for _ in chunk_ids)
    async with get_db() as db:
        cursor = await db.execute(
            f"SELECT c.*, d.filename FROM kb_chunks c JOIN kb_documents d ON c.document_id = d.id WHERE c.id IN ({placeholders})",
            chunk_ids,
        )
        rows = await cursor.fetchall()

    output = []
    for row in rows:
        r = dict(row)
        r["score"] = round(scores.get(r["id"], 0), 4)
        output.append(r)

    output.sort(key=lambda x: x["score"], reverse=True)
    return output


async def rebuild_index():
    _index.documents.clear()
    _index._dirty = True

    async with get_db() as db:
        cursor = await db.execute("SELECT id, content FROM kb_chunks")
        rows = await cursor.fetchall()

    for row in rows:
        r = dict(row)
        _index.add(r["id"], _tokenize(r["content"]))
