from fastapi import APIRouter
from database import get_db

router = APIRouter()

BLENDED_COST_PER_M = 9.0


@router.get("/analytics/overview")
async def get_overview():
    async with get_db() as db:
        row = await db.execute_fetchall(
            "SELECT COUNT(*) as total, "
            "SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed, "
            "SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed, "
            "SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) as running, "
            "SUM(total_tokens) as total_tokens, "
            "SUM(total_iterations) as total_iterations, "
            "SUM(total_tool_calls) as total_tool_calls, "
            "AVG(total_tokens) as avg_tokens_per_task, "
            "AVG(total_iterations) as avg_iterations_per_task "
            "FROM tasks"
        )
        stats = dict(row[0]) if row else {}

    total_tokens = stats.get("total_tokens") or 0
    total_tasks = stats.get("total") or 0
    completed = stats.get("completed") or 0
    success_rate = round((completed / total_tasks) * 100, 1) if total_tasks > 0 else 0

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed,
        "failed_tasks": stats.get("failed") or 0,
        "running_tasks": stats.get("running") or 0,
        "success_rate": success_rate,
        "total_tokens": total_tokens,
        "total_iterations": stats.get("total_iterations") or 0,
        "total_tool_calls": stats.get("total_tool_calls") or 0,
        "avg_tokens_per_task": round(stats.get("avg_tokens_per_task") or 0),
        "avg_iterations_per_task": round(stats.get("avg_iterations_per_task") or 0, 1),
        "estimated_total_cost": round((total_tokens / 1_000_000) * BLENDED_COST_PER_M, 4),
    }


@router.get("/analytics/tasks-over-time")
async def get_tasks_over_time():
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT date(created_at) as day, "
            "COUNT(*) as total, "
            "SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed, "
            "SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed "
            "FROM tasks WHERE created_at IS NOT NULL "
            "GROUP BY date(created_at) ORDER BY day DESC LIMIT 30"
        )
    return [dict(r) for r in rows][::-1]


@router.get("/analytics/tokens-over-time")
async def get_tokens_over_time():
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT date(created_at) as day, "
            "SUM(total_tokens) as tokens, "
            "COUNT(*) as tasks "
            "FROM tasks WHERE created_at IS NOT NULL AND total_tokens > 0 "
            "GROUP BY date(created_at) ORDER BY day DESC LIMIT 30"
        )
    result = []
    for r in reversed(list(rows)):
        d = dict(r)
        d["cost"] = round(((d.get("tokens") or 0) / 1_000_000) * BLENDED_COST_PER_M, 4)
        result.append(d)
    return result


@router.get("/analytics/agent-performance")
async def get_agent_performance():
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT agent_name, "
            "COUNT(DISTINCT task_id) as task_count, "
            "SUM(tokens_used) as total_tokens, "
            "AVG(duration_ms) as avg_duration_ms, "
            "COUNT(*) as total_actions "
            "FROM agent_logs "
            "GROUP BY agent_name ORDER BY task_count DESC LIMIT 20"
        )
    return [dict(r) for r in rows]


@router.get("/analytics/tool-usage")
async def get_tool_usage():
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT tool_name, "
            "COUNT(*) as call_count, "
            "AVG(duration_ms) as avg_duration_ms, "
            "SUM(CASE WHEN action_type='tool_result' THEN 1 ELSE 0 END) as results "
            "FROM agent_logs "
            "WHERE tool_name IS NOT NULL AND tool_name != '' "
            "GROUP BY tool_name ORDER BY call_count DESC"
        )
    return [dict(r) for r in rows]


@router.get("/analytics/cost-breakdown")
async def get_cost_breakdown():
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT date(created_at) as day, "
            "SUM(total_tokens) as tokens "
            "FROM tasks WHERE created_at IS NOT NULL AND total_tokens > 0 "
            "GROUP BY date(created_at) ORDER BY day DESC LIMIT 30"
        )
    result = []
    cumulative = 0
    for r in reversed(list(rows)):
        d = dict(r)
        tokens = d.get("tokens") or 0
        daily_cost = round((tokens / 1_000_000) * BLENDED_COST_PER_M, 4)
        cumulative += daily_cost
        result.append({
            "day": d["day"],
            "daily_cost": daily_cost,
            "cumulative_cost": round(cumulative, 4),
            "tokens": tokens,
        })
    return result


@router.get("/analytics/recent-tasks")
async def get_recent_tasks():
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT id, goal, status, total_tokens, total_iterations, total_tool_calls, created_at, completed_at "
            "FROM tasks ORDER BY created_at DESC LIMIT 20"
        )
    result = []
    for r in rows:
        d = dict(r)
        d["estimated_cost"] = round(((d.get("total_tokens") or 0) / 1_000_000) * BLENDED_COST_PER_M, 4)
        result.append(d)
    return result
