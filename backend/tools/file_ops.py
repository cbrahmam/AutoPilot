import asyncio
from pathlib import Path
from tools.base import Tool, safe_path
from models.schemas import ToolResultSchema


class FileOpsTool(Tool):
    @property
    def name(self) -> str:
        return "file_ops"

    @property
    def description(self) -> str:
        return (
            "Read, write, append, list, delete, rename, or check existence of files "
            "in the task workspace. All paths are relative to the workspace root."
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": ["read", "write", "append", "list_dir", "delete", "rename", "exists"],
                    "description": "The file operation to perform",
                },
                "path": {
                    "type": "string",
                    "description": "File path relative to the workspace",
                },
                "content": {
                    "type": "string",
                    "description": "Content for write/append operations",
                },
                "new_path": {
                    "type": "string",
                    "description": "New path for rename operation",
                },
            },
            "required": ["operation", "path"],
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        operation = params["operation"]
        rel_path = params["path"]

        target = safe_path(workspace_path, rel_path)

        if operation == "read":
            return await asyncio.to_thread(self._read, target)
        elif operation == "write":
            content = params.get("content", "")
            return await asyncio.to_thread(self._write, target, content)
        elif operation == "append":
            content = params.get("content", "")
            return await asyncio.to_thread(self._append, target, content)
        elif operation == "list_dir":
            return await asyncio.to_thread(self._list_dir, target, workspace_path)
        elif operation == "delete":
            return await asyncio.to_thread(self._delete, target)
        elif operation == "rename":
            new_target = safe_path(workspace_path, params["new_path"])
            return await asyncio.to_thread(self._rename, target, new_target)
        elif operation == "exists":
            exists = target.exists()
            return ToolResultSchema(success=True, output=f"{'Exists' if exists else 'Does not exist'}: {rel_path}")
        else:
            return ToolResultSchema(success=False, output="", error=f"Unknown operation: {operation}")

    def _read(self, path: Path) -> ToolResultSchema:
        if not path.exists():
            return ToolResultSchema(success=False, output="", error=f"File not found: {path.name}")
        content = path.read_text(encoding="utf-8", errors="replace")
        return ToolResultSchema(success=True, output=content)

    def _write(self, path: Path, content: str) -> ToolResultSchema:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return ToolResultSchema(success=True, output=f"Written {len(content)} chars to {path.name}")

    def _append(self, path: Path, content: str) -> ToolResultSchema:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "a", encoding="utf-8") as f:
            f.write(content)
        return ToolResultSchema(success=True, output=f"Appended {len(content)} chars to {path.name}")

    def _list_dir(self, path: Path, workspace_path: str) -> ToolResultSchema:
        if not path.exists():
            return ToolResultSchema(success=False, output="", error=f"Directory not found: {path.name}")
        if not path.is_dir():
            return ToolResultSchema(success=False, output="", error=f"Not a directory: {path.name}")
        workspace = Path(workspace_path).resolve()
        entries = []
        for item in sorted(path.iterdir()):
            if item.name.startswith(".tmp_code"):
                continue
            rel = item.relative_to(workspace)
            kind = "dir" if item.is_dir() else "file"
            size = item.stat().st_size if item.is_file() else 0
            entries.append(f"[{kind}] {rel} ({size} bytes)" if kind == "file" else f"[{kind}] {rel}/")
        return ToolResultSchema(success=True, output="\n".join(entries) if entries else "(empty directory)")

    def _delete(self, path: Path) -> ToolResultSchema:
        if not path.exists():
            return ToolResultSchema(success=False, output="", error=f"File not found: {path.name}")
        path.unlink()
        return ToolResultSchema(success=True, output=f"Deleted {path.name}")

    def _rename(self, old: Path, new: Path) -> ToolResultSchema:
        if not old.exists():
            return ToolResultSchema(success=False, output="", error=f"File not found: {old.name}")
        new.parent.mkdir(parents=True, exist_ok=True)
        old.rename(new)
        return ToolResultSchema(success=True, output=f"Renamed {old.name} to {new.name}")
