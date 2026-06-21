from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from core.auth import decode_token
from core.env_vars import create_var, list_vars, get_var, update_var, delete_var, get_env_for_task

router = APIRouter(prefix="/env", tags=["env"])


def _get_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_token(auth[7:])
        if payload:
            return payload["sub"]
    return ""


class VarCreate(BaseModel):
    name: str
    value: str
    scope: str = "global"
    scope_id: str = ""
    encrypted: bool = False


class VarUpdate(BaseModel):
    name: str | None = None
    value: str | None = None
    scope: str | None = None
    encrypted: bool | None = None


@router.get("/variables")
async def list_all(scope: str | None = Query(None), scope_id: str | None = Query(None)):
    return await list_vars(scope or "", scope_id or "")


@router.post("/variables")
async def create(body: VarCreate, request: Request):
    user_id = _get_user_id(request)
    return await create_var(body.name, body.value, body.scope, body.scope_id, body.encrypted, user_id)


@router.get("/variables/{var_id}")
async def get_one(var_id: str, reveal: bool = Query(False)):
    result = await get_var(var_id, reveal=reveal)
    if not result:
        raise HTTPException(404, "Variable not found")
    return result


@router.put("/variables/{var_id}")
async def update(var_id: str, body: VarUpdate):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    result = await update_var(var_id, **fields)
    if not result:
        raise HTTPException(404, "Variable not found")
    return result


@router.delete("/variables/{var_id}")
async def delete(var_id: str):
    await delete_var(var_id)
    return {"status": "deleted"}


@router.get("/resolve/{task_id}")
async def resolve(task_id: str):
    return await get_env_for_task(task_id)
