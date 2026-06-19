import json
import uuid
from datetime import datetime, timezone

from database import get_db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


async def create_team(name: str, description: str, owner_id: str) -> dict:
    team_id = _id()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO teams (id, name, description, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (team_id, name, description, owner_id, _now()),
        )
        await db.execute(
            "INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, 'admin', ?)",
            (_id(), team_id, owner_id, _now()),
        )
        await db.commit()
    return {"id": team_id, "name": name, "description": description, "owner_id": owner_id}


async def list_teams(user_id: str | None = None) -> list[dict]:
    async with get_db() as db:
        if user_id:
            cursor = await db.execute(
                "SELECT t.* FROM teams t JOIN team_members tm ON t.id = tm.team_id WHERE tm.user_id = ? ORDER BY t.created_at DESC",
                (user_id,),
            )
        else:
            cursor = await db.execute("SELECT * FROM teams ORDER BY created_at DESC")
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_team(team_id: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM teams WHERE id = ?", (team_id,))
        row = await cursor.fetchone()
    return dict(row) if row else None


async def delete_team(team_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM team_members WHERE team_id = ?", (team_id,))
        await db.execute("DELETE FROM teams WHERE id = ?", (team_id,))
        await db.commit()


async def add_member(team_id: str, user_id: str, role: str = "member") -> dict:
    member_id = _id()
    async with get_db() as db:
        existing = await db.execute(
            "SELECT id FROM team_members WHERE team_id = ? AND user_id = ?",
            (team_id, user_id),
        )
        if await existing.fetchone():
            return {"error": "Already a member"}
        await db.execute(
            "INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)",
            (member_id, team_id, user_id, role, _now()),
        )
        await db.commit()
    return {"id": member_id, "team_id": team_id, "user_id": user_id, "role": role}


async def remove_member(team_id: str, user_id: str):
    async with get_db() as db:
        await db.execute(
            "DELETE FROM team_members WHERE team_id = ? AND user_id = ?",
            (team_id, user_id),
        )
        await db.commit()


async def get_members(team_id: str) -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT tm.*, u.email, u.display_name FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE tm.team_id = ?",
            (team_id,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def update_member_role(team_id: str, user_id: str, role: str):
    async with get_db() as db:
        await db.execute(
            "UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?",
            (role, team_id, user_id),
        )
        await db.commit()


async def add_comment(task_id: str, user_id: str, content: str) -> dict:
    comment_id = _id()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO task_comments (id, task_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)",
            (comment_id, task_id, user_id, content, _now()),
        )
        await db.commit()
    return {"id": comment_id, "task_id": task_id, "user_id": user_id, "content": content, "created_at": _now()}


async def get_comments(task_id: str) -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT c.*, u.display_name, u.email FROM task_comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.task_id = ? ORDER BY c.created_at",
            (task_id,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def delete_comment(comment_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM task_comments WHERE id = ?", (comment_id,))
        await db.commit()


async def log_activity(user_id: str, action: str, target_type: str, target_id: str, details: str = "", team_id: str = ""):
    async with get_db() as db:
        await db.execute(
            "INSERT INTO activity_feed (id, user_id, team_id, action, target_type, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (_id(), user_id, team_id, action, target_type, target_id, details, _now()),
        )
        await db.commit()


async def get_activity(team_id: str | None = None, limit: int = 50) -> list[dict]:
    async with get_db() as db:
        if team_id:
            cursor = await db.execute(
                "SELECT af.*, u.display_name, u.email FROM activity_feed af LEFT JOIN users u ON af.user_id = u.id WHERE af.team_id = ? ORDER BY af.created_at DESC LIMIT ?",
                (team_id, limit),
            )
        else:
            cursor = await db.execute(
                "SELECT af.*, u.display_name, u.email FROM activity_feed af LEFT JOIN users u ON af.user_id = u.id ORDER BY af.created_at DESC LIMIT ?",
                (limit,),
            )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]
