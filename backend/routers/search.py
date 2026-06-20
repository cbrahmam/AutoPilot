from fastapi import APIRouter, Query

from core.search import global_search

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(q: str = Query(..., min_length=2), limit: int = Query(20, ge=1, le=100)):
    return await global_search(q, limit)
