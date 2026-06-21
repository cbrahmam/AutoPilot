import uuid
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


def mask_value(value: str) -> str:
    if len(value) <= 4:
        return "****"
    return value[:2] + "*" * (len(value) - 4) + value[-2:]


async def create_var(name: str, value: str, scope: str = "global", scope_id: str = "", encrypted: bool = False, created_by: str = "") -> dict:
    vid = _id()
    now = _now()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO env_variables (id, name, value, scope, scope_id, encrypted, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (vid, name, value, scope, scope_id, 1 if encrypted else 0, created_by, now),
        )
        await db.commit()
    return {"id": vid, "name": name, "value": mask_value(value) if encrypted else value, "scope": scope, "scope_id": scope_id, "encrypted": encrypted, "created_at": now}


async def list_vars(scope: str = "", scope_id: str = "") -> list[dict]:
    conditions = []
    params = []
    if scope:
        conditions.append("scope = ?")
        params.append(scope)
    if scope_id:
        conditions.append("scope_id = ?")
        params.append(scope_id)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    async with get_db() as db:
        cursor = await db.execute(
            f"SELECT * FROM env_variables {where} ORDER BY name ASC", params
        )
        rows = await cursor.fetchall()
    result = []
    for r in rows:
        d = dict(r)
        if d.get("encrypted"):
            d["value"] = mask_value(d["value"])
        result.append(d)
    return result


async def get_var(var_id: str, reveal: bool = False) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM env_variables WHERE id = ?", (var_id,))
        row = await cursor.fetchone()
    if not row:
        return None
    d = dict(row)
    if d.get("encrypted") and not reveal:
        d["value"] = mask_value(d["value"])
    return d


async def update_var(var_id: str, **fields) -> dict | None:
    sets = ", ".join(f"{k} = ?" for k in fields)
    vals = list(fields.values()) + [var_id]
    async with get_db() as db:
        await db.execute(f"UPDATE env_variables SET {sets} WHERE id = ?", vals)
        await db.commit()
        cursor = await db.execute("SELECT * FROM env_variables WHERE id = ?", (var_id,))
        row = await cursor.fetchone()
    if not row:
        return None
    d = dict(row)
    if d.get("encrypted"):
        d["value"] = mask_value(d["value"])
    return d


async def delete_var(var_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM env_variables WHERE id = ?", (var_id,))
        await db.commit()


async def get_env_for_task(task_id: str = "") -> dict:
    env = {}
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT name, value FROM env_variables WHERE scope = 'global' ORDER BY name"
        )
        for row in await cursor.fetchall():
            r = dict(row)
            env[r["name"]] = r["value"]

        if task_id:
            cursor = await db.execute(
                "SELECT name, value FROM env_variables WHERE scope = 'task' AND scope_id = ? ORDER BY name",
                (task_id,),
            )
            for row in await cursor.fetchall():
                r = dict(row)
                env[r["name"]] = r["value"]
    return env
