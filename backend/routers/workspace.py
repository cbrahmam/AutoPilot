import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from database import get_db
from models.db_models import get_task

router = APIRouter()


@router.get("/tasks/{task_id}/workspace")
async def list_workspace_files(task_id: str):
    async with get_db() as db:
        task = await get_task(db, task_id)
        if not task:
            raise HTTPException(404, "Task not found")

    workspace = Path(task["workspace_path"])
    if not workspace.exists():
        return {"files": []}

    files = []
    for root, dirs, filenames in os.walk(workspace):
        for name in filenames:
            if name.startswith(".tmp_code"):
                continue
            full = Path(root) / name
            rel = full.relative_to(workspace)
            files.append({
                "path": str(rel),
                "size": full.stat().st_size,
                "modified": full.stat().st_mtime,
            })

    return {"files": files}


@router.get("/tasks/{task_id}/workspace/{file_path:path}")
async def get_workspace_file(task_id: str, file_path: str):
    async with get_db() as db:
        task = await get_task(db, task_id)
        if not task:
            raise HTTPException(404, "Task not found")

    workspace = Path(task["workspace_path"]).resolve()
    target = (workspace / file_path).resolve()

    if not str(target).startswith(str(workspace)):
        raise HTTPException(403, "Path escapes workspace")
    if not target.exists():
        raise HTTPException(404, "File not found")
    if not target.is_file():
        raise HTTPException(400, "Not a file")

    suffix = target.suffix.lower()
    text_extensions = {".py", ".js", ".ts", ".md", ".txt", ".csv", ".json", ".html", ".css", ".sh", ".yaml", ".yml", ".toml", ".cfg", ".ini", ".xml", ".sql", ".r", ".rb", ".go", ".rs", ".java", ".c", ".cpp", ".h"}

    if suffix in text_extensions:
        content = target.read_text(encoding="utf-8", errors="replace")
        return {"path": file_path, "content": content, "size": len(content)}

    return FileResponse(target)
