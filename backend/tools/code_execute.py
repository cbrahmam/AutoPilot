from pathlib import Path
from tools.base import Tool
from models.schemas import ToolResultSchema
from core.sandbox import run_sandboxed
from config import settings


class CodeExecuteTool(Tool):
    @property
    def name(self) -> str:
        return "code_execute"

    @property
    def description(self) -> str:
        return (
            "Execute Python, JavaScript (Node.js), or Bash code in a sandboxed environment. "
            "Code runs in the task workspace with a 30-second timeout. "
            "Use this to test code, run scripts, or process data."
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "language": {
                    "type": "string",
                    "enum": ["python", "javascript", "bash"],
                    "description": "Programming language to execute",
                },
                "code": {
                    "type": "string",
                    "description": "Code to execute",
                },
            },
            "required": ["language", "code"],
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        language = params["language"]
        code = params["code"]

        ext_map = {"python": ".py", "javascript": ".js", "bash": ".sh"}
        cmd_map = {"python": "python3", "javascript": "node", "bash": "bash"}

        ext = ext_map.get(language)
        cmd = cmd_map.get(language)
        if not ext or not cmd:
            return ToolResultSchema(success=False, output="", error=f"Unsupported language: {language}")

        code_path = Path(workspace_path) / f".tmp_code{ext}"
        try:
            code_path.write_text(code, encoding="utf-8")
            stdout, stderr, returncode = await run_sandboxed(
                [cmd, str(code_path)], cwd=workspace_path
            )
        finally:
            code_path.unlink(missing_ok=True)

        output_parts = []
        if stdout:
            output_parts.append(f"STDOUT:\n{stdout}")
        if stderr:
            output_parts.append(f"STDERR:\n{stderr}")
        output_parts.append(f"Exit code: {returncode}")
        output = "\n".join(output_parts)

        return ToolResultSchema(
            success=(returncode == 0),
            output=output[:settings.max_tool_output_chars],
            error=stderr if returncode != 0 else None,
        )
