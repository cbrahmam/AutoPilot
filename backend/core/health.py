import uuid
import time
import os
import sys
import platform
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


async def check_database() -> dict:
    start = time.monotonic()
    try:
        async with get_db() as db:
            await db.execute("SELECT 1")
        elapsed = int((time.monotonic() - start) * 1000)
        return {"service": "database", "status": "healthy", "response_time_ms": elapsed, "details": "SQLite WAL mode"}
    except Exception as e:
        elapsed = int((time.monotonic() - start) * 1000)
        return {"service": "database", "status": "unhealthy", "response_time_ms": elapsed, "details": str(e)}


async def check_anthropic_api() -> dict:
    start = time.monotonic()
    try:
        from config import settings
        key = settings.anthropic_api_key
        if not key:
            return {"service": "anthropic_api", "status": "unconfigured", "response_time_ms": 0, "details": "No API key set"}
        return {"service": "anthropic_api", "status": "configured", "response_time_ms": 0, "details": "API key present"}
    except Exception as e:
        elapsed = int((time.monotonic() - start) * 1000)
        return {"service": "anthropic_api", "status": "error", "response_time_ms": elapsed, "details": str(e)}


async def check_disk_space() -> dict:
    try:
        stat = os.statvfs(".")
        total = stat.f_blocks * stat.f_frsize
        free = stat.f_bavail * stat.f_frsize
        used_pct = round((1 - free / total) * 100, 1)
        status = "healthy" if used_pct < 90 else ("warning" if used_pct < 95 else "critical")
        return {
            "service": "disk",
            "status": status,
            "response_time_ms": 0,
            "details": f"{used_pct}% used, {free // (1024**3)}GB free",
        }
    except Exception as e:
        return {"service": "disk", "status": "error", "response_time_ms": 0, "details": str(e)}


async def check_memory() -> dict:
    try:
        import resource
        usage = resource.getrusage(resource.RUSAGE_SELF)
        mem_mb = round(usage.ru_maxrss / (1024 * 1024), 1) if sys.platform == "linux" else round(usage.ru_maxrss / (1024 * 1024), 1)
        return {
            "service": "memory",
            "status": "healthy" if mem_mb < 500 else "warning",
            "response_time_ms": 0,
            "details": f"Peak RSS: {mem_mb}MB",
        }
    except Exception as e:
        return {"service": "memory", "status": "unknown", "response_time_ms": 0, "details": str(e)}


async def get_system_info() -> dict:
    return {
        "python_version": sys.version.split()[0],
        "platform": platform.platform(),
        "architecture": platform.machine(),
        "pid": os.getpid(),
        "cwd": os.getcwd(),
    }


async def get_database_stats() -> dict:
    async with get_db() as db:
        tables = {}
        for table in ["tasks", "agent_logs", "agent_memory", "schedules", "chat_sessions", "users",
                       "webhooks", "kb_documents", "pipelines", "teams", "api_keys", "audit_log",
                       "inbox_notifications", "agent_profiles", "favorites"]:
            try:
                cursor = await db.execute(f"SELECT COUNT(*) as count FROM {table}")
                row = await cursor.fetchone()
                tables[table] = dict(row)["count"]
            except Exception:
                tables[table] = -1

        db_path = str(db._connection.cursor().connection)
        try:
            from config import settings
            db_size = os.path.getsize(str(settings.database_path))
            db_size_mb = round(db_size / (1024 * 1024), 2)
        except Exception:
            db_size_mb = 0

    return {"tables": tables, "database_size_mb": db_size_mb}


async def run_all_checks() -> dict:
    checks = []
    for check_fn in [check_database, check_anthropic_api, check_disk_space, check_memory]:
        result = await check_fn()
        result["checked_at"] = _now()
        checks.append(result)
        await _save_check(result)

    overall = "healthy"
    for c in checks:
        if c["status"] in ("unhealthy", "critical", "error"):
            overall = "unhealthy"
            break
        if c["status"] == "warning":
            overall = "degraded"

    system_info = await get_system_info()
    db_stats = await get_database_stats()

    return {
        "overall": overall,
        "checks": checks,
        "system": system_info,
        "database": db_stats,
        "checked_at": _now(),
    }


async def _save_check(check: dict):
    async with get_db() as db:
        await db.execute(
            "INSERT INTO health_checks (id, service, status, response_time_ms, details, checked_at) VALUES (?, ?, ?, ?, ?, ?)",
            (_id(), check["service"], check["status"], check.get("response_time_ms", 0), check.get("details", ""), check.get("checked_at", _now())),
        )
        await db.commit()


async def get_health_history(service: str = "", limit: int = 50) -> list[dict]:
    condition = "WHERE service = ?" if service else ""
    params = [service, limit] if service else [limit]
    async with get_db() as db:
        cursor = await db.execute(
            f"SELECT * FROM health_checks {condition} ORDER BY checked_at DESC LIMIT ?", params
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_uptime_stats() -> dict:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT service, status, COUNT(*) as count FROM health_checks GROUP BY service, status ORDER BY service"
        )
        rows = await cursor.fetchall()

    services = {}
    for r in rows:
        row = dict(r)
        svc = row["service"]
        if svc not in services:
            services[svc] = {"total": 0, "healthy": 0}
        services[svc]["total"] += row["count"]
        if row["status"] in ("healthy", "configured"):
            services[svc]["healthy"] += row["count"]

    for svc in services:
        total = services[svc]["total"]
        healthy = services[svc]["healthy"]
        services[svc]["uptime_pct"] = round((healthy / total * 100), 1) if total > 0 else 100

    return services
