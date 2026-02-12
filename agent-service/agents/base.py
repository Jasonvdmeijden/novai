"""
BaseAgent — abstract base class for all NovAI writing agents.

Subclasses must implement:
    system_prompt(params)  → str
    build_messages(task)   → list[dict]

The public entry point is run(), an async generator that:
  1. Emits TaskProgressEvent(type="progress") as work proceeds
  2. Calls Claude via host-proxy in a tool-use loop
  3. Emits TaskProgressEvent(type="output") when Claude produces text
  4. Emits TaskProgressEvent(type="complete") when finished
  5. Emits TaskProgressEvent(type="error") on failure
  6. Honours a cancel_event to abort early

Tool routing
  Tools are executed via /internal/tool callback to agent container
"""
import asyncio
import json
import sqlite3
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

import httpx

from config import settings
from models.schemas import AgentTask, TaskProgressEvent, TaskStatus, WritingParameters
from tasks.store import update_task_status
from tools.writing_tools import CUSTOM_TOOLS, CUSTOM_TOOL_NAMES, execute_tool


class BaseAgent(ABC):
    """Abstract base for all NovAI agents."""

    def __init__(self) -> None:
        pass  # Claude Agent SDK loads credentials from ~/.claude.json

    # ── Abstract interface ────────────────────────────────────────────────────

    @abstractmethod
    def system_prompt(self, params: WritingParameters | None) -> str:
        """Return the system prompt for this agent type."""

    @abstractmethod
    def build_messages(self, task: AgentTask) -> list[dict[str, Any]]:
        """
        Return the initial user message(s) to seed the conversation.
        Each item must be a valid Anthropic messages-API message dict.
        """

    # ── Optional extension point ──────────────────────────────────────────────

    async def _execute_mcp_tool(
        self, tool_name: str, tool_input: dict, context: dict
    ) -> str:
        """
        Handle a tool call that is NOT in CUSTOM_TOOL_NAMES.

        Default raises ValueError. Subclasses with an active MCP session
        should override this to forward the call to the MCP server.
        """
        raise ValueError(
            f"Tool '{tool_name}' is not a known custom tool and no MCP session is active."
        )

    # ── Main entry point ──────────────────────────────────────────────────────

    async def run(
        self,
        task: AgentTask,
        cancel_event: asyncio.Event,
        params: WritingParameters | None = None,
    ) -> AsyncGenerator[TaskProgressEvent, None]:
        """
        Execute the agent task, yielding progress events.

        Usage::

            async for event in agent.run(task, cancel_event, params):
                # stream event to client
        """
        return self._run(task, cancel_event, params)

    async def _run(
        self,
        task: AgentTask,
        cancel_event: asyncio.Event,
        params: WritingParameters | None,
    ) -> AsyncGenerator[TaskProgressEvent, None]:
        context = {
            "project_id": task.project_id,
            "task_id": task.id,
            "db_path": settings.db_path,
        }

        update_task_status(task.id, TaskStatus.RUNNING, progress=0.0, progress_message="Starting")

        yield TaskProgressEvent(
            type="progress",
            task_id=task.id,
            progress=0.0,
            message="Starting task",
        )

        system = self.system_prompt(params)
        messages = self.build_messages(task)
        user_message = messages[-1]["content"] if messages else ""
        accumulated_output: list[str] = []

        try:
            # Check for cancellation before starting
            if cancel_event.is_set():
                update_task_status(task.id, TaskStatus.CANCELLED, progress_message="Cancelled by user")
                yield TaskProgressEvent(
                    type="error",
                    task_id=task.id,
                    error="Task cancelled by user",
                )
                return

            # Call host-proxy with tool support
            round_num = 0
            progress = 0.1

            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream(
                    "POST",
                    f"{settings.host_proxy_url}/run-agent",
                    json={
                        "user_message": user_message,
                        "system": system,
                        "tools": CUSTOM_TOOLS,
                        "context": context,
                        "max_turns": 20,
                    },
                ) as response:
                    if response.status_code != 200:
                        raise Exception(f"Host proxy returned {response.status_code}")

                    async for line in response.aiter_lines():
                        # Check for cancellation on each line
                        if cancel_event.is_set():
                            update_task_status(task.id, TaskStatus.CANCELLED, progress_message="Cancelled by user")
                            yield TaskProgressEvent(
                                type="error",
                                task_id=task.id,
                                error="Task cancelled by user",
                            )
                            return

                        # Skip empty lines between SSE events
                        if not line or not line.startswith("data: "):
                            continue

                        # Parse SSE event
                        try:
                            json_str = line[6:]  # Remove "data: " prefix
                            event = json.loads(json_str)
                        except json.JSONDecodeError:
                            continue

                        event_type = event.get("type")

                        if event_type == "output":
                            accumulated_output.append(event.get("content", ""))
                            yield TaskProgressEvent(
                                type="output",
                                task_id=task.id,
                                content=event.get("content", ""),
                            )
                        elif event_type == "progress":
                            round_num += 1
                            progress = min(0.1 + round_num * 0.1, 0.9)
                            update_task_status(
                                task.id,
                                TaskStatus.RUNNING,
                                progress=progress,
                                progress_message=event.get("message", "Processing"),
                            )
                            yield TaskProgressEvent(
                                type="progress",
                                task_id=task.id,
                                progress=progress,
                                message=event.get("message", "Processing"),
                            )
                        elif event_type == "complete":
                            accumulated_output.append(event.get("content", ""))
                            break
                        elif event_type == "error":
                            raise Exception(event.get("error", "Unknown error"))

            # ── Task complete ─────────────────────────────────────────────
            final_output = "\n\n".join(accumulated_output)
            update_task_status(
                task.id,
                TaskStatus.COMPLETED,
                progress=1.0,
                progress_message="Done",
                output=final_output,
            )
            yield TaskProgressEvent(
                type="complete",
                task_id=task.id,
                progress=1.0,
                message="Task completed",
                content=final_output,
            )

        except asyncio.CancelledError:
            update_task_status(task.id, TaskStatus.CANCELLED, progress_message="Cancelled")
            yield TaskProgressEvent(
                type="error",
                task_id=task.id,
                error="Task cancelled",
            )
            raise

        except Exception as exc:
            error_msg = str(exc)
            update_task_status(
                task.id,
                TaskStatus.FAILED,
                progress_message="Failed",
                error=error_msg,
            )
            yield TaskProgressEvent(
                type="error",
                task_id=task.id,
                error=error_msg,
            )

    # ── Helpers for subclasses ────────────────────────────────────────────────

    @staticmethod
    def _params_summary(params: WritingParameters | None) -> str:
        """Return a compact writing-params block for embedding in system prompts."""
        if params is None:
            return ""
        lines = [
            "## Writing Parameters",
            f"- Genre: {params.genre}",
            f"- Tone: {params.tone}",
            f"- POV: {params.pov}",
            f"- Tense: {params.tense}",
            f"- Style: {params.style}",
            f"- Pacing: {params.pacing}",
            f"- Dialogue: {params.dialogue_style}",
            f"- Language: {params.language}",
            f"- Target chapter length: {params.chapter_target_words:,} words",
        ]
        if params.custom_instructions:
            lines.append(f"- Custom instructions: {params.custom_instructions}")
        if params.style_references:
            lines.append(f"- Style references: {params.style_references}")
        return "\n".join(lines)

    @staticmethod
    def _load_writing_params(project_id: str) -> WritingParameters | None:
        """Fetch writing parameters from the shared SQLite DB."""
        conn = sqlite3.connect(settings.db_path)
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM writing_parameters WHERE project_id = ?", (project_id,)
        ).fetchone()
        conn.close()
        if not row:
            return None
        return WritingParameters(
            id=row["id"],
            project_id=row["project_id"],
            genre=row["genre"],
            tone=row["tone"],
            pov=row["pov"],
            tense=row["tense"],
            style=row["style"],
            pacing=row["pacing"],
            dialogue_style=row["dialogue_style"],
            language=row["language"],
            chapter_target_words=row["chapter_target_words"],
            custom_instructions=row["custom_instructions"],
            style_references=row["style_references"],
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )
