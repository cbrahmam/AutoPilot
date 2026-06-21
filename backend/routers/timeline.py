from fastapi import APIRouter, Query

from core.timeline import list_events, get_timeline_stats, delete_event, build_timeline_from_existing

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("/events")
async def events(
    event_type: str | None = Query(None),
    source: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return await list_events(event_type or "", source or "", limit, offset)


@router.get("/stats")
async def stats():
    return await get_timeline_stats()


@router.post("/rebuild")
async def rebuild():
    await build_timeline_from_existing()
    return {"status": "rebuilt"}


@router.delete("/events/{event_id}")
async def delete(event_id: str):
    await delete_event(event_id)
    return {"status": "deleted"}
