import json
import uuid
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


async def record_event(event_type: str, title: str, description: str = "", source: str = "", source_id: str = "", metadata: dict | None = None) -> dict:
    eid = _id()
    now = _now()
    meta_json = json.dumps(metadata or {})
    async with get_db() as db:
        await db.execute(
            "INSERT INTO timeline_events (id, event_type, title, description, source, source_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (eid, event_type, title, description, source, source_id, meta_json, now),
        )
        await db.commit()
    return {"id": eid, "event_type": event_type, "title": title, "description": description, "source": source, "source_id": source_id, "metadata": metadata or {}, "created_at": now}


async def list_events(event_type: str = "", source: str = "", limit: int = 100, offset: int = 0) -> list[dict]:
    conditions = []
    params = []
    if event_type:
        conditions.append("event_type = ?")
        params.append(event_type)
    if source:
        conditions.append("source = ?")
        params.append(source)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.extend([limit, offset])
    async with get_db() as db:
        cursor = await db.execute(
            f"SELECT * FROM timeline_events {where} ORDER BY created_at DESC LIMIT ? OFFSET ?", params
        )
        rows = await cursor.fetchall()
    return [_format(dict(r)) for r in rows]


async def get_timeline_stats() -> dict:
    async with get_db() as db:
        total_row = await db.execute_fetchall("SELECT COUNT(*) as total FROM timeline_events")
        total = dict(total_row[0])["total"] if total_row else 0

        types_row = await db.execute_fetchall(
            "SELECT event_type, COUNT(*) as count FROM timeline_events GROUP BY event_type ORDER BY count DESC LIMIT 10"
        )
        by_type = [dict(r) for r in types_row]

        daily_row = await db.execute_fetchall(
            "SELECT date(created_at) as day, COUNT(*) as count FROM timeline_events WHERE created_at IS NOT NULL GROUP BY date(created_at) ORDER BY day DESC LIMIT 14"
        )
        daily = [dict(r) for r in daily_row][::-1]

    return {"total": total, "by_type": by_type, "daily": daily}


async def delete_event(event_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM timeline_events WHERE id = ?", (event_id,))
        await db.commit()


async def build_timeline_from_existing():
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, goal, status, created_at FROM tasks ORDER BY created_at DESC LIMIT 50"
        )
        for row in await cursor.fetchall():
            r = dict(row)
            await record_event("task.created", f"Task created: {r['goal'][:100]}", source="task", source_id=r["id"])

        cursor = await db.execute(
            "SELECT id, action, target_type, details, created_at FROM audit_log ORDER BY created_at DESC LIMIT 50"
        )
        for row in await cursor.fetchall():
            r = dict(row)
            await record_event(f"audit.{r['action']}", r['action'], description=r.get('details', ''), source="audit", source_id=r["id"])


def _format(row: dict) -> dict:
    if isinstance(row.get("metadata"), str):
        try:
            row["metadata"] = json.loads(row["metadata"])
        except (json.JSONDecodeError, TypeError):
            row["metadata"] = {}
    return row
