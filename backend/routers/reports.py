from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, PlainTextResponse
from pydantic import BaseModel

from core.auth import decode_token
from core.reports import (
    generate_html_report, generate_csv_report,
    create_shared_report, get_shared_report, list_shared_reports, delete_shared_report,
)

router = APIRouter()


def _get_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_token(auth[7:])
        if payload:
            return payload["sub"]
    return ""


class ShareCreate(BaseModel):
    task_id: str
    title: str
    format: str = "html"
    expires_hours: int = 168


@router.get("/reports/{task_id}/html")
async def export_html(task_id: str):
    html = await generate_html_report(task_id)
    return HTMLResponse(content=html)


@router.get("/reports/{task_id}/csv")
async def export_csv(task_id: str):
    csv_content = await generate_csv_report(task_id)
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=task_{task_id[:8]}.csv"},
    )


@router.post("/reports/share")
async def create_share(body: ShareCreate, request: Request):
    user_id = _get_user_id(request)
    result = await create_shared_report(body.task_id, body.title, body.format, user_id, body.expires_hours)
    return result


@router.get("/reports/shared")
async def list_shares(task_id: str | None = None):
    return await list_shared_reports(task_id)


@router.get("/reports/shared/{share_token}")
async def view_shared(share_token: str):
    report = await get_shared_report(share_token)
    if not report:
        raise HTTPException(404, "Report not found or expired")

    if report.get("format") == "csv":
        return PlainTextResponse(content=report.get("content", ""), media_type="text/csv")
    return HTMLResponse(content=report.get("content", ""))


@router.delete("/reports/shared/{report_id}")
async def delete_share(report_id: str):
    await delete_shared_report(report_id)
    return {"status": "deleted"}
