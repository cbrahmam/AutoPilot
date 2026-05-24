import asyncio
import time
from datetime import datetime, timezone
from typing import Optional, Callable

import anthropic

from config import settings
from core.tool_registry import ToolRegistry
from core.memory import AgentMemory, SaveToMemoryTool
from models.schemas import AgentResult, AgentStatus

DEFAULT_SYSTEM_PROMPT = """You are AutoPilot, a capable AI agent that can research, code, analyze data, and create files to accomplish tasks. You have access to various tools — use them proactively to get the job done.

Guidelines:
- Think step by step before acting.
- Use tools as needed to gather information, write code, create files, and verify results.
- When you discover important information, save it to memory using the save_to_memory tool.
- When you create files, note them in memory with memory_type "file_created".
- If a tool call fails, read the error and try a different approach.
- Be thorough but efficient. Deliver a complete, useful result.
- When you are done, provide a clear summary of what you accomplished."""


class Agent:
    def __init__(
        self,
        name: str,
        role: str,
        system_prompt: str | None = None,
        tool_registry: ToolRegistry | None = None,
        task_id: str = "",
        max_iterations: int = 25,
        require_approval: bool = False,
        emit: Optional[Callable] = None,
    ):
        self.name = name
        self.role = role
        self.system_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        self.tool_registry = tool_registry or ToolRegistry()
        self.task_id = task_id
        self.max_iterations = max_iterations
        self.require_approval = require_approval
        self._emit = emit

        self.memory = AgentMemory(task_id)
        self.conversation_history: list[dict] = []
        self.status = AgentStatus.IDLE
        self.total_tokens = 0
        self.total_tool_calls = 0
        self.files_created: list[str] = []

        self.tool_registry.register(SaveToMemoryTool(self.memory))

        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

        self._pause_event = asyncio.Event()
        self._pause_event.set()
        self._cancelled = False

    async def run(self, task: str, context: dict | None = None, workspace_path: str = "") -> AgentResult:
        self.status = AgentStatus.THINKING
        await self._emit_event("status_change", {"status": self.status.value})

        user_content = self._build_task_prompt(task, context)
        self.conversation_history.append({"role": "user", "content": user_content})

        last_response = None

        for iteration in range(self.max_iterations):
            await self._pause_event.wait()

            if self._cancelled:
                return AgentResult(
                    success=False,
                    output="Task cancelled by user.",
                    iterations_used=iteration,
                    tool_calls_made=self.total_tool_calls,
                    tokens_used=self.total_tokens,
                    error="Cancelled",
                )

            await self._emit_event("iteration", {"iteration": iteration + 1, "max": self.max_iterations})

            self.status = AgentStatus.THINKING
            await self._emit_event("status_change", {"status": self.status.value})

            response = await self._call_llm_with_retry()
            if response is None:
                self.status = AgentStatus.FAILED
                return AgentResult(
                    success=False,
                    output="",
                    iterations_used=iteration,
                    tool_calls_made=self.total_tool_calls,
                    tokens_used=self.total_tokens,
                    error="LLM call failed after retries",
                )

            last_response = response
            self.total_tokens += response.usage.input_tokens + response.usage.output_tokens

            text_blocks = [b for b in response.content if b.type == "text"]
            tool_blocks = [b for b in response.content if b.type == "tool_use"]

            for tb in text_blocks:
                await self._emit_event("thinking", {"text": tb.text})

            if not tool_blocks:
                self.status = AgentStatus.COMPLETED
                await self._emit_event("status_change", {"status": self.status.value})
                final_text = "\n".join(tb.text for tb in text_blocks)
                return AgentResult(
                    success=True,
                    output=final_text,
                    iterations_used=iteration + 1,
                    tool_calls_made=self.total_tool_calls,
                    tokens_used=self.total_tokens,
                    files_created=self.files_created,
                )

            self.conversation_history.append({
                "role": "assistant",
                "content": [self._block_to_dict(b) for b in response.content],
            })

            self.status = AgentStatus.ACTING
            await self._emit_event("status_change", {"status": self.status.value})

            tool_results_content = []

            for tool_block in tool_blocks:
                tool_name = tool_block.name
                tool_input = tool_block.input
                tool_use_id = tool_block.id

                await self._emit_event("tool_call", {
                    "tool_name": tool_name,
                    "tool_input": tool_input,
                    "tool_use_id": tool_use_id,
                })

                result = await self.tool_registry.execute(tool_name, tool_input, workspace_path)
                self.total_tool_calls += 1

                await self._emit_event("tool_result", {
                    "tool_name": tool_name,
                    "tool_use_id": tool_use_id,
                    "success": result.success,
                    "output": result.output[:500],
                    "error": result.error,
                    "execution_time_ms": result.execution_time_ms,
                })

                if tool_name == "file_ops" and tool_input.get("operation") in ("write", "append"):
                    file_path = tool_input.get("path", "")
                    if file_path and file_path not in self.files_created:
                        self.files_created.append(file_path)

                result_content = result.output if result.success else f"Error: {result.error}\n{result.output}"
                tool_results_content.append({
                    "type": "tool_result",
                    "tool_use_id": tool_use_id,
                    "content": result_content,
                })

            self.conversation_history.append({
                "role": "user",
                "content": tool_results_content,
            })

            self._maybe_truncate_history()

        self.status = AgentStatus.COMPLETED
        await self._emit_event("status_change", {"status": self.status.value})

        final_text = ""
        if last_response:
            final_text = "\n".join(
                b.text for b in last_response.content if b.type == "text"
            )

        return AgentResult(
            success=True,
            output=final_text,
            iterations_used=self.max_iterations,
            tool_calls_made=self.total_tool_calls,
            tokens_used=self.total_tokens,
            files_created=self.files_created,
            max_iterations_reached=True,
        )

    async def _call_llm(self):
        memory_context = await self.memory.get_context()
        full_system = self.system_prompt
        if memory_context:
            full_system += f"\n\n## Your Working Memory\n{memory_context}"

        return await self._client.messages.create(
            model=settings.model_name,
            max_tokens=4096,
            system=full_system,
            tools=self.tool_registry.get_tools_for_claude(),
            messages=self.conversation_history,
        )

    async def _call_llm_with_retry(self, retries: int = 3):
        for attempt in range(retries):
            try:
                return await self._call_llm()
            except anthropic.RateLimitError:
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** (attempt + 1))
                    continue
                return None
            except anthropic.APIError as e:
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                return None

    def _build_task_prompt(self, task: str, context: dict | None = None) -> str:
        prompt = f"## Task\n{task}"
        if context:
            prompt += "\n\n## Context\n"
            for key, value in context.items():
                prompt += f"- {key}: {value}\n"
        return prompt

    def _block_to_dict(self, block) -> dict:
        if block.type == "text":
            return {"type": "text", "text": block.text}
        elif block.type == "tool_use":
            return {"type": "tool_use", "id": block.id, "name": block.name, "input": block.input}
        return {"type": block.type}

    def _maybe_truncate_history(self):
        max_msgs = settings.max_conversation_messages
        if len(self.conversation_history) <= max_msgs:
            return
        keep = max_msgs - 1
        self.conversation_history = self.conversation_history[:1] + self.conversation_history[-keep:]

    async def _emit_event(self, event_type: str, data: dict):
        if self._emit:
            await self._emit({
                "type": event_type,
                "agent_name": self.name,
                "task_id": self.task_id,
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    def pause(self):
        self._pause_event.clear()
        self.status = AgentStatus.IDLE

    def resume(self):
        self._pause_event.set()

    def cancel(self):
        self._cancelled = True
        self._pause_event.set()
