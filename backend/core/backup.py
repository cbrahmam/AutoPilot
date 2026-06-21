import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from database import get_db
from config import settings


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


BACKUP_DIR = Path(settings.workspaces_dir).parent / "backups"

ALL_TABLES = [
    "tasks", "agent_logs", "agent_memory", "schedules", "chat_sessions", "chat_messages",
    "users", "webhooks", "webhook_logs", "notifications", "notification_rules",
    "kb_documents", "kb_chunks", "pipelines", "pipeline_runs", "teams", "team_members",
    "task_comments", "activity_feed", "api_keys", "audit_log", "task_approvals",
    "approval_rules", "shared_reports", "inbox_notifications", "agent_profiles",
    "favorites", "health_checks", "tags", "task_tags", "env_variables", "timeline_events",
    "backups", "user_preferences",
]


async def create_backup(created_by: str = "") -> dict:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    bid = _id()
    now = _now()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"autopilot_backup_{timestamp}.json"
    filepath = BACKUP_DIR / filename

    data = {}
    row_counts = {}

    async with get_db() as db:
        for table in ALL_TABLES:
            try:
                cursor = await db.execute(f"SELECT * FROM {table}")
                rows = await cursor.fetchall()
                data[table] = [dict(r) for r in rows]
                row_counts[table] = len(data[table])
            except Exception:
                data[table] = []
                row_counts[table] = 0

    backup_content = {
        "version": "0.6.0",
        "created_at": now,
        "tables": data,
    }

    with open(filepath, "w") as f:
        json.dump(backup_content, f, indent=2, default=str)

    size = os.path.getsize(filepath)

    async with get_db() as db:
        await db.execute(
            "INSERT INTO backups (id, filename, size_bytes, tables_included, row_counts, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (bid, filename, size, json.dumps(ALL_TABLES), json.dumps(row_counts), created_by, now),
        )
        await db.commit()

    return {
        "id": bid,
        "filename": filename,
        "size_bytes": size,
        "size_mb": round(size / (1024 * 1024), 2),
        "row_counts": row_counts,
        "tables": len(ALL_TABLES),
        "created_at": now,
    }


async def list_backups() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM backups ORDER BY created_at DESC")
        rows = await cursor.fetchall()
    result = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("row_counts"), str):
            try:
                d["row_counts"] = json.loads(d["row_counts"])
            except (json.JSONDecodeError, TypeError):
                d["row_counts"] = {}
        if isinstance(d.get("tables_included"), str):
            try:
                d["tables_included"] = json.loads(d["tables_included"])
            except (json.JSONDecodeError, TypeError):
                d["tables_included"] = []
        d["size_mb"] = round(d.get("size_bytes", 0) / (1024 * 1024), 2)
        result.append(d)
    return result


async def get_backup_path(backup_id: str) -> Path | None:
    async with get_db() as db:
        cursor = await db.execute("SELECT filename FROM backups WHERE id = ?", (backup_id,))
        row = await cursor.fetchone()
    if not row:
        return None
    path = BACKUP_DIR / dict(row)["filename"]
    return path if path.exists() else None


async def delete_backup(backup_id: str):
    path = await get_backup_path(backup_id)
    if path and path.exists():
        os.remove(path)
    async with get_db() as db:
        await db.execute("DELETE FROM backups WHERE id = ?", (backup_id,))
        await db.commit()


async def restore_backup(backup_id: str) -> dict:
    path = await get_backup_path(backup_id)
    if not path:
        return {"status": "error", "message": "Backup file not found"}

    with open(path, "r") as f:
        backup_data = json.load(f)

    tables = backup_data.get("tables", {})
    restored = {}

    async with get_db() as db:
        for table, rows in tables.items():
            if table not in ALL_TABLES or not rows:
                continue
            try:
                await db.execute(f"DELETE FROM {table}")
                for row in rows:
                    cols = ", ".join(row.keys())
                    placeholders = ", ".join("?" * len(row))
                    await db.execute(f"INSERT INTO {table} ({cols}) VALUES ({placeholders})", list(row.values()))
                restored[table] = len(rows)
            except Exception as e:
                restored[table] = f"error: {str(e)[:100]}"
        await db.commit()

    return {"status": "restored", "tables": restored}
