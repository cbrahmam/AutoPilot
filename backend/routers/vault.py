from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from core.auth import decode_token
from core.vault import store_key, list_keys, delete_key, update_key

router = APIRouter()


def _get_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_token(auth[7:])
        if payload:
            return payload["sub"]
    return ""


class KeyCreate(BaseModel):
    name: str
    service: str
    api_key: str
    team_id: str = ""


class KeyUpdate(BaseModel):
    name: str | None = None
    service: str | None = None
    api_key: str | None = None


@router.get("/vault/keys")
async def list_all_keys(team_id: str | None = None):
    return await list_keys(team_id)


@router.post("/vault/keys")
async def create_key(body: KeyCreate, request: Request):
    user_id = _get_user_id(request)
    if not body.api_key or len(body.api_key) < 4:
        raise HTTPException(400, "API key is too short")
    return await store_key(body.name, body.service, body.api_key, body.team_id, user_id)


@router.put("/vault/keys/{key_id}")
async def update_existing_key(key_id: str, body: KeyUpdate):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    result = await update_key(key_id, **fields)
    if not result:
        raise HTTPException(404, "Key not found")
    return result


@router.delete("/vault/keys/{key_id}")
async def delete_existing_key(key_id: str):
    await delete_key(key_id)
    return {"status": "deleted"}
