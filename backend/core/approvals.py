import json
import uuid
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


async def create_approval_rule(name: str, condition: str, approvers: list[str], auto_approve_after: int = 0) -> dict:
    rule_id = _id()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO approval_rules (id, name, condition, approvers, auto_approve_after, enabled, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
            (rule_id, name, condition, json.dumps(approvers), auto_approve_after, _now()),
        )
        await db.commit()
    return {"id": rule_id, "name": name, "condition": condition, "approvers": approvers, "auto_approve_after": auto_approve_after, "enabled": True}


async def list_approval_rules() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM approval_rules ORDER BY created_at DESC")
        rows = await cursor.fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["approvers"] = json.loads(d["approvers"]) if d.get("approvers") else []
        result.append(d)
    return result


async def update_approval_rule(rule_id: str, **fields) -> dict | None:
    if "approvers" in fields and isinstance(fields["approvers"], list):
        fields["approvers"] = json.dumps(fields["approvers"])
    if "enabled" in fields:
        fields["enabled"] = int(fields["enabled"])
    if not fields:
        return None
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [rule_id]
    async with get_db() as db:
        await db.execute(f"UPDATE approval_rules SET {set_clause} WHERE id = ?", values)
        await db.commit()
        cursor = await db.execute("SELECT * FROM approval_rules WHERE id = ?", (rule_id,))
        row = await cursor.fetchone()
    if not row:
        return None
    d = dict(row)
    d["approvers"] = json.loads(d["approvers"]) if d.get("approvers") else []
    return d


async def delete_approval_rule(rule_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM approval_rules WHERE id = ?", (rule_id,))
        await db.commit()


async def request_approval(task_id: str, requested_by: str, assigned_to: str = "") -> dict:
    approval_id = _id()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO task_approvals (id, task_id, requested_by, assigned_to, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
            (approval_id, task_id, requested_by, assigned_to, _now()),
        )
        await db.commit()
    return {"id": approval_id, "task_id": task_id, "status": "pending", "assigned_to": assigned_to}


async def decide_approval(approval_id: str, status: str, comment: str = "") -> dict | None:
    async with get_db() as db:
        await db.execute(
            "UPDATE task_approvals SET status = ?, comment = ?, decided_at = ? WHERE id = ?",
            (status, comment, _now(), approval_id),
        )
        await db.commit()
        cursor = await db.execute("SELECT * FROM task_approvals WHERE id = ?", (approval_id,))
        row = await cursor.fetchone()
    return dict(row) if row else None


async def get_pending_approvals(assigned_to: str | None = None) -> list[dict]:
    async with get_db() as db:
        if assigned_to:
            cursor = await db.execute(
                "SELECT a.*, t.goal FROM task_approvals a LEFT JOIN tasks t ON a.task_id = t.id WHERE a.status = 'pending' AND a.assigned_to = ? ORDER BY a.created_at DESC",
                (assigned_to,),
            )
        else:
            cursor = await db.execute(
                "SELECT a.*, t.goal FROM task_approvals a LEFT JOIN tasks t ON a.task_id = t.id WHERE a.status = 'pending' ORDER BY a.created_at DESC"
            )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_task_approvals(task_id: str) -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM task_approvals WHERE task_id = ? ORDER BY created_at DESC",
            (task_id,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def check_approval_rules(task_goal: str) -> list[dict]:
    rules = await list_approval_rules()
    matching = []
    for rule in rules:
        if not rule.get("enabled"):
            continue
        condition = rule.get("condition", "")
        if condition == "all" or condition in task_goal.lower():
            matching.append(rule)
    return matching
