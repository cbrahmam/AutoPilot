from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from core.knowledge_base import ingest_document, delete_document, list_documents, search_knowledge, rebuild_index

router = APIRouter()


class SearchQuery(BaseModel):
    query: str
    top_k: int = 5


@router.get("/knowledge")
async def list_all_documents():
    return await list_documents()


@router.post("/knowledge/upload")
async def upload_document(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode(errors="replace")

    if not text.strip():
        raise HTTPException(400, "File is empty")

    if len(text) > 5_000_000:
        raise HTTPException(400, "File too large (max 5MB text)")

    result = await ingest_document(
        filename=file.filename or "unnamed",
        content=text,
        content_type=file.content_type or "text/plain",
    )
    return result


@router.post("/knowledge/text")
async def upload_text(title: str = Form(...), content: str = Form(...)):
    if not content.strip():
        raise HTTPException(400, "Content is empty")

    result = await ingest_document(
        filename=title,
        content=content,
        content_type="text/plain",
    )
    return result


@router.delete("/knowledge/{doc_id}")
async def remove_document(doc_id: str):
    await delete_document(doc_id)
    return {"status": "deleted"}


@router.post("/knowledge/search")
async def search_docs(body: SearchQuery):
    results = await search_knowledge(body.query, body.top_k)
    return {"results": results, "query": body.query}


@router.post("/knowledge/reindex")
async def reindex():
    await rebuild_index()
    return {"status": "reindexed"}
