from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

from core.auth import decode_token
from core.favorites import add_favorite, remove_favorite, list_favorites, is_favorited, get_favorites_with_details

router = APIRouter(prefix="/favorites", tags=["favorites"])


def _get_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_token(auth[7:])
        if payload:
            return payload["sub"]
    return ""


class FavoriteToggle(BaseModel):
    target_type: str
    target_id: str


@router.get("")
async def list_all(request: Request, target_type: str | None = Query(None), detailed: bool = Query(False)):
    user_id = _get_user_id(request)
    if detailed:
        return await get_favorites_with_details(user_id, target_type or "")
    return await list_favorites(user_id, target_type or "")


@router.post("")
async def add(body: FavoriteToggle, request: Request):
    user_id = _get_user_id(request)
    return await add_favorite(user_id, body.target_type, body.target_id)


@router.delete("")
async def remove(body: FavoriteToggle, request: Request):
    user_id = _get_user_id(request)
    await remove_favorite(user_id, body.target_type, body.target_id)
    return {"status": "removed"}


@router.get("/check")
async def check(request: Request, target_type: str = Query(...), target_id: str = Query(...)):
    user_id = _get_user_id(request)
    fav = await is_favorited(user_id, target_type, target_id)
    return {"favorited": fav}
