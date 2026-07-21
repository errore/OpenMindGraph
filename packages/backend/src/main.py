from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import json
import asyncio
from typing import Optional

app = FastAPI(title="OpenMindGraph Backend", version="0.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2048
    system_prompt: Optional[str] = None


@app.get("/health")
async def health():
    return {"status": "ok"}


def _build_messages(req: ChatRequest) -> list[dict]:
    msgs = []
    if req.system_prompt:
        msgs.append({"role": "system", "content": req.system_prompt})
    for m in req.messages:
        msgs.append({"role": m.role, "content": m.content})
    return msgs


async def _mock_stream(req: ChatRequest, messages: list[dict]) -> str:
    """Fallback when no API key: returns a debug response with request summary."""

    system_msg = next((m for m in messages if m["role"] == "system"), None)
    user_msgs = [m for m in messages if m["role"] == "user"]
    last_user_msg = user_msgs[-1]["content"] if user_msgs else "(empty)"

    debug_lines = [
        "[MOCK MODE — set LITELLM_API_KEY in .env for real LLM]",
        "",
        f"Provider:  {req.provider}",
        f"Model:     {req.model}",
        f"Temp:      {req.temperature}",
        f"MaxTokens: {req.max_tokens}",
        "",
        f"Messages:  {len(messages)} total",
    ]

    if system_msg:
        debug_lines.append(f"System:    {system_msg['content'][:120]}")
    else:
        debug_lines.append("System:    (not set)")

    for i, m in enumerate(user_msgs):
        prefix = "→" if i == len(user_msgs) - 1 else " "
        debug_lines.append(f"  [{m['role']}] {prefix} {m['content'][:100]}")

    debug_lines.extend([
        "",
        f"You said: \"{last_user_msg[:200]}\"",
        "",
        "---",
        "This is a mock response. Install litellm and configure",
        "LITELLM_API_KEY to connect to a real LLM provider.",
    ])

    mock_response = "\n".join(debug_lines)

    for char in mock_response:
        yield f"data: {json.dumps({'text': char})}\n\n"
        await asyncio.sleep(0.015)


async def _litellm_stream(req: ChatRequest, messages: list[dict]) -> str:
    from litellm import acompletion

    model_id = f"{req.provider}/{req.model}"
    response = await acompletion(
        model=model_id,
        messages=messages,
        temperature=req.temperature,
        max_tokens=req.max_tokens,
        stream=True,
    )

    async for chunk in response:
        delta = chunk.choices[0].delta
        if delta.content:
            yield f"data: {json.dumps({'text': delta.content})}\n\n"
            await asyncio.sleep(0)

    yield "data: [DONE]\n\n"


@app.post("/api/chat")
async def chat(req: ChatRequest):
    messages = _build_messages(req)
    api_key = os.environ.get("LITELLM_API_KEY")

    if not api_key:
        return StreamingResponse(_mock_stream(req, messages), media_type="text/event-stream")

    return StreamingResponse(_litellm_stream(req, messages), media_type="text/event-stream")
