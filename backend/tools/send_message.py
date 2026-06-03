from tools.base import Tool
from models.schemas import ToolResultSchema


class SendMessageTool(Tool):
    def __init__(self, message_bus=None, agent_name: str = ""):
        self._bus = message_bus
        self._agent_name = agent_name

    @property
    def name(self) -> str:
        return "send_message"

    @property
    def description(self) -> str:
        return "Send a message to another agent working on the same task. Use this to share findings, request information, or coordinate work."

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "recipient": {
                    "type": "string",
                    "description": "Name of the recipient agent (e.g. 'researcher_s1', 'coder_s2')",
                },
                "content": {
                    "type": "string",
                    "description": "Message content to send",
                },
                "msg_type": {
                    "type": "string",
                    "enum": ["info", "request", "result", "warning"],
                    "description": "Type of message",
                },
            },
            "required": ["recipient", "content"],
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        if not self._bus:
            return ToolResultSchema(success=False, output="", error="No message bus available")

        recipient = params.get("recipient", "")
        content = params.get("content", "")
        msg_type = params.get("msg_type", "info")

        if not recipient or not content:
            return ToolResultSchema(success=False, output="", error="recipient and content are required")

        self._bus.send(self._agent_name, recipient, content, msg_type)
        return ToolResultSchema(success=True, output=f"Message sent to {recipient}")


class ReceiveMessagesTool(Tool):
    def __init__(self, message_bus=None, agent_name: str = ""):
        self._bus = message_bus
        self._agent_name = agent_name

    @property
    def name(self) -> str:
        return "check_messages"

    @property
    def description(self) -> str:
        return "Check for messages from other agents. Returns all unread messages."

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {},
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        if not self._bus:
            return ToolResultSchema(success=True, output="No messages (bus not available)")

        messages = self._bus.receive(self._agent_name)
        if not messages:
            return ToolResultSchema(success=True, output="No new messages")

        lines = []
        for m in messages:
            lines.append(f"[{m['msg_type'].upper()}] From {m['sender']}: {m['content']}")
        return ToolResultSchema(success=True, output="\n".join(lines))
