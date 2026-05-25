from typing import Callable, Optional
from core.agent import Agent
from core.tool_registry import ToolRegistry
from tools.file_ops import FileOpsTool
from tools.web_search import WebSearchTool
from tools.web_browse import WebBrowseTool
from tools.code_execute import CodeExecuteTool
from tools.data_analyze import DataAnalyzeTool
from tools.shell_command import ShellCommandTool
from tools.ask_human import AskHumanTool
from specialists.researcher import RESEARCHER_SYSTEM_PROMPT, RESEARCHER_TOOLS
from specialists.coder import CODER_SYSTEM_PROMPT, CODER_TOOLS
from specialists.analyst import ANALYST_SYSTEM_PROMPT, ANALYST_TOOLS
from specialists.writer import WRITER_SYSTEM_PROMPT, WRITER_TOOLS

_ALL_TOOLS = {
    "file_ops": FileOpsTool,
    "web_search": WebSearchTool,
    "web_browse": WebBrowseTool,
    "code_execute": CodeExecuteTool,
    "data_analyze": DataAnalyzeTool,
    "shell_command": ShellCommandTool,
}

_SPECIALIST_CONFIG = {
    "researcher": {"prompt": RESEARCHER_SYSTEM_PROMPT, "tools": RESEARCHER_TOOLS},
    "coder": {"prompt": CODER_SYSTEM_PROMPT, "tools": CODER_TOOLS},
    "analyst": {"prompt": ANALYST_SYSTEM_PROMPT, "tools": ANALYST_TOOLS},
    "writer": {"prompt": WRITER_SYSTEM_PROMPT, "tools": WRITER_TOOLS},
}


def _build_registry(tool_names: list[str], emit_callback: Optional[Callable] = None) -> ToolRegistry:
    registry = ToolRegistry()
    for name in tool_names:
        if name == "save_to_memory":
            continue
        if name == "ask_human":
            registry.register(AskHumanTool(emit_callback=emit_callback))
        elif name in _ALL_TOOLS:
            registry.register(_ALL_TOOLS[name]())
    return registry


def create_specialist_agent(
    agent_type: str,
    task_id: str,
    subtask_id: str,
    max_iterations: int = 25,
    require_approval: bool = False,
    emit: Optional[Callable] = None,
) -> Agent:
    config = _SPECIALIST_CONFIG.get(agent_type)

    if config:
        system_prompt = config["prompt"]
        tool_names = config["tools"]
    else:
        from core.agent import DEFAULT_SYSTEM_PROMPT
        system_prompt = DEFAULT_SYSTEM_PROMPT
        tool_names = list(_ALL_TOOLS.keys()) + ["ask_human"]

    registry = _build_registry(tool_names, emit_callback=emit)
    agent_name = f"{agent_type}_{subtask_id}"

    return Agent(
        name=agent_name,
        role=agent_type,
        system_prompt=system_prompt,
        tool_registry=registry,
        task_id=task_id,
        max_iterations=max_iterations,
        require_approval=require_approval,
        emit=emit,
    )
