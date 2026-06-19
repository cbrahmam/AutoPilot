from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse
from core.audit import get_audit_logs, get_audit_stats, export_audit_csv
import io

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
async def list_audit_logs(
    user_id: str | None = Query(None),
    action: str | None = Query(None),
    target_type: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    return await get_audit_logs(
        user_id=user_id,
        action=action,
        target_type=target_type,
        limit=limit,
        offset=offset,
    )


@router.get("/stats")
async def audit_stats():
    return await get_audit_stats()


@router.get("/export/csv")
async def export_csv(
    user_id: str | None = Query(None),
    action: str | None = Query(None),
    limit: int = Query(1000, ge=1, le=10000),
):
    csv_data = await export_audit_csv(user_id=user_id, action=action, limit=limit)
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_log.csv"},
    )
