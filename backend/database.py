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

CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    goal TEXT NOT NULL,
    cron_expr TEXT NOT NULL,
    max_iterations INTEGER DEFAULT 25,
    enabled INTEGER DEFAULT 1,
    run_count INTEGER DEFAULT 0,
    last_run TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    secret TEXT,
    goal_template TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    trigger_count INTEGER DEFAULT 0,
    last_triggered TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id TEXT PRIMARY KEY,
    webhook_id TEXT,
    source TEXT,
    payload TEXT,
    task_id TEXT,
    status TEXT DEFAULT 'received',
    created_at TEXT,
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    type TEXT NOT NULL,
    target TEXT NOT NULL,
    payload TEXT,
    status TEXT DEFAULT 'pending',
    sent_at TEXT,
    created_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS notification_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    event TEXT NOT NULL,
    channel TEXT NOT NULL,
    target TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT
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
