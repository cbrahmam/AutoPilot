import asyncio
import json
import uuid
from pathlib import Path
from datetime import datetime, timezone

from config import settings
from database import get_db
from models.db_models import create_task, get_task, update_task


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


async def create_pipeline(name: str, description: str, steps: list[dict]) -> dict:
    pipeline_id = _id()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO pipelines (id, name, description, steps, status, current_step, run_count, created_at) VALUES (?, ?, ?, ?, 'idle', 0, 0, ?)",
            (pipeline_id, name, description, json.dumps(steps), _now()),
        )
        await db.commit()
    return {"id": pipeline_id, "name": name, "description": description, "steps": steps, "status": "idle"}


async def list_pipelines() -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM pipelines ORDER BY created_at DESC")
        rows = await cursor.fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["steps"] = json.loads(d["steps"]) if d.get("steps") else []
        result.append(d)
    return result


async def get_pipeline(pipeline_id: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM pipelines WHERE id = ?", (pipeline_id,))
        row = await cursor.fetchone()
    if not row:
        return None
    d = dict(row)
    d["steps"] = json.loads(d["steps"]) if d.get("steps") else []
    return d


async def update_pipeline(pipeline_id: str, **fields) -> dict | None:
    if "steps" in fields and isinstance(fields["steps"], list):
        fields["steps"] = json.dumps(fields["steps"])
    if not fields:
        return await get_pipeline(pipeline_id)
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [pipeline_id]
    async with get_db() as db:
        await db.execute(f"UPDATE pipelines SET {set_clause} WHERE id = ?", values)
        await db.commit()
    return await get_pipeline(pipeline_id)


async def delete_pipeline(pipeline_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM pipeline_runs WHERE pipeline_id = ?", (pipeline_id,))
        await db.execute("DELETE FROM pipelines WHERE id = ?", (pipeline_id,))
        await db.commit()


async def get_pipeline_runs(pipeline_id: str) -> list[dict]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM pipeline_runs WHERE pipeline_id = ? ORDER BY started_at DESC LIMIT 20",
            (pipeline_id,),
        )
        rows = await cursor.fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["step_results"] = json.loads(d["step_results"]) if d.get("step_results") else []
        result.append(d)
    return result


def _render_step_goal(goal_template: str, prev_output: str, step_index: int) -> str:
    goal = goal_template.replace("{{previous_output}}", prev_output[:2000] if prev_output else "")
    goal = goal.replace("{{step_index}}", str(step_index))
    return goal


async def run_pipeline(pipeline_id: str) -> dict:
    pipeline = await get_pipeline(pipeline_id)
    if not pipeline:
        raise ValueError("Pipeline not found")

    run_id = _id()
    steps = pipeline["steps"]
    step_results = []

    async with get_db() as db:
        await db.execute(
            "INSERT INTO pipeline_runs (id, pipeline_id, status, step_results, started_at) VALUES (?, ?, 'running', '[]', ?)",
            (run_id, pipeline_id, _now()),
        )
        await db.execute(
            "UPDATE pipelines SET status = 'running', current_step = 0 WHERE id = ?",
            (pipeline_id,),
        )
        await db.commit()

    prev_output = ""

    for i, step in enumerate(steps):
        step_type = step.get("type", "sequential")
        condition = step.get("condition", "")

        if condition == "previous_success" and step_results and step_results[-1].get("status") != "completed":
            step_results.append({"step": i, "goal": step.get("goal", ""), "status": "skipped", "reason": "Previous step failed"})
            continue

        if condition == "previous_failed" and step_results and step_results[-1].get("status") == "completed":
            step_results.append({"step": i, "goal": step.get("goal", ""), "status": "skipped", "reason": "Previous step succeeded"})
            continue

        goal = _render_step_goal(step.get("goal", ""), prev_output, i)

        task_id = _id()
        workspace_path = str(settings.workspaces_dir / task_id)
        Path(workspace_path).mkdir(parents=True, exist_ok=True)

        async with get_db() as db:
            await create_task(db, goal, False, step.get("max_iterations", 25), workspace_path, task_id=task_id)
            await db.execute(
                "UPDATE pipelines SET current_step = ? WHERE id = ?",
                (i, pipeline_id),
            )
            await db.commit()

        from routers.tasks import _execute_with_plan, _running_tasks
        bg = asyncio.create_task(_execute_with_plan(task_id))
        _running_tasks[task_id] = bg

        try:
            await bg
        except Exception:
            pass

        async with get_db() as db:
            task = await get_task(db, task_id)

        task_status = task.get("status", "failed") if task else "failed"
        task_output = task.get("result", "") if task else ""
        prev_output = task_output

        step_results.append({
            "step": i,
            "goal": goal,
            "task_id": task_id,
            "status": task_status,
            "output_preview": (task_output or "")[:500],
        })

        async with get_db() as db:
            await db.execute(
                "UPDATE pipeline_runs SET step_results = ? WHERE id = ?",
                (json.dumps(step_results), run_id),
            )
            await db.commit()

    final_status = "completed" if all(r.get("status") in ("completed", "skipped") for r in step_results) else "failed"

    async with get_db() as db:
        await db.execute(
            "UPDATE pipeline_runs SET status = ?, step_results = ?, completed_at = ? WHERE id = ?",
            (final_status, json.dumps(step_results), _now(), run_id),
        )
        await db.execute(
            "UPDATE pipelines SET status = 'idle', run_count = run_count + 1, last_run = ? WHERE id = ?",
            (_now(), pipeline_id),
        )
        await db.commit()

    return {"run_id": run_id, "status": final_status, "step_results": step_results}
