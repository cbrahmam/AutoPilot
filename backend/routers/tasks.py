import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from config import settings
from database import get_db
from models.schemas import TaskCreate, TaskResponse, TaskPlan, PlanUpdate
from models.db_models import create_task, get_task, list_tasks, update_task
from core.agent import Agent
from core.planner import decompose_task
from core.executor import PlanExecutor
from core.tool_registry import create_default_registry
from core.notifications import fire_task_event
from tools.ask_human import resolve_human_request

router = APIRouter()

_ws_connections: dict[str, set[WebSocket]] = {}
_running_tasks: dict[str, asyncio.Task] = {}
_active_executors: dict[str, PlanExecutor] = {}
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


@router.post("/tasks/{task_id}/plan")
async def plan_task(task_id: str):
    async with get_db() as db:
        task = await get_task(db, task_id)
        if not task:
            raise HTTPException(404, "Task not found")

    await _update_status(task_id, "planning")

    try:
        plan = await decompose_task(task["goal"])
        plan_json = plan.model_dump_json()
        async with get_db() as db:
            await update_task(db, task_id, plan=plan_json, status="pending")
        return plan.model_dump()
    except Exception as e:
        await _update_status(task_id, "failed")
        raise HTTPException(500, f"Planning failed: {e}")


@router.get("/tasks/{task_id}/plan")
async def get_plan(task_id: str):
    async with get_db() as db:
        task = await get_task(db, task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        if not task.get("plan"):
            raise HTTPException(404, "No plan generated yet")
    return json.loads(task["plan"])


@router.put("/tasks/{task_id}/plan")
async def update_plan(task_id: str, body: PlanUpdate):
    async with get_db() as db:
        task = await get_task(db, task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        if not task.get("plan"):
            raise HTTPException(404, "No plan to update")
        if task["status"] == "running":
            raise HTTPException(409, "Cannot edit plan while running")

    current_plan = TaskPlan(**json.loads(task["plan"]))

    if body.subtasks is not None:
        current_plan.subtasks = body.subtasks
    if body.execution_order is not None:
        current_plan.execution_order = body.execution_order

    async with get_db() as db:
        await update_task(db, task_id, plan=current_plan.model_dump_json())

    return current_plan.model_dump()


@router.post("/tasks/{task_id}/execute")
async def execute_task(task_id: str):
    async with get_db() as db:
        task = await get_task(db, task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        if task["status"] == "running":
            raise HTTPException(409, "Task is already running")

    bg_task = asyncio.create_task(_execute_with_plan(task_id))
    _running_tasks[task_id] = bg_task

    return {"status": "started", "task_id": task_id}


@router.post("/tasks/{task_id}/run")
async def run_task(task_id: str):
    async with get_db() as db:
        task = await get_task(db, task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        if task["status"] == "running":
            raise HTTPException(409, "Task is already running")

    bg_task = asyncio.create_task(_execute_single_agent(task_id))
    _running_tasks[task_id] = bg_task

    return {"status": "started", "task_id": task_id}


@router.get("/tasks/{task_id}/agents")
async def get_task_agents(task_id: str):
    executor = _active_executors.get(task_id)
    if not executor:
        single = _active_agents.get(task_id)
        if single:
            return [{"name": single.name, "role": single.role, "status": single.status.value}]
        return []

    agents_info = []
    for subtask_id, agent in executor.active_agents.items():
        agents_info.append({
            "subtask_id": subtask_id,
            "name": agent.name,
            "role": agent.role,
            "status": agent.status.value,
        })

    for r in executor.subtask_results.values():
        agents_info.append({
            "subtask_id": r.subtask_id,
            "name": r.agent_name,
            "role": "",
            "status": r.status,
        })

    return agents_info


@router.post("/tasks/{task_id}/pause")
async def pause_task(task_id: str):
    executor = _active_executors.get(task_id)
    if executor:
        executor.pause()
    else:
        agent = _active_agents.get(task_id)
        if not agent:
            raise HTTPException(404, "No running agent for this task")
        agent.pause()
    async with get_db() as db:
        await update_task(db, task_id, status="paused")
    return {"status": "paused"}


@router.post("/tasks/{task_id}/resume")
async def resume_task(task_id: str):
    executor = _active_executors.get(task_id)
    if executor:
        executor.resume()
    else:
        agent = _active_agents.get(task_id)
        if not agent:
            raise HTTPException(404, "No running agent for this task")
        agent.resume()
    async with get_db() as db:
        await update_task(db, task_id, status="running")
    return {"status": "resumed"}


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    executor = _active_executors.get(task_id)
    if executor:
        executor.cancel()
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


async def _update_status(task_id: str, status: str):
    async with get_db() as db:
        await update_task(db, task_id, status=status)


async def _execute_with_plan(task_id: str):
    async with get_db() as db:
        task = await get_task(db, task_id)
    if not task:
        return

    workspace_path = task["workspace_path"]

    async def emit(event: dict):
        event.setdefault("task_id", task_id)
        await _broadcast(task_id, event)

    try:
        # Generate plan if one doesn't exist
        if task.get("plan"):
            plan = TaskPlan(**json.loads(task["plan"]))
        else:
            await _update_status(task_id, "planning")
            await emit({
                "type": "status_change",
                "agent_name": "planner",
                "task_id": task_id,
                "data": {"status": "planning"},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            plan = await decompose_task(task["goal"])
            async with get_db() as db:
                await update_task(db, task_id, plan=plan.model_dump_json())

        await _update_status(task_id, "running")

        executor = PlanExecutor(
            task_id=task_id,
            plan=plan,
            workspace_path=workspace_path,
            max_iterations=task.get("max_iterations") or settings.max_iterations_per_agent,
            require_approval=bool(task.get("require_approval")),
            emit=emit,
        )
        _active_executors[task_id] = executor

        result = await executor.execute()

        async with get_db() as db:
            await update_task(
                db,
                task_id,
                status=result.status,
                result=result.final_output,
                completed_at=datetime.now(timezone.utc).isoformat(),
                total_iterations=result.total_iterations,
                total_tokens=result.total_tokens,
                total_tool_calls=result.total_tool_calls,
            )

        await emit({
            "type": "complete",
            "agent_name": "executor",
            "task_id": task_id,
            "data": {
                "success": result.status == "completed",
                "output": result.final_output[:2000],
                "subtasks_completed": sum(1 for r in result.subtask_results if r.status == "completed"),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        event_type = "task_completed" if result.status == "completed" else "task_failed"
        await fire_task_event(task_id, event_type, {
            "status": result.status,
            "output": result.final_output[:500],
            "goal": task.get("goal", ""),
        })

    except Exception as e:
        async with get_db() as db:
            await update_task(db, task_id, status="failed", result=str(e))
        await emit({
            "type": "error",
            "agent_name": "executor",
            "task_id": task_id,
            "data": {"error": str(e)},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await fire_task_event(task_id, "task_failed", {"status": "failed", "error": str(e)[:500], "goal": task.get("goal", "")})
    finally:
        _running_tasks.pop(task_id, None)
        _active_executors.pop(task_id, None)


async def _execute_single_agent(task_id: str):
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

    await _update_status(task_id, "running")

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

        event_type = "task_completed" if result.success else "task_failed"
        await fire_task_event(task_id, event_type, {
            "status": "completed" if result.success else "failed",
            "output": result.output[:500],
            "goal": task.get("goal", ""),
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
        await fire_task_event(task_id, "task_failed", {"status": "failed", "error": str(e)[:500], "goal": task.get("goal", "")})
    finally:
        _running_tasks.pop(task_id, None)
        _active_agents.pop(task_id, None)
