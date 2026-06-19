from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from core.auth import decode_token
from core.approvals import (
    create_approval_rule, list_approval_rules, update_approval_rule, delete_approval_rule,
    request_approval, decide_approval, get_pending_approvals, get_task_approvals,
)

router = APIRouter()


def _get_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_token(auth[7:])
        if payload:
            return payload["sub"]
    return ""


class RuleCreate(BaseModel):
    name: str
    condition: str
    approvers: list[str]
    auto_approve_after: int = 0


class RuleUpdate(BaseModel):
    name: str | None = None
    condition: str | None = None
    approvers: list[str] | None = None
    auto_approve_after: int | None = None
    enabled: bool | None = None


class ApprovalRequest(BaseModel):
    task_id: str
    assigned_to: str = ""


class ApprovalDecision(BaseModel):
    status: str
    comment: str = ""


@router.get("/approvals/rules")
async def list_rules():
    return await list_approval_rules()


@router.post("/approvals/rules")
async def create_rule(body: RuleCreate):
    return await create_approval_rule(body.name, body.condition, body.approvers, body.auto_approve_after)


@router.put("/approvals/rules/{rule_id}")
async def update_rule(rule_id: str, body: RuleUpdate):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    result = await update_approval_rule(rule_id, **fields)
    if not result:
        raise HTTPException(404, "Rule not found")
    return result


@router.delete("/approvals/rules/{rule_id}")
async def delete_rule(rule_id: str):
    await delete_approval_rule(rule_id)
    return {"status": "deleted"}


@router.get("/approvals/pending")
async def list_pending(request: Request):
    user_id = _get_user_id(request)
    return await get_pending_approvals(user_id or None)


@router.post("/approvals/request")
async def create_approval(body: ApprovalRequest, request: Request):
    user_id = _get_user_id(request)
    return await request_approval(body.task_id, user_id or "system", body.assigned_to)


@router.post("/approvals/{approval_id}/decide")
async def decide(approval_id: str, body: ApprovalDecision):
    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "Status must be 'approved' or 'rejected'")
    result = await decide_approval(approval_id, body.status, body.comment)
    if not result:
        raise HTTPException(404, "Approval not found")
    return result


@router.get("/tasks/{task_id}/approvals")
async def task_approvals(task_id: str):
    return await get_task_approvals(task_id)
