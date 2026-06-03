from typing import Optional, Callable
from tools.base import Tool
from models.schemas import ToolResultSchema


class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        self._tools[tool.name] = tool

    def register_many(self, tools: list[Tool]) -> None:
        for tool in tools:
            self.register(tool)

    def get(self, name: str) -> Optional[Tool]:
        return self._tools.get(name)

    def get_tools_for_claude(self) -> list[dict]:
        return [tool.to_claude_format() for tool in self._tools.values()]

    async def execute(self, tool_name: str, params: dict, workspace_path: str) -> ToolResultSchema:
        tool = self._tools.get(tool_name)
        if not tool:
            return ToolResultSchema(
                success=False,
                output="",
                error=f"Unknown tool: {tool_name}",
            )
        return await tool.safe_execute(params, workspace_path)

    @property
    def tool_names(self) -> list[str]:
        return list(self._tools.keys())


def create_default_registry(emit_callback: Optional[Callable] = None, include_plugins: bool = True) -> ToolRegistry:
    from tools.file_ops import FileOpsTool
    from tools.web_search import WebSearchTool
    from tools.web_browse import WebBrowseTool
    from tools.code_execute import CodeExecuteTool
    from tools.data_analyze import DataAnalyzeTool
    from tools.shell_command import ShellCommandTool
    from tools.ask_human import AskHumanTool
    from tools.browser import BrowserTool

    registry = ToolRegistry()
    registry.register_many([
        FileOpsTool(),
        WebSearchTool(),
        WebBrowseTool(),
        CodeExecuteTool(),
        DataAnalyzeTool(),
        ShellCommandTool(),
        AskHumanTool(emit_callback=emit_callback),
        BrowserTool(),
    ])

    if include_plugins:
        from plugins import get_loaded_plugins
        for tool in get_loaded_plugins().values():
            registry.register(tool)

    return registry
