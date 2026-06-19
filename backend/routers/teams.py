from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from core.auth import decode_token
from core.teams import (
    create_team, list_teams, get_team, delete_team,
    add_member, remove_member, get_members, update_member_role,
    add_comment, get_comments, delete_comment,
    log_activity, get_activity,
)

router = APIRouter()


def _get_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_token(auth[7:])
        if payload:
            return payload["sub"]
    return ""


class TeamCreate(BaseModel):
    name: str
    description: str = ""


class MemberAdd(BaseModel):
    email: str
    role: str = "member"


class MemberRoleUpdate(BaseModel):
    role: str


class CommentCreate(BaseModel):
    content: str


@router.get("/teams")
async def list_all_teams(request: Request):
    user_id = _get_user_id(request)
    return await list_teams(user_id or None)


@router.post("/teams")
async def create_new_team(body: TeamCreate, request: Request):
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(401, "Authentication required to create teams")
    team = await create_team(body.name, body.description, user_id)
    await log_activity(user_id, "created_team", "team", team["id"], body.name)
    return team


@router.get("/teams/{team_id}")
async def get_team_detail(team_id: str):
    team = await get_team(team_id)
    if not team:
        raise HTTPException(404, "Team not found")
    return team


@router.delete("/teams/{team_id}")
async def delete_existing_team(team_id: str, request: Request):
    user_id = _get_user_id(request)
    team = await get_team(team_id)
    if not team:
        raise HTTPException(404, "Team not found")
    if team.get("owner_id") != user_id:
        raise HTTPException(403, "Only the team owner can delete the team")
    await delete_team(team_id)
    return {"status": "deleted"}


@router.get("/teams/{team_id}/members")
async def list_members(team_id: str):
    return await get_members(team_id)


@router.post("/teams/{team_id}/members")
async def add_team_member(team_id: str, body: MemberAdd, request: Request):
    from database import get_db
    async with get_db() as db:
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (body.email,))
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "User not found with that email")
    user_id = dict(row)["id"]
    result = await add_member(team_id, user_id, body.role)
    if "error" in result:
        raise HTTPException(409, result["error"])
    inviter_id = _get_user_id(request)
    await log_activity(inviter_id, "added_member", "team", team_id, body.email)
    return result


@router.delete("/teams/{team_id}/members/{user_id}")
async def remove_team_member(team_id: str, user_id: str, request: Request):
    await remove_member(team_id, user_id)
    remover_id = _get_user_id(request)
    await log_activity(remover_id, "removed_member", "team", team_id, user_id)
    return {"status": "removed"}


@router.put("/teams/{team_id}/members/{user_id}/role")
async def change_member_role(team_id: str, user_id: str, body: MemberRoleUpdate):
    await update_member_role(team_id, user_id, body.role)
    return {"status": "updated"}


@router.get("/tasks/{task_id}/comments")
async def list_task_comments(task_id: str):
    return await get_comments(task_id)


@router.post("/tasks/{task_id}/comments")
async def create_task_comment(task_id: str, body: CommentCreate, request: Request):
    user_id = _get_user_id(request)
    comment = await add_comment(task_id, user_id or "anonymous", body.content)
    if user_id:
        await log_activity(user_id, "commented", "task", task_id, body.content[:100])
    return comment


@router.delete("/comments/{comment_id}")
async def remove_comment(comment_id: str):
    await delete_comment(comment_id)
    return {"status": "deleted"}


@router.get("/activity")
async def list_activity(team_id: str | None = None):
    return await get_activity(team_id)
