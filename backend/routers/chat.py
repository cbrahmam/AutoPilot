import uuid
import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import anthropic

from config import settings
from database import get_db
from core.tool_registry import create_default_registry

router = APIRouter()


class ChatMessage(BaseModel):
    content: str
    session_id: str | None = None


def _now():
    return datetime.now(timezone.utc).isoformat()


@router.get("/chat/sessions")
async def list_sessions():
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM chat_sessions ORDER BY updated_at DESC LIMIT 50"
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.post("/chat/sessions")
async def create_session():
    session_id = uuid.uuid4().hex
    now = _now()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO chat_sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (session_id, "New Chat", now, now),
        )
        await db.commit()
    return {"id": session_id, "title": "New Chat", "created_at": now}


@router.get("/chat/sessions/{session_id}/messages")
async def get_messages(session_id: str):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at",
            (session_id,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.delete("/chat/sessions/{session_id}")
async def delete_session(session_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
        await db.commit()
    return {"deleted": True}


@router.post("/chat")
async def chat(body: ChatMessage):
    session_id = body.session_id
    if not session_id:
        session_id = uuid.uuid4().hex
        now = _now()
        async with get_db() as db:
            await db.execute(
                "INSERT INTO chat_sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (session_id, body.content[:50], now, now),
            )
            await db.commit()

    msg_id = uuid.uuid4().hex
    async with get_db() as db:
        await db.execute(
            "INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
            (msg_id, session_id, "user", body.content, _now()),
        )
        await db.commit()

    async with get_db() as db:
        cursor = await db.execute(
            "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at",
            (session_id,),
        )
        rows = await cursor.fetchall()

    messages = [{"role": r["role"], "content": r["content"]} for r in rows]

    registry = create_default_registry()
    tools = registry.get_tools_for_claude()

    async def generate():
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

        try:
            full_text = ""

            async with client.messages.stream(
                model=settings.model_name,
                max_tokens=4096,
                system="You are AutoPilot, a helpful AI assistant. You can use tools to search the web, analyze data, execute code, and manage files. Be conversational and helpful.",
                tools=tools,
                messages=messages,
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_delta":
                        if hasattr(event.delta, "text"):
                            full_text += event.delta.text
                            yield f"data: {json.dumps({'type': 'text', 'content': event.delta.text})}\n\n"
                    elif event.type == "content_block_start":
                        if hasattr(event.content_block, "name"):
                            yield f"data: {json.dumps({'type': 'tool_start', 'name': event.content_block.name})}\n\n"
                    elif event.type == "message_stop":
                        yield f"data: {json.dumps({'type': 'done'})}\n\n"

            if full_text:
                reply_id = uuid.uuid4().hex
                async with get_db() as db:
                    await db.execute(
                        "INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                        (reply_id, session_id, "assistant", full_text, _now()),
                    )
                    title_preview = messages[0]["content"][:50] if messages else "Chat"
                    await db.execute(
                        "UPDATE chat_sessions SET updated_at = ?, title = ? WHERE id = ? AND title = 'New Chat'",
                        (_now(), title_preview, session_id),
                    )
                    await db.commit()

            yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
