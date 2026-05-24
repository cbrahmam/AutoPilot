import uuid
from datetime import datetime, timezone
import aiosqlite
from config import settings
from tools.base import Tool
from models.schemas import ToolResultSchema


class AgentMemory:
    def __init__(self, task_id: str, db_path: str | None = None):
        self.task_id = task_id
        self.db_path = db_path or str(settings.database_path)
        self._cache: dict[str, dict] = {}

    async def save(self, key: str, value: str, memory_type: str = "fact") -> None:
        self._cache[key] = {"value": value, "type": memory_type}
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO agent_memory (id, task_id, key, value, memory_type, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (uuid.uuid4().hex, self.task_id, key, value, memory_type, datetime.now(timezone.utc).isoformat()),
            )
            await db.commit()

    async def recall(self, key: str) -> str | None:
        if key in self._cache:
            return self._cache[key]["value"]
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "SELECT value FROM agent_memory WHERE task_id = ? AND key = ?",
                (self.task_id, key),
            )
            row = await cursor.fetchone()
            return row[0] if row else None

    async def get_context(self) -> str:
        if not self._cache:
            await self._load_all()
        if not self._cache:
            return ""

        sections: dict[str, list[str]] = {
            "fact": [],
            "decision": [],
            "observation": [],
            "file_created": [],
        }
        for key, entry in self._cache.items():
            bucket = sections.get(entry["type"], sections["fact"])
            bucket.append(f"- {key}: {entry['value']}")

        labels = {
            "fact": "KNOWN FACTS",
            "decision": "DECISIONS MADE",
            "observation": "OBSERVATIONS",
            "file_created": "FILES CREATED",
        }
        parts = []
        for mem_type, label in labels.items():
            if sections[mem_type]:
                parts.append(f"{label}:\n" + "\n".join(sections[mem_type]))
        return "\n\n".join(parts)

    async def _load_all(self):
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT key, value, memory_type FROM agent_memory WHERE task_id = ?",
                (self.task_id,),
            )
            rows = await cursor.fetchall()
            for row in rows:
                self._cache[row[0]] = {"value": row[1], "type": row[2]}


class SaveToMemoryTool(Tool):
    def __init__(self, memory: AgentMemory):
        self._memory = memory

    @property
    def name(self) -> str:
        return "save_to_memory"

    @property
    def description(self) -> str:
        return (
            "Save an important fact, decision, or observation to persistent memory. "
            "Use this to remember key findings, decisions, or files you created "
            "so they are not lost over long tasks."
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "key": {
                    "type": "string",
                    "description": "Short label for this memory (e.g., 'main_finding', 'approach_chosen')",
                },
                "value": {
                    "type": "string",
                    "description": "The information to remember",
                },
                "memory_type": {
                    "type": "string",
                    "enum": ["fact", "decision", "observation", "file_created"],
                    "description": "Type of memory (default: fact)",
                    "default": "fact",
                },
            },
            "required": ["key", "value"],
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        key = params["key"]
        value = params["value"]
        memory_type = params.get("memory_type", "fact")
        await self._memory.save(key, value, memory_type)
        return ToolResultSchema(success=True, output=f"Saved to memory: {key}")
