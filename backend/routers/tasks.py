import asyncio
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from config import settings
from database import get_db
from models.schemas import TaskCreate, TaskResponse
from models.db_models import create_task, get_task, list_tasks, update_task
from core.agent import Agent
from core.tool_registry import create_default_registry
from tools.ask_human import resolve_human_request

router = APIRouter()

_ws_connections: dict[str, set[WebSocket]] = {}
_running_tasks: dict[str, asyncio.Task] = {}
_active_agents: dict[str, Agent] = {}


@router.post("/tasks", response_model=TaskResponse)
async def create_new_task(body: TaskCreate):
    task_id = uuid.uuid4().hex
    workspace_path = str(settings.workspaces_dir / task_id)
    Path(workspace_path).mkdir(parents=True, exist_ok=True)

    async with get_db() as db:
        await create_task(db, body.goal, body.require_approval, body.max_iterations, workspace_path, task_id=task_id)
        task = await get_task(db, task_id)
        return TaskResponse(**task)


@router.get("/tasks", response_model=list[TaskResponse])
async def list_all_tasks():
    async with get_db() as db:
        tasks_list = await list_tasks(db)
        return [TaskResponse(**t) for t in tasks_list]


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task_detail(task_id: str):
    async with get_db() as db:
        task = await get_task(db, task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        return TaskResponse(**task)


@router.post("/tasks/{task_id}/run")
async def run_task(task_id: str):
    async with get_db() as db:
        task = await get_task(db, task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        if task["status"] == "running":
            raise HTTPException(409, "Task is already running")

    bg_task = asyncio.create_task(_execute_task(task_id))
    _running_tasks[task_id] = bg_task

    return {"status": "started", "task_id": task_id}


@router.post("/tasks/{task_id}/pause")
async def pause_task(task_id: str):
    agent = _active_agents.get(task_id)
    if not agent:
        raise HTTPException(404, "No running agent for this task")
    agent.pause()
    async with get_db() as db:
        await update_task(db, task_id, status="paused")
    return {"status": "paused"}


@router.post("/tasks/{task_id}/resume")
async def resume_task(task_id: str):
    agent = _active_agents.get(task_id)
    if not agent:
        raise HTTPException(404, "No running agent for this task")
    agent.resume()
    async with get_db() as db:
        await update_task(db, task_id, status="running")
    return {"status": "resumed"}


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    agent = _active_agents.get(task_id)
    if agent:
        agent.cancel()
    bg = _running_tasks.get(task_id)
    if bg:
        bg.cancel()
    async with get_db() as db:
        await update_task(db, task_id, status="failed", result="Cancelled by user")
    return {"status": "cancelled"}


@router.websocket("/ws/tasks/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await websocket.accept()

    if task_id not in _ws_connections:
        _ws_connections[task_id] = set()
    _ws_connections[task_id].add(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "human_response":
                resolve_human_request(
                    data["request_id"],
                    data.get("approved", True),
                    data.get("response", ""),
                )
    except WebSocketDisconnect:
        _ws_connections.get(task_id, set()).discard(websocket)


async def _broadcast(task_id: str, event: dict):
    connections = _ws_connections.get(task_id, set())
    dead = set()
    for ws in connections:
        try:
            await ws.send_json(event)
        except Exception:
            dead.add(ws)
    connections -= dead


async def _execute_task(task_id: str):
    async with get_db() as db:
        task = await get_task(db, task_id)

    if not task:
        return

    workspace_path = task["workspace_path"]

    async def emit(event: dict):
        event.setdefault("task_id", task_id)
        await _broadcast(task_id, event)

    registry = create_default_registry(emit_callback=emit)

    agent = Agent(
        name="general",
        role="general",
        tool_registry=registry,
        task_id=task_id,
        max_iterations=task.get("max_iterations") or settings.max_iterations_per_agent,
        require_approval=bool(task.get("require_approval")),
        emit=emit,
    )
    _active_agents[task_id] = agent

    async with get_db() as db:
        await update_task(db, task_id, status="running")

    try:
        result = await agent.run(task["goal"], workspace_path=workspace_path)

        async with get_db() as db:
            await update_task(
                db,
                task_id,
                status="completed" if result.success else "failed",
                result=result.output,
                completed_at=datetime.now(timezone.utc).isoformat(),
                total_iterations=result.iterations_used,
                total_tokens=result.tokens_used,
                total_tool_calls=result.tool_calls_made,
            )

        await emit({
            "type": "complete",
            "agent_name": "general",
            "task_id": task_id,
            "data": {"success": result.success, "output": result.output[:2000]},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    except Exception as e:
        async with get_db() as db:
            await update_task(db, task_id, status="failed", result=str(e))
        await emit({
            "type": "error",
            "agent_name": "general",
            "task_id": task_id,
            "data": {"error": str(e)},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    finally:
        _running_tasks.pop(task_id, None)
        _active_agents.pop(task_id, None)
