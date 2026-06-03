import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional

from database import get_db
from models.db_models import create_task, update_task, get_task
from config import settings


def _parse_cron_field(field: str, min_val: int, max_val: int) -> list[int]:
    if field == "*":
        return list(range(min_val, max_val + 1))
    if "/" in field:
        base, step = field.split("/", 1)
        start = min_val if base == "*" else int(base)
        return list(range(start, max_val + 1, int(step)))
    if "," in field:
        return [int(x) for x in field.split(",")]
    if "-" in field:
        lo, hi = field.split("-", 1)
        return list(range(int(lo), int(hi) + 1))
    return [int(field)]


def matches_cron(cron_expr: str, dt: datetime) -> bool:
    parts = cron_expr.strip().split()
    if len(parts) != 5:
        return False
    minute, hour, day, month, dow = parts
    try:
        return (
            dt.minute in _parse_cron_field(minute, 0, 59)
            and dt.hour in _parse_cron_field(hour, 0, 23)
            and dt.day in _parse_cron_field(day, 1, 31)
            and dt.month in _parse_cron_field(month, 1, 12)
            and dt.weekday() in _parse_cron_field(dow, 0, 6)
        )
    except (ValueError, IndexError):
        return False


class TaskScheduler:
    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self):
        while self._running:
            await asyncio.sleep(60)
            try:
                await self._check_schedules()
            except Exception:
                pass

    async def _check_schedules(self):
        now = datetime.now(timezone.utc)

        async with get_db() as db:
            cursor = await db.execute(
                "SELECT * FROM schedules WHERE enabled = 1"
            )
            rows = await cursor.fetchall()

        for row in rows:
            schedule = dict(row)
            if not matches_cron(schedule["cron_expr"], now):
                continue

            await self._trigger_task(schedule)

    async def _trigger_task(self, schedule: dict):
        from pathlib import Path
        task_id = uuid.uuid4().hex
        workspace_path = str(settings.workspaces_dir / task_id)
        Path(workspace_path).mkdir(parents=True, exist_ok=True)

        async with get_db() as db:
            await create_task(
                db,
                schedule["goal"],
                False,
                schedule.get("max_iterations") or 25,
                workspace_path,
                task_id=task_id,
            )
            await db.execute(
                "UPDATE schedules SET last_run = ?, run_count = run_count + 1 WHERE id = ?",
                (datetime.now(timezone.utc).isoformat(), schedule["id"]),
            )
            await db.commit()

        from routers.tasks import _execute_with_plan
        asyncio.create_task(_execute_with_plan(task_id))


scheduler = TaskScheduler()
