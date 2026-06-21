import uuid
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


async def create_tag(name: str, color: str = "#6366f1", description: str = "") -> dict:
    tid = _id()
    now = _now()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO tags (id, name, color, description, created_at) VALUES (?, ?, ?, ?, ?)",
            (tid, name, color, description, now),
        )
        await db.commit()
    return {"id": tid, "name": name, "color": color, "description": description, "created_at": now}


async def list_tags() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM tags ORDER BY name ASC")
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def update_tag(tag_id: str, **fields) -> dict | None:
    sets = ", ".join(f"{k} = ?" for k in fields)
    vals = list(fields.values()) + [tag_id]
    async with get_db() as db:
        await db.execute(f"UPDATE tags SET {sets} WHERE id = ?", vals)
        await db.commit()
        cursor = await db.execute("SELECT * FROM tags WHERE id = ?", (tag_id,))
        row = await cursor.fetchone()
    return dict(row) if row else None


async def delete_tag(tag_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM task_tags WHERE tag_id = ?", (tag_id,))
        await db.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
        await db.commit()


async def add_tag_to_task(task_id: str, tag_id: str) -> dict:
    async with get_db() as db:
        existing = await db.execute(
            "SELECT id FROM task_tags WHERE task_id = ? AND tag_id = ?", (task_id, tag_id)
        )
        if await existing.fetchone():
            return {"status": "already_tagged"}
        link_id = _id()
        now = _now()
        await db.execute(
            "INSERT INTO task_tags (id, task_id, tag_id, created_at) VALUES (?, ?, ?, ?)",
            (link_id, task_id, tag_id, now),
        )
        await db.commit()
    return {"id": link_id, "task_id": task_id, "tag_id": tag_id, "created_at": now}


async def remove_tag_from_task(task_id: str, tag_id: str):
    async with get_db() as db:
        await db.execute(
            "DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?", (task_id, tag_id)
        )
        await db.commit()


async def get_task_tags(task_id: str) -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT t.* FROM tags t JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = ? ORDER BY t.name",
            (task_id,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_tasks_by_tag(tag_id: str) -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT tk.id, tk.goal, tk.status, tk.created_at FROM tasks tk JOIN task_tags tt ON tk.id = tt.task_id WHERE tt.tag_id = ? ORDER BY tk.created_at DESC",
            (tag_id,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_tag_counts() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT t.id, t.name, t.color, COUNT(tt.id) as task_count FROM tags t LEFT JOIN task_tags tt ON t.id = tt.tag_id GROUP BY t.id ORDER BY task_count DESC"
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]
