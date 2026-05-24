from abc import ABC, abstractmethod
from pathlib import Path
import time
from models.schemas import ToolResultSchema


class Tool(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def description(self) -> str: ...

    @property
    @abstractmethod
    def input_schema(self) -> dict: ...

    @abstractmethod
    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema: ...

    async def safe_execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        start = time.perf_counter()
        try:
            result = await self.execute(params, workspace_path)
            result.execution_time_ms = int((time.perf_counter() - start) * 1000)
            return result
        except Exception as e:
            elapsed = int((time.perf_counter() - start) * 1000)
            return ToolResultSchema(
                success=False,
                output="",
                error=f"{type(e).__name__}: {e}",
                execution_time_ms=elapsed,
            )

    def to_claude_format(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }


def safe_path(workspace_path: str, relative_path: str) -> Path:
    workspace = Path(workspace_path).resolve()
    target = (workspace / relative_path).resolve()
    if not str(target).startswith(str(workspace)):
        raise ValueError(f"Path escapes workspace: {relative_path}")
    return target
