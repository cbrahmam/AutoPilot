from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from core.auth import decode_token
from core.backup import create_backup, list_backups, get_backup_path, delete_backup, restore_backup

router = APIRouter(prefix="/backups", tags=["backups"])


def _get_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_token(auth[7:])
        if payload:
            return payload["sub"]
    return ""


@router.get("")
async def list_all():
    return await list_backups()


@router.post("")
async def create(request: Request):
    user_id = _get_user_id(request)
    return await create_backup(user_id)


@router.get("/{backup_id}/download")
async def download(backup_id: str):
    path = await get_backup_path(backup_id)
    if not path:
        raise HTTPException(404, "Backup not found")
    return FileResponse(path, media_type="application/json", filename=path.name)


@router.post("/{backup_id}/restore")
async def restore(backup_id: str):
    return await restore_backup(backup_id)


@router.delete("/{backup_id}")
async def delete(backup_id: str):
    await delete_backup(backup_id)
    return {"status": "deleted"}
