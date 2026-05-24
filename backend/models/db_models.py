import uuid
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


async def create_task(db, goal: str, require_approval: bool, max_iterations: int, workspace_path: str, task_id: str | None = None) -> str:
    task_id = task_id or _id()
    await db.execute(
        """INSERT INTO tasks (id, goal, status, workspace_path, require_approval, max_iterations, created_at)
           VALUES (?, ?, 'pending', ?, ?, ?, ?)""",
        (task_id, goal, workspace_path, int(require_approval), max_iterations, _now()),
    )
    await db.commit()
    return task_id


async def get_task(db, task_id: str) -> dict | None:
    cursor = await db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = await cursor.fetchone()
    if not row:
        return None
    return dict(row)


async def list_tasks(db, limit: int = 50, offset: int = 0) -> list[dict]:
    cursor = await db.execute(
        "SELECT * FROM tasks ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def update_task(db, task_id: str, **fields):
    if not fields:
        return
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [task_id]
    await db.execute(f"UPDATE tasks SET {set_clause} WHERE id = ?", values)
    await db.commit()


async def create_log(
    db,
    task_id: str,
    agent_name: str,
    iteration: int,
    action_type: str,
    content: str,
    tool_name: str | None = None,
    tokens_used: int = 0,
    duration_ms: int = 0,
) -> str:
    log_id = _id()
    await db.execute(
        """INSERT INTO agent_logs (id, task_id, agent_name, iteration, action_type, content, tool_name, tokens_used, duration_ms, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (log_id, task_id, agent_name, iteration, action_type, content, tool_name, tokens_used, duration_ms, _now()),
    )
    await db.commit()
    return log_id


async def get_logs(db, task_id: str, agent_name: str | None = None) -> list[dict]:
    if agent_name:
        cursor = await db.execute(
            "SELECT * FROM agent_logs WHERE task_id = ? AND agent_name = ? ORDER BY timestamp",
            (task_id, agent_name),
        )
    else:
        cursor = await db.execute(
            "SELECT * FROM agent_logs WHERE task_id = ? ORDER BY timestamp",
            (task_id,),
        )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def save_memory(db, task_id: str, key: str, value: str, memory_type: str) -> str:
    mem_id = _id()
    await db.execute(
        """INSERT INTO agent_memory (id, task_id, key, value, memory_type, created_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (mem_id, task_id, key, value, memory_type, _now()),
    )
    await db.commit()
    return mem_id


async def get_memories(db, task_id: str) -> list[dict]:
    cursor = await db.execute(
        "SELECT * FROM agent_memory WHERE task_id = ? ORDER BY created_at",
        (task_id,),
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]
