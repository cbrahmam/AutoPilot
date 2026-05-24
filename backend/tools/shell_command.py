import shlex
from tools.base import Tool
from models.schemas import ToolResultSchema
from core.sandbox import run_sandboxed
from config import settings

ALLOWED_COMMANDS = {"ls", "cat", "head", "tail", "wc", "grep", "find", "curl", "pip"}
BLOCKED_PATTERNS = ["rm -rf", "sudo", "chmod", "chown", ">>", "|", "&&", "||", ";", "`", "$("]


class ShellCommandTool(Tool):
    @property
    def name(self) -> str:
        return "shell_command"

    @property
    def description(self) -> str:
        return (
            "Run a shell command in the task workspace. Only allowed commands: "
            "ls, cat, head, tail, wc, grep, find, curl (GET only), pip install. "
            "Commands are sandboxed to the workspace directory."
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "Shell command to execute",
                },
            },
            "required": ["command"],
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        command = params["command"]

        for pattern in BLOCKED_PATTERNS:
            if pattern in command:
                return ToolResultSchema(
                    success=False,
                    output="",
                    error=f"Blocked pattern detected: '{pattern}'",
                )

        try:
            parts = shlex.split(command)
        except ValueError as e:
            return ToolResultSchema(success=False, output="", error=f"Invalid command syntax: {e}")

        if not parts:
            return ToolResultSchema(success=False, output="", error="Empty command")

        executable = parts[0]
        if executable not in ALLOWED_COMMANDS:
            return ToolResultSchema(
                success=False,
                output="",
                error=f"Command '{executable}' is not allowed. Allowed: {sorted(ALLOWED_COMMANDS)}",
            )

        if executable == "curl":
            blocked_flags = {"-X", "--data", "-d", "--upload-file", "-T", "--request"}
            if any(flag in parts for flag in blocked_flags):
                return ToolResultSchema(success=False, output="", error="Only GET requests are allowed with curl")

        if executable == "pip":
            if len(parts) < 2 or parts[1] != "install":
                return ToolResultSchema(success=False, output="", error="Only 'pip install' is allowed")

        stdout, stderr, returncode = await run_sandboxed(parts, cwd=workspace_path)

        output = stdout[:settings.max_tool_output_chars] if stdout else ""
        return ToolResultSchema(
            success=(returncode == 0),
            output=output,
            error=stderr if returncode != 0 else None,
        )
