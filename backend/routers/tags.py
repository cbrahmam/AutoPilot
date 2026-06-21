from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.tags import (
    create_tag, list_tags, update_tag, delete_tag,
    add_tag_to_task, remove_tag_from_task, get_task_tags,
    get_tasks_by_tag, get_tag_counts,
)

router = APIRouter(prefix="/tags", tags=["tags"])


class TagCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    description: str = ""


class TagUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    description: str | None = None


@router.get("")
async def list_all():
    return await list_tags()


@router.post("")
async def create(body: TagCreate):
    try:
        return await create_tag(body.name, body.color, body.description)
    except Exception as e:
        if "UNIQUE" in str(e):
            raise HTTPException(409, "Tag name already exists")
        raise


@router.put("/{tag_id}")
async def update(tag_id: str, body: TagUpdate):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    result = await update_tag(tag_id, **fields)
    if not result:
        raise HTTPException(404, "Tag not found")
    return result


@router.delete("/{tag_id}")
async def delete(tag_id: str):
    await delete_tag(tag_id)
    return {"status": "deleted"}


@router.get("/counts")
async def counts():
    return await get_tag_counts()


@router.get("/tasks/{tag_id}")
async def tasks_by_tag(tag_id: str):
    return await get_tasks_by_tag(tag_id)


@router.get("/task/{task_id}")
async def task_tags(task_id: str):
    return await get_task_tags(task_id)


@router.post("/task/{task_id}/{tag_id}")
async def tag_task(task_id: str, tag_id: str):
    return await add_tag_to_task(task_id, tag_id)


@router.delete("/task/{task_id}/{tag_id}")
async def untag_task(task_id: str, tag_id: str):
    await remove_tag_from_task(task_id, tag_id)
    return {"status": "removed"}
