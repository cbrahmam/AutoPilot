import aiosqlite
from contextlib import asynccontextmanager
from config import settings

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    goal TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    plan TEXT,
    result TEXT,
    workspace_path TEXT,
    require_approval INTEGER DEFAULT 0,
    max_iterations INTEGER DEFAULT 25,
    created_at TEXT,
    completed_at TEXT,
    total_iterations INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_tool_calls INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS agent_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    agent_name TEXT,
    iteration INTEGER,
    action_type TEXT,
    content TEXT,
    tool_name TEXT,
    tokens_used INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    timestamp TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS agent_memory (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    key TEXT,
    value TEXT,
    memory_type TEXT,
    created_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);
"""


async def init_db():
    async with aiosqlite.connect(str(settings.database_path)) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.executescript(SCHEMA_SQL)
        await db.commit()


@asynccontextmanager
async def get_db():
    db = await aiosqlite.connect(str(settings.database_path))
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
