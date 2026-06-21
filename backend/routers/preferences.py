from fastapi import APIRouter, Request
from pydantic import BaseModel

from core.auth import decode_token
from core.preferences import get_preferences, save_preferences, update_preference, reset_preferences

router = APIRouter(prefix="/preferences", tags=["preferences"])


def _get_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_token(auth[7:])
        if payload:
            return payload["sub"]
    return "default"


class PreferencesSave(BaseModel):
    preferences: dict


class PreferenceUpdate(BaseModel):
    key: str
    value: str | int | bool | float


@router.get("")
async def get_prefs(request: Request):
    user_id = _get_user_id(request)
    return await get_preferences(user_id)


@router.put("")
async def save_prefs(body: PreferencesSave, request: Request):
    user_id = _get_user_id(request)
    return await save_preferences(user_id, body.preferences)


@router.patch("")
async def update_pref(body: PreferenceUpdate, request: Request):
    user_id = _get_user_id(request)
    return await update_preference(user_id, body.key, body.value)


@router.delete("")
async def reset(request: Request):
    user_id = _get_user_id(request)
    return await reset_preferences(user_id)
