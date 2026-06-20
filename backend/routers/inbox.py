from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

from core.auth import decode_token
from core.inbox import (
    list_notifications, get_unread_count, mark_read, mark_all_read,
    delete_notification, clear_all, create_notification,
)

router = APIRouter(prefix="/inbox", tags=["inbox"])


def _get_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_token(auth[7:])
        if payload:
            return payload["sub"]
    return ""


class NotificationCreate(BaseModel):
    title: str
    message: str = ""
    category: str = "info"
    link: str = ""


@router.get("/notifications")
async def list_all(
    request: Request,
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    user_id = _get_user_id(request)
    return await list_notifications(user_id, unread_only=unread_only, limit=limit, offset=offset)


@router.get("/unread-count")
async def unread_count(request: Request):
    user_id = _get_user_id(request)
    count = await get_unread_count(user_id)
    return {"count": count}


@router.post("/notifications")
async def create(body: NotificationCreate, request: Request):
    user_id = _get_user_id(request)
    return await create_notification(user_id, body.title, body.message, body.category, body.link)


@router.put("/notifications/{notification_id}/read")
async def read_notification(notification_id: str):
    result = await mark_read(notification_id)
    return result or {"status": "not_found"}


@router.put("/read-all")
async def read_all(request: Request):
    user_id = _get_user_id(request)
    count = await mark_all_read(user_id)
    return {"marked": count}


@router.delete("/notifications/{notification_id}")
async def remove(notification_id: str):
    await delete_notification(notification_id)
    return {"status": "deleted"}


@router.delete("/clear")
async def clear(request: Request):
    user_id = _get_user_id(request)
    await clear_all(user_id)
    return {"status": "cleared"}
