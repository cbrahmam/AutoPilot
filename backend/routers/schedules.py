import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_db

router = APIRouter()


class ScheduleCreate(BaseModel):
    name: str
    goal: str
    cron_expr: str
    max_iterations: int = 25
    enabled: bool = True


class ScheduleUpdate(BaseModel):
    name: str | None = None
    goal: str | None = None
    cron_expr: str | None = None
    max_iterations: int | None = None
    enabled: bool | None = None


@router.get("/schedules")
async def list_schedules():
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM schedules ORDER BY created_at DESC")
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.post("/schedules")
async def create_schedule(body: ScheduleCreate):
    schedule_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc).isoformat()

    async with get_db() as db:
        await db.execute(
            """INSERT INTO schedules (id, name, goal, cron_expr, max_iterations, enabled, run_count, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 0, ?)""",
            (schedule_id, body.name, body.goal, body.cron_expr, body.max_iterations, int(body.enabled), now),
        )
        await db.commit()

    return {
        "id": schedule_id,
        "name": body.name,
        "goal": body.goal,
        "cron_expr": body.cron_expr,
        "max_iterations": body.max_iterations,
        "enabled": body.enabled,
        "run_count": 0,
        "created_at": now,
    }


@router.put("/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, body: ScheduleUpdate):
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM schedules WHERE id = ?", (schedule_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Schedule not found")

        updates = {}
        if body.name is not None:
            updates["name"] = body.name
        if body.goal is not None:
            updates["goal"] = body.goal
        if body.cron_expr is not None:
            updates["cron_expr"] = body.cron_expr
        if body.max_iterations is not None:
            updates["max_iterations"] = body.max_iterations
        if body.enabled is not None:
            updates["enabled"] = int(body.enabled)

        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [schedule_id]
            await db.execute(f"UPDATE schedules SET {set_clause} WHERE id = ?", values)
            await db.commit()

        cursor = await db.execute("SELECT * FROM schedules WHERE id = ?", (schedule_id,))
        return dict(await cursor.fetchone())


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    async with get_db() as db:
        cursor = await db.execute("SELECT id FROM schedules WHERE id = ?", (schedule_id,))
        if not await cursor.fetchone():
            raise HTTPException(404, "Schedule not found")
        await db.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
        await db.commit()
    return {"deleted": True}
