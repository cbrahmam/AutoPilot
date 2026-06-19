import asyncio
import json
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from config import settings
from database import get_db
from models.db_models import create_task
from core.webhooks import (
    create_webhook, list_webhooks, get_webhook, update_webhook, delete_webhook,
    verify_signature, render_goal, log_webhook_trigger, get_webhook_logs,
)
from core.notifications import (
    create_notification_rule, list_notification_rules, update_notification_rule,
    delete_notification_rule, get_notification_history,
)

router = APIRouter()


class WebhookCreate(BaseModel):
    name: str
    source: str
    goal_template: str
    secret: str = ""


class WebhookUpdate(BaseModel):
    name: str | None = None
    source: str | None = None
    goal_template: str | None = None
    secret: str | None = None
    enabled: bool | None = None


class NotificationRuleCreate(BaseModel):
    name: str
    event: str
    channel: str
    target: str


class NotificationRuleUpdate(BaseModel):
    name: str | None = None
    event: str | None = None
    channel: str | None = None
    target: str | None = None
    enabled: bool | None = None


@router.get("/webhooks")
async def list_all_webhooks():
    return await list_webhooks()


@router.post("/webhooks")
async def create_new_webhook(body: WebhookCreate):
    return await create_webhook(body.name, body.source, body.goal_template, body.secret)


@router.put("/webhooks/{webhook_id}")
async def update_existing_webhook(webhook_id: str, body: WebhookUpdate):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if "enabled" in fields:
        fields["enabled"] = int(fields["enabled"])
    result = await update_webhook(webhook_id, **fields)
    if not result:
        raise HTTPException(404, "Webhook not found")
    return result


@router.delete("/webhooks/{webhook_id}")
async def delete_existing_webhook(webhook_id: str):
    await delete_webhook(webhook_id)
    return {"status": "deleted"}


@router.get("/webhooks/{webhook_id}/logs")
async def get_logs_for_webhook(webhook_id: str):
    return await get_webhook_logs(webhook_id)


@router.post("/webhooks/incoming/{webhook_id}")
async def receive_webhook(webhook_id: str, request: Request):
    webhook = await get_webhook(webhook_id)
    if not webhook or not webhook.get("enabled"):
        raise HTTPException(404, "Webhook not found or disabled")

    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", request.headers.get("X-Signature", ""))

    if webhook.get("secret") and not verify_signature(body, signature, webhook["secret"]):
        raise HTTPException(401, "Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        payload = {"raw": body.decode(errors="replace")}

    goal = render_goal(webhook["goal_template"], payload)

    task_id = uuid.uuid4().hex
    workspace_path = str(settings.workspaces_dir / task_id)
    Path(workspace_path).mkdir(parents=True, exist_ok=True)

    async with get_db() as db:
        await create_task(db, goal, False, 25, workspace_path, task_id=task_id)

    await log_webhook_trigger(webhook_id, webhook["source"], payload, task_id)

    from routers.tasks import _execute_with_plan, _running_tasks
    bg_task = asyncio.create_task(_execute_with_plan(task_id))
    _running_tasks[task_id] = bg_task

    return {"status": "triggered", "task_id": task_id, "goal": goal}


@router.get("/webhooks/logs/all")
async def get_all_webhook_logs():
    return await get_webhook_logs()


@router.get("/notifications/rules")
async def list_rules():
    return await list_notification_rules()


@router.post("/notifications/rules")
async def create_rule(body: NotificationRuleCreate):
    return await create_notification_rule(body.name, body.event, body.channel, body.target)


@router.put("/notifications/rules/{rule_id}")
async def update_rule(rule_id: str, body: NotificationRuleUpdate):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if "enabled" in fields:
        fields["enabled"] = int(fields["enabled"])
    result = await update_notification_rule(rule_id, **fields)
    if not result:
        raise HTTPException(404, "Notification rule not found")
    return result


@router.delete("/notifications/rules/{rule_id}")
async def delete_rule(rule_id: str):
    await delete_notification_rule(rule_id)
    return {"status": "deleted"}


@router.get("/notifications/history")
async def get_history(task_id: str | None = None):
    return await get_notification_history(task_id)
