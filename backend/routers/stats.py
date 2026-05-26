from fastapi import APIRouter
from database import get_db

router = APIRouter()

INPUT_COST_PER_M = 3.0
OUTPUT_COST_PER_M = 15.0
BLENDED_COST_PER_M = 9.0


@router.get("/stats")
async def get_stats():
    async with get_db() as db:
        row = await db.execute_fetchall(
            "SELECT COUNT(*) as total, "
            "SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed, "
            "SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed, "
            "SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) as running, "
            "SUM(total_tokens) as total_tokens, "
            "SUM(total_iterations) as total_iterations, "
            "SUM(total_tool_calls) as total_tool_calls "
            "FROM tasks"
        )
        stats = dict(row[0]) if row else {}

    total_tokens = stats.get("total_tokens") or 0
    estimated_cost = (total_tokens / 1_000_000) * BLENDED_COST_PER_M

    return {
        "total_tasks": stats.get("total") or 0,
        "completed_tasks": stats.get("completed") or 0,
        "failed_tasks": stats.get("failed") or 0,
        "running_tasks": stats.get("running") or 0,
        "total_tokens": total_tokens,
        "total_iterations": stats.get("total_iterations") or 0,
        "total_tool_calls": stats.get("total_tool_calls") or 0,
        "estimated_total_cost": round(estimated_cost, 4),
        "cost_per_million_tokens": BLENDED_COST_PER_M,
    }


@router.get("/tasks/{task_id}/cost")
async def get_task_cost(task_id: str):
    async with get_db() as db:
        row = await db.execute_fetchall(
            "SELECT total_tokens, total_iterations, total_tool_calls FROM tasks WHERE id = ?",
            (task_id,),
        )
        if not row:
            from fastapi import HTTPException
            raise HTTPException(404, "Task not found")
        task = dict(row[0])

    tokens = task.get("total_tokens") or 0
    cost = (tokens / 1_000_000) * BLENDED_COST_PER_M

    return {
        "task_id": task_id,
        "total_tokens": tokens,
        "total_iterations": task.get("total_iterations") or 0,
        "total_tool_calls": task.get("total_tool_calls") or 0,
        "estimated_cost": round(cost, 4),
    }
