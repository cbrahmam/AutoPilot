from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from core.auth import decode_token
from core.agent_profiles import create_profile, list_profiles, get_profile, update_profile, delete_profile, duplicate_profile

router = APIRouter(prefix="/profiles", tags=["profiles"])


def _get_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_token(auth[7:])
        if payload:
            return payload["sub"]
    return ""


class ProfileCreate(BaseModel):
    name: str
    description: str = ""
    system_prompt: str = ""
    model: str = "claude-sonnet-4-20250514"
    tools: list[str] = []
    max_iterations: int = 25
    temperature: float = 0.7


class ProfileUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    model: str | None = None
    tools: list[str] | None = None
    max_iterations: int | None = None
    temperature: float | None = None


@router.get("")
async def list_all():
    return await list_profiles()


@router.post("")
async def create(body: ProfileCreate, request: Request):
    user_id = _get_user_id(request)
    return await create_profile(
        body.name, body.description, body.system_prompt,
        body.model, body.tools, body.max_iterations, body.temperature, user_id,
    )


@router.get("/{profile_id}")
async def get_one(profile_id: str):
    profile = await get_profile(profile_id)
    if not profile:
        raise HTTPException(404, "Profile not found")
    return profile


@router.put("/{profile_id}")
async def update(profile_id: str, body: ProfileUpdate):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    result = await update_profile(profile_id, **fields)
    if not result:
        raise HTTPException(404, "Profile not found")
    return result


@router.delete("/{profile_id}")
async def delete(profile_id: str):
    await delete_profile(profile_id)
    return {"status": "deleted"}


@router.post("/{profile_id}/duplicate")
async def dup(profile_id: str):
    result = await duplicate_profile(profile_id)
    if not result:
        raise HTTPException(404, "Profile not found")
    return result
