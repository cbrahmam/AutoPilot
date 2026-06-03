import asyncio
from datetime import datetime, timezone
from typing import Optional, Callable


class Message:
    __slots__ = ("sender", "recipient", "content", "msg_type", "timestamp")

    def __init__(self, sender: str, recipient: str, content: str, msg_type: str = "info"):
        self.sender = sender
        self.recipient = recipient
        self.content = content
        self.msg_type = msg_type
        self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "sender": self.sender,
            "recipient": self.recipient,
            "content": self.content,
            "msg_type": self.msg_type,
            "timestamp": self.timestamp,
        }


class MessageBus:
    def __init__(self, emit: Optional[Callable] = None):
        self._inboxes: dict[str, list[Message]] = {}
        self._waiters: dict[str, asyncio.Event] = {}
        self._emit = emit

    def send(self, sender: str, recipient: str, content: str, msg_type: str = "info"):
        msg = Message(sender, recipient, content, msg_type)
        if recipient not in self._inboxes:
            self._inboxes[recipient] = []
        self._inboxes[recipient].append(msg)

        waiter = self._waiters.get(recipient)
        if waiter:
            waiter.set()

    def receive(self, agent_name: str) -> list[dict]:
        messages = self._inboxes.pop(agent_name, [])
        return [m.to_dict() for m in messages]

    def peek(self, agent_name: str) -> int:
        return len(self._inboxes.get(agent_name, []))

    async def wait_for_message(self, agent_name: str, timeout: float = 30.0) -> list[dict]:
        if self._inboxes.get(agent_name):
            return self.receive(agent_name)

        event = asyncio.Event()
        self._waiters[agent_name] = event
        try:
            await asyncio.wait_for(event.wait(), timeout=timeout)
        except asyncio.TimeoutError:
            pass
        finally:
            self._waiters.pop(agent_name, None)

        return self.receive(agent_name)

    def broadcast(self, sender: str, content: str, msg_type: str = "broadcast"):
        for name in list(self._inboxes.keys()):
            if name != sender:
                self.send(sender, name, content, msg_type)

    def get_all_messages(self) -> dict[str, list[dict]]:
        return {
            name: [m.to_dict() for m in msgs]
            for name, msgs in self._inboxes.items()
        }
