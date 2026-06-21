import json
import uuid
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


DEFAULT_PREFERENCES = {
    "default_model": "claude-sonnet-4-20250514",
    "default_max_iterations": 25,
    "default_require_approval": False,
    "notifications_enabled": True,
    "notification_on_complete": True,
    "notification_on_failure": True,
    "notification_on_approval": True,
    "theme": "dark",
    "sidebar_collapsed": False,
    "tasks_per_page": 20,
    "auto_execute": False,
    "show_token_usage": True,
    "show_cost_estimates": True,
    "timezone": "UTC",
    "date_format": "relative",
}


async def get_preferences(user_id: str) -> dict:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM user_preferences WHERE user_id = ?", (user_id,))
        row = await cursor.fetchone()
    if not row:
        return {**DEFAULT_PREFERENCES, "user_id": user_id}
    d = dict(row)
    prefs = DEFAULT_PREFERENCES.copy()
    if isinstance(d.get("preferences"), str):
        try:
            saved = json.loads(d["preferences"])
            prefs.update(saved)
        except (json.JSONDecodeError, TypeError):
            pass
    prefs["user_id"] = user_id
    prefs["updated_at"] = d.get("updated_at")
    return prefs


async def save_preferences(user_id: str, preferences: dict) -> dict:
    now = _now()
    prefs_json = json.dumps(preferences)
    async with get_db() as db:
        existing = await db.execute("SELECT id FROM user_preferences WHERE user_id = ?", (user_id,))
        row = await existing.fetchone()
        if row:
            await db.execute(
                "UPDATE user_preferences SET preferences = ?, updated_at = ? WHERE user_id = ?",
                (prefs_json, now, user_id),
            )
        else:
            await db.execute(
                "INSERT INTO user_preferences (id, user_id, preferences, updated_at, created_at) VALUES (?, ?, ?, ?, ?)",
                (_id(), user_id, prefs_json, now, now),
            )
        await db.commit()
    return await get_preferences(user_id)


async def update_preference(user_id: str, key: str, value) -> dict:
    prefs = await get_preferences(user_id)
    prefs.pop("user_id", None)
    prefs.pop("updated_at", None)
    prefs[key] = value
    return await save_preferences(user_id, prefs)


async def reset_preferences(user_id: str) -> dict:
    async with get_db() as db:
        await db.execute("DELETE FROM user_preferences WHERE user_id = ?", (user_id,))
        await db.commit()
    return {**DEFAULT_PREFERENCES, "user_id": user_id}
