import hashlib
import hmac
import json
import uuid
import re
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    if not secret or not signature:
        return not secret
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    prefixed = f"sha256={expected}"
    return hmac.compare_digest(signature, expected) or hmac.compare_digest(signature, prefixed)


def render_goal(template: str, payload: dict) -> str:
    def replacer(match):
        path = match.group(1)
        value = payload
        for key in path.split("."):
            if isinstance(value, dict):
                value = value.get(key, "")
            else:
                return ""
        return str(value) if value else ""
    return re.sub(r"\{\{(\S+?)\}\}", replacer, template)


async def create_webhook(name: str, source: str, goal_template: str, secret: str = "") -> dict:
    webhook_id = _id()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO webhooks (id, name, source, secret, goal_template, enabled, trigger_count, created_at) VALUES (?, ?, ?, ?, ?, 1, 0, ?)",
            (webhook_id, name, source, secret, goal_template, _now()),
        )
        await db.commit()
    return {"id": webhook_id, "name": name, "source": source, "goal_template": goal_template, "enabled": True}


async def list_webhooks() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM webhooks ORDER BY created_at DESC")
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_webhook(webhook_id: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM webhooks WHERE id = ?", (webhook_id,))
        row = await cursor.fetchone()
    return dict(row) if row else None


async def update_webhook(webhook_id: str, **fields) -> dict | None:
    if not fields:
        return await get_webhook(webhook_id)
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [webhook_id]
    async with get_db() as db:
        await db.execute(f"UPDATE webhooks SET {set_clause} WHERE id = ?", values)
        await db.commit()
    return await get_webhook(webhook_id)


async def delete_webhook(webhook_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM webhooks WHERE id = ?", (webhook_id,))
        await db.commit()


async def log_webhook_trigger(webhook_id: str, source: str, payload: dict, task_id: str, status: str = "triggered") -> str:
    log_id = _id()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO webhook_logs (id, webhook_id, source, payload, task_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (log_id, webhook_id, source, json.dumps(payload), task_id, status, _now()),
        )
        await db.execute(
            "UPDATE webhooks SET trigger_count = trigger_count + 1, last_triggered = ? WHERE id = ?",
            (_now(), webhook_id),
        )
        await db.commit()
    return log_id


async def get_webhook_logs(webhook_id: str | None = None, limit: int = 50) -> list[dict]:
    async with get_db() as db:
        if webhook_id:
            cursor = await db.execute(
                "SELECT * FROM webhook_logs WHERE webhook_id = ? ORDER BY created_at DESC LIMIT ?",
                (webhook_id, limit),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT ?",
                (limit,),
            )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]
