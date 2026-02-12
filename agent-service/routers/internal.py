"""
Internal router for tool execution callbacks from host-proxy.

Routes
------
POST   /internal/tool    — execute a tool and return result

Allows the host-proxy to call back into the agent container to execute
tools (get_writing_parameters, save_chapter, etc.) which need access to
/vault and /data/novai.db that are only available inside the container.
"""
import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from tools.writing_tools import execute_tool

logger = logging.getLogger(__name__)

router = APIRouter()


class ToolRequest(BaseModel):
    """Request body for /internal/tool endpoint."""
    tool_name: str
    tool_input: dict[str, Any]
    context: dict[str, Any]


@router.post("/internal/tool")
async def execute_tool_endpoint(req: ToolRequest) -> dict[str, Any]:
    """
    Execute a tool and return the result.

    The host-proxy calls this when Claude uses a tool.
    """
    try:
        result = execute_tool(req.tool_name, req.tool_input, req.context)
        return {"status": "ok", "result": result}
    except Exception as exc:
        error_msg = str(exc)
        logger.error(f"Tool execution failed: {error_msg}")
        return {"status": "error", "error": error_msg}
