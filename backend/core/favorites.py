import uuid
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


async def add_favorite(user_id: str, target_type: str, target_id: str) -> dict:
    existing = await get_favorite(user_id, target_type, target_id)
    if existing:
        return existing
    fid = _id()
    now = _now()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO favorites (id, user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (fid, user_id, target_type, target_id, now),
        )
        await db.commit()
    return {"id": fid, "user_id": user_id, "target_type": target_type, "target_id": target_id, "created_at": now}


async def remove_favorite(user_id: str, target_type: str, target_id: str):
    async with get_db() as db:
        await db.execute(
            "DELETE FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?",
            (user_id, target_type, target_id),
        )
        await db.commit()


async def get_favorite(user_id: str, target_type: str, target_id: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?",
            (user_id, target_type, target_id),
        )
        row = await cursor.fetchone()
    return dict(row) if row else None


async def list_favorites(user_id: str = "", target_type: str = "") -> list[dict]:
    conditions = []
    params = []
    if user_id:
        conditions.append("user_id = ?")
        params.append(user_id)
    if target_type:
        conditions.append("target_type = ?")
        params.append(target_type)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    async with get_db() as db:
        cursor = await db.execute(
            f"SELECT * FROM favorites {where} ORDER BY created_at DESC", params
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def is_favorited(user_id: str, target_type: str, target_id: str) -> bool:
    return await get_favorite(user_id, target_type, target_id) is not None


async def get_favorites_with_details(user_id: str = "", target_type: str = "") -> list[dict]:
    favs = await list_favorites(user_id, target_type)
    enriched = []
    async with get_db() as db:
        for fav in favs:
            detail = None
            if fav["target_type"] == "task":
                cursor = await db.execute("SELECT id, goal, status, created_at FROM tasks WHERE id = ?", (fav["target_id"],))
                row = await cursor.fetchone()
                if row:
                    detail = dict(row)
            elif fav["target_type"] == "pipeline":
                cursor = await db.execute("SELECT id, name, status, created_at FROM pipelines WHERE id = ?", (fav["target_id"],))
                row = await cursor.fetchone()
                if row:
                    detail = dict(row)
            elif fav["target_type"] == "template":
                detail = {"id": fav["target_id"]}
            enriched.append({**fav, "detail": detail})
    return enriched
