import uuid
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


async def create_notification(user_id: str, title: str, message: str = "", category: str = "info", link: str = "") -> dict:
    nid = _id()
    now = _now()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO inbox_notifications (id, user_id, title, message, category, link, read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
            (nid, user_id, title, message, category, link, now),
        )
        await db.commit()
    return {"id": nid, "user_id": user_id, "title": title, "message": message, "category": category, "link": link, "read": False, "created_at": now}


async def list_notifications(user_id: str = "", unread_only: bool = False, limit: int = 50, offset: int = 0) -> list[dict]:
    conditions = []
    params = []
    if user_id:
        conditions.append("user_id = ?")
        params.append(user_id)
    if unread_only:
        conditions.append("read = 0")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.extend([limit, offset])
    async with get_db() as db:
        cursor = await db.execute(
            f"SELECT * FROM inbox_notifications {where} ORDER BY created_at DESC LIMIT ? OFFSET ?", params
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_unread_count(user_id: str = "") -> int:
    condition = "WHERE user_id = ? AND read = 0" if user_id else "WHERE read = 0"
    params = [user_id] if user_id else []
    async with get_db() as db:
        cursor = await db.execute(f"SELECT COUNT(*) as count FROM inbox_notifications {condition}", params)
        row = await cursor.fetchone()
    return dict(row)["count"] if row else 0


async def mark_read(notification_id: str) -> dict | None:
    async with get_db() as db:
        await db.execute("UPDATE inbox_notifications SET read = 1 WHERE id = ?", (notification_id,))
        await db.commit()
        cursor = await db.execute("SELECT * FROM inbox_notifications WHERE id = ?", (notification_id,))
        row = await cursor.fetchone()
    return dict(row) if row else None


async def mark_all_read(user_id: str = "") -> int:
    condition = "WHERE user_id = ? AND read = 0" if user_id else "WHERE read = 0"
    params = [user_id] if user_id else []
    async with get_db() as db:
        cursor = await db.execute(f"UPDATE inbox_notifications SET read = 1 {condition}", params)
        await db.commit()
    return cursor.rowcount


async def delete_notification(notification_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM inbox_notifications WHERE id = ?", (notification_id,))
        await db.commit()


async def clear_all(user_id: str = ""):
    condition = "WHERE user_id = ?" if user_id else ""
    params = [user_id] if user_id else []
    async with get_db() as db:
        await db.execute(f"DELETE FROM inbox_notifications {condition}", params)
        await db.commit()


async def notify_task_event(task_id: str, task_goal: str, event: str, user_id: str = ""):
    titles = {
        "completed": "Task Completed",
        "failed": "Task Failed",
        "approval_needed": "Approval Required",
        "comment": "New Comment",
    }
    categories = {
        "completed": "success",
        "failed": "error",
        "approval_needed": "warning",
        "comment": "info",
    }
    title = titles.get(event, f"Task {event}")
    category = categories.get(event, "info")
    message = f"{task_goal[:150]}"
    link = f"/task/{task_id}"
    await create_notification(user_id, title, message, category, link)
