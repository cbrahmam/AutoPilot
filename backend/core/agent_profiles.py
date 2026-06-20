import json
import uuid
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


async def create_profile(name: str, description: str = "", system_prompt: str = "", model: str = "claude-sonnet-4-20250514", tools: list[str] | None = None, max_iterations: int = 25, temperature: float = 0.7, created_by: str = "") -> dict:
    pid = _id()
    now = _now()
    tools_json = json.dumps(tools or [])
    async with get_db() as db:
        await db.execute(
            "INSERT INTO agent_profiles (id, name, description, system_prompt, model, tools, max_iterations, temperature, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (pid, name, description, system_prompt, model, tools_json, max_iterations, temperature, created_by, now),
        )
        await db.commit()
        cursor = await db.execute("SELECT * FROM agent_profiles WHERE id = ?", (pid,))
        row = await cursor.fetchone()
    return _format(dict(row))


async def list_profiles() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM agent_profiles ORDER BY created_at DESC")
        rows = await cursor.fetchall()
    return [_format(dict(r)) for r in rows]


async def get_profile(profile_id: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM agent_profiles WHERE id = ?", (profile_id,))
        row = await cursor.fetchone()
    return _format(dict(row)) if row else None


async def update_profile(profile_id: str, **fields) -> dict | None:
    if "tools" in fields and isinstance(fields["tools"], list):
        fields["tools"] = json.dumps(fields["tools"])
    sets = ", ".join(f"{k} = ?" for k in fields)
    vals = list(fields.values()) + [profile_id]
    async with get_db() as db:
        await db.execute(f"UPDATE agent_profiles SET {sets} WHERE id = ?", vals)
        await db.commit()
        cursor = await db.execute("SELECT * FROM agent_profiles WHERE id = ?", (profile_id,))
        row = await cursor.fetchone()
    return _format(dict(row)) if row else None


async def delete_profile(profile_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM agent_profiles WHERE id = ?", (profile_id,))
        await db.commit()


async def duplicate_profile(profile_id: str) -> dict | None:
    profile = await get_profile(profile_id)
    if not profile:
        return None
    return await create_profile(
        name=f"{profile['name']} (Copy)",
        description=profile.get("description", ""),
        system_prompt=profile.get("system_prompt", ""),
        model=profile.get("model", "claude-sonnet-4-20250514"),
        tools=profile.get("tools", []),
        max_iterations=profile.get("max_iterations", 25),
        temperature=profile.get("temperature", 0.7),
        created_by=profile.get("created_by", ""),
    )


def _format(row: dict) -> dict:
    if isinstance(row.get("tools"), str):
        try:
            row["tools"] = json.loads(row["tools"])
        except (json.JSONDecodeError, TypeError):
            row["tools"] = []
    return row
