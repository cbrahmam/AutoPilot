from fastapi import APIRouter, HTTPException

from database import get_db
from models.schemas import AgentLogResponse
from models.db_models import get_task, get_logs, get_memories

router = APIRouter()


@router.get("/tasks/{task_id}/logs", response_model=list[AgentLogResponse])
async def get_agent_logs(task_id: str, agent_name: str | None = None):
    async with get_db() as db:
        task = await get_task(db, task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        logs = await get_logs(db, task_id, agent_name)
        return [AgentLogResponse(**log) for log in logs]


@router.get("/tasks/{task_id}/memory")
async def get_agent_memory(task_id: str):
    async with get_db() as db:
        task = await get_task(db, task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        memories = await get_memories(db, task_id)
        return memories
