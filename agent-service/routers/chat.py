"""
FastAPI router for simple chat streaming via host-proxy.

Routes
------
POST   /chat    — stream a chat response via SSE

This endpoint proxies to the host-proxy service which runs Claude Code CLI.
"""
from typing import AsyncGenerator
import json
import logging
import os
from pathlib import Path

import httpx
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


def _read_vault_context(vault_path: str = "/vault") -> str:
    """Read key vault files to provide context to Claude."""
    context_files = []
    vault_root = Path(vault_path)

    # Try to read outline
    outline_paths = [
        vault_root / "Overview" / "Outline.md",
        vault_root / "Outline.md",
    ]

    for path in outline_paths:
        if path.exists():
            try:
                content = path.read_text(encoding='utf-8')
                context_files.append(f"=== {path.name} ===\n{content}")
                break
            except Exception:
                pass

    # Try to read synopsis
    synopsis_paths = [
        vault_root / "Overview" / "Synopsis.md",
        vault_root / "Synopsis.md",
    ]

    for path in synopsis_paths:
        if path.exists():
            try:
                content = path.read_text(encoding='utf-8')
                context_files.append(f"=== {path.name} ===\n{content}")
                break
            except Exception:
                pass

    if context_files:
        return "\n\n".join(context_files)
    return ""


class ChatRequest(BaseModel):
    """Request body for /chat endpoint."""
    message: str
    system: str | None = None
    history: list[dict] | None = None
    vault_path: str | None = None
    current_path: str | None = None


async def _chat_generator(
    message: str,
    system: str | None,
    history: list[dict] | None,
    vault_path: str | None = None,
    current_path: str | None = None,
) -> AsyncGenerator[str, None]:
    """Stream chat response via host-proxy SSE."""
    try:
        # Enhance system prompt with vault context and file-writing instructions
        enhanced_system = system or "You are a helpful writing assistant."

        # Add current path context if available
        if current_path:
            enhanced_system = f"{enhanced_system}\n\n[USER IS CURRENTLY VIEWING: {current_path}]"

        vault_context = _read_vault_context(vault_path or "/vault")
        if vault_context:
            enhanced_system = f"{enhanced_system}\n\n[PROJECT CONTEXT FROM VAULT]\n{vault_context}"

        # Add file-writing instructions
        enhanced_system += """

[FILE WRITING INSTRUCTIONS]
You have permission to write and update files in the vault. When you need to create or update a file:

1. Use this format (DO NOT ask for permission, just write):
```
@write-file: path/to/file.md
Content here...
```

2. Always include the full path from the vault root (e.g., "Overview/Outline.md", "Characters/CharacterName.md")

3. You can write multiple files in one response by using multiple @write-file blocks

4. Do NOT ask for permission before writing - just write the files directly

Examples:
```
@write-file: Overview/Outline.md
# Story Outline
- Chapter 1
- Chapter 2
```

```
@write-file: Overview/Synopsis.md
# Synopsis
The story begins...
```

```
@write-file: Characters/Hero.md
# Hero Character Profile
Age: 25
```"""

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{settings.host_proxy_url}/chat",
                json={
                    "message": message,
                    "system": enhanced_system,
                    "history": history or [],
                    "vault_path": settings.host_vault_path,  # Use Windows path for host-proxy
                },
            ) as response:
                if response.status_code != 200:
                    raise Exception(f"Host proxy returned {response.status_code}")

                async for line in response.aiter_lines():
                    # Skip empty lines between SSE events
                    if not line:
                        continue
                    # Pass through SSE lines directly
                    if line.startswith("data: "):
                        yield line + "\n\n"
    except Exception as exc:
        error_msg = str(exc)
        yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"


@router.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    """
    Stream a chat response.

    The response body is a text/event-stream where each event is a JSON-encoded
    dict with type: 'text', 'done', or 'error'.
    """
    return StreamingResponse(
        _chat_generator(req.message, req.system, req.history, req.vault_path, req.current_path),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
