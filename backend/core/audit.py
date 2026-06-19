import uuid
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


async def log_audit(user_id: str, user_email: str, action: str, target_type: str = "", target_id: str = "", details: str = "", ip_address: str = ""):
    async with get_db() as db:
        await db.execute(
            "INSERT INTO audit_log (id, user_id, user_email, action, target_type, target_id, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (_id(), user_id, user_email, action, target_type, target_id, details, ip_address, _now()),
        )
        await db.commit()


async def get_audit_logs(
    user_id: str | None = None,
    action: str | None = None,
    target_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    conditions = []
    params = []

    if user_id:
        conditions.append("user_id = ?")
        params.append(user_id)
    if action:
        conditions.append("action = ?")
        params.append(action)
    if target_type:
        conditions.append("target_type = ?")
        params.append(target_type)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.extend([limit, offset])

    async with get_db() as db:
        cursor = await db.execute(
            f"SELECT * FROM audit_log {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            params,
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_audit_stats() -> dict:
    async with get_db() as db:
        total_row = await db.execute_fetchall("SELECT COUNT(*) as total FROM audit_log")
        total = dict(total_row[0])["total"] if total_row else 0

        actions_row = await db.execute_fetchall(
            "SELECT action, COUNT(*) as count FROM audit_log GROUP BY action ORDER BY count DESC LIMIT 10"
        )
        top_actions = [dict(r) for r in actions_row]

        users_row = await db.execute_fetchall(
            "SELECT user_email, COUNT(*) as count FROM audit_log WHERE user_email != '' GROUP BY user_email ORDER BY count DESC LIMIT 10"
        )
        top_users = [dict(r) for r in users_row]

        recent_row = await db.execute_fetchall(
            "SELECT date(created_at) as day, COUNT(*) as count FROM audit_log WHERE created_at IS NOT NULL GROUP BY date(created_at) ORDER BY day DESC LIMIT 7"
        )
        daily = [dict(r) for r in recent_row][::-1]

    return {"total": total, "top_actions": top_actions, "top_users": top_users, "daily": daily}


async def export_audit_csv(
    user_id: str | None = None,
    action: str | None = None,
    limit: int = 1000,
) -> str:
    import csv
    import io

    logs = await get_audit_logs(user_id=user_id, action=action, limit=limit)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Timestamp", "User Email", "Action", "Target Type", "Target ID", "Details", "IP Address"])
    for log in logs:
        writer.writerow([
            log.get("created_at", ""),
            log.get("user_email", ""),
            log.get("action", ""),
            log.get("target_type", ""),
            log.get("target_id", ""),
            log.get("details", ""),
            log.get("ip_address", ""),
        ])
    return output.getvalue()
