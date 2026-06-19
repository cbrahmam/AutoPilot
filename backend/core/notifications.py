import json
import uuid
import asyncio
import httpx
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


async def create_notification_rule(name: str, event: str, channel: str, target: str) -> dict:
    rule_id = _id()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO notification_rules (id, name, event, channel, target, enabled, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
            (rule_id, name, event, channel, target, _now()),
        )
        await db.commit()
    return {"id": rule_id, "name": name, "event": event, "channel": channel, "target": target, "enabled": True}


async def list_notification_rules() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM notification_rules ORDER BY created_at DESC")
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def update_notification_rule(rule_id: str, **fields) -> dict | None:
    if not fields:
        return None
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [rule_id]
    async with get_db() as db:
        await db.execute(f"UPDATE notification_rules SET {set_clause} WHERE id = ?", values)
        await db.commit()
        cursor = await db.execute("SELECT * FROM notification_rules WHERE id = ?", (rule_id,))
        row = await cursor.fetchone()
    return dict(row) if row else None


async def delete_notification_rule(rule_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM notification_rules WHERE id = ?", (rule_id,))
        await db.commit()


async def send_notification(task_id: str, event: str, data: dict):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM notification_rules WHERE event = ? AND enabled = 1",
            (event,),
        )
        rules = [dict(r) for r in await cursor.fetchall()]

    for rule in rules:
        notif_id = _id()
        payload = json.dumps({"task_id": task_id, "event": event, **data})

        try:
            if rule["channel"] == "webhook":
                await _send_webhook(rule["target"], task_id, event, data)
                status = "sent"
            elif rule["channel"] == "slack":
                await _send_slack(rule["target"], task_id, event, data)
                status = "sent"
            else:
                status = "unsupported_channel"
        except Exception as e:
            status = f"failed: {str(e)[:200]}"

        async with get_db() as db:
            await db.execute(
                "INSERT INTO notifications (id, task_id, type, target, payload, status, sent_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (notif_id, task_id, rule["channel"], rule["target"], payload, status, _now() if status == "sent" else None, _now()),
            )
            await db.commit()


async def _send_webhook(url: str, task_id: str, event: str, data: dict):
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(url, json={
            "event": event,
            "task_id": task_id,
            "data": data,
            "timestamp": _now(),
        })


async def _send_slack(webhook_url: str, task_id: str, event: str, data: dict):
    status = data.get("status", event)
    output_preview = data.get("output", "")[:300]
    text = f"*AutoPilot Task {event}*\nTask: `{task_id}`\nStatus: {status}"
    if output_preview:
        text += f"\n```{output_preview}```"

    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(webhook_url, json={"text": text})


async def get_notification_history(task_id: str | None = None, limit: int = 50) -> list[dict]:
    async with get_db() as db:
        if task_id:
            cursor = await db.execute(
                "SELECT * FROM notifications WHERE task_id = ? ORDER BY created_at DESC LIMIT ?",
                (task_id, limit),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?",
                (limit,),
            )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def fire_task_event(task_id: str, event: str, data: dict):
    asyncio.create_task(send_notification(task_id, event, data))
