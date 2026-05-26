import io
import os
import zipfile
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse

from database import get_db
from models.db_models import get_task, create_task, get_memories, update_task

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


@router.get("/tasks/{task_id}/workspace/download")
async def download_workspace(task_id: str):
    async with get_db() as db:
        task = await get_task(db, task_id)
        if not task:
            raise HTTPException(404, "Task not found")

    workspace = Path(task["workspace_path"])
    if not workspace.exists():
        raise HTTPException(404, "Workspace not found")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, filenames in os.walk(workspace):
            for name in filenames:
                if name.startswith(".tmp_code"):
                    continue
                full = Path(root) / name
                rel = full.relative_to(workspace)
                zf.write(full, str(rel))
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=workspace-{task_id[:8]}.zip"},
    )


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
    text_extensions = {
        ".py", ".js", ".ts", ".jsx", ".tsx", ".md", ".txt", ".csv", ".json",
        ".html", ".css", ".sh", ".yaml", ".yml", ".toml", ".cfg", ".ini",
        ".xml", ".sql", ".r", ".rb", ".go", ".rs", ".java", ".c", ".cpp", ".h",
    }

    if suffix in text_extensions:
        content = target.read_text(encoding="utf-8", errors="replace")
        return {"path": file_path, "content": content, "size": len(content)}

    return FileResponse(target)


@router.post("/tasks/{task_id}/followup")
async def create_followup_task(task_id: str, body: dict):
    async with get_db() as db:
        parent = await get_task(db, task_id)
        if not parent:
            raise HTTPException(404, "Parent task not found")

    goal = body.get("goal", "")
    if not goal:
        raise HTTPException(400, "Goal is required")

    import uuid
    from datetime import datetime, timezone
    from config import settings

    new_id = uuid.uuid4().hex
    new_workspace = str(settings.workspaces_dir / new_id)
    Path(new_workspace).mkdir(parents=True, exist_ok=True)

    parent_workspace = Path(parent["workspace_path"])
    if parent_workspace.exists():
        for item in parent_workspace.iterdir():
            if item.name.startswith(".tmp_code"):
                continue
            dest = Path(new_workspace) / item.name
            if item.is_file():
                shutil.copy2(item, dest)
            elif item.is_dir():
                shutil.copytree(item, dest)

    async with get_db() as db:
        await create_task(
            db, goal,
            bool(parent.get("require_approval")),
            parent.get("max_iterations") or 25,
            new_workspace,
            task_id=new_id,
        )

        parent_memories = await get_memories(db, task_id)
        from models.db_models import save_memory
        for mem in parent_memories:
            await save_memory(db, new_id, mem["key"], mem["value"], mem["memory_type"])

        if parent.get("result"):
            await save_memory(
                db, new_id,
                "previous_task_result",
                parent["result"][:3000],
                "fact",
            )

        task = await get_task(db, new_id)
        return {"id": new_id, "goal": goal, "status": task["status"], "workspace_path": new_workspace}
