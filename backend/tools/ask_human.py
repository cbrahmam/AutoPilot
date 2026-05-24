import asyncio
import uuid
from typing import Callable, Optional
from tools.base import Tool
from models.schemas import ToolResultSchema
from config import settings

_pending_requests: dict[str, tuple[asyncio.Event, dict]] = {}


class AskHumanTool(Tool):
    def __init__(self, emit_callback: Optional[Callable] = None):
        self._emit = emit_callback
        self._timeout = settings.human_approval_timeout

    @property
    def name(self) -> str:
        return "ask_human"

    @property
    def description(self) -> str:
        return (
            "Pause execution and ask the human user a question. Use this when you need "
            "clarification, approval, or want to present options for the user to choose from. "
            "The user has up to 5 minutes to respond."
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "The question to ask the human",
                },
                "options": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of choices for the human to pick from",
                },
            },
            "required": ["question"],
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        question = params["question"]
        options = params.get("options", [])

        request_id = uuid.uuid4().hex
        event = asyncio.Event()
        response_holder: dict = {}
        _pending_requests[request_id] = (event, response_holder)

        if self._emit:
            await self._emit({
                "type": "human_request",
                "agent_name": "",
                "task_id": "",
                "data": {
                    "request_id": request_id,
                    "question": question,
                    "options": options,
                },
                "timestamp": "",
            })

        try:
            await asyncio.wait_for(event.wait(), timeout=self._timeout)
            response = response_holder.get("response", "No response provided")
            approved = response_holder.get("approved", True)
            if approved:
                return ToolResultSchema(success=True, output=f"Human response: {response}")
            else:
                return ToolResultSchema(success=True, output="Human rejected the request.")
        except asyncio.TimeoutError:
            return ToolResultSchema(
                success=False,
                output="Human did not respond within the timeout period. Continuing with default behavior.",
                error="Timeout waiting for human response",
            )
        finally:
            _pending_requests.pop(request_id, None)


def resolve_human_request(request_id: str, approved: bool, response: str = ""):
    entry = _pending_requests.get(request_id)
    if entry:
        event, holder = entry
        holder["approved"] = approved
        holder["response"] = response
        event.set()
