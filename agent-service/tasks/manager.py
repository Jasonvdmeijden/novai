"""
Task Manager — lifecycle management for all NovAI agent tasks.

Responsibilities:
  - Agent registry: maps TaskType → agent class
  - run_task(): creates the DB record, instantiates the agent, runs the loop,
    and yields SSE-ready JSON strings
  - cancel_task(): signals the cancel_event for a running task
  - One-active-task-per-project: rejects new submissions if the project already
    has a running task (returns the existing task_id so the caller can stream it)

Thread / concurrency model:
  Each task runs in its own asyncio Task (via asyncio.create_task).
  The cancel_event is an asyncio.Event stored in _running keyed by task_id.
  The per-project lock (_project_locks) prevents concurrent submissions.
"""
import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator

from agents import (
    BaseAgent,
    ChapterWriterAgent,
    CharacterDeveloperAgent,
    WorldbuilderAgent,
    OutlinerAgent,
    ProseEditorAgent,
    ResearcherAgent,
)
from models.schemas import (
    AgentTask,
    TaskProgressEvent,
    TaskStatus,
    TaskSubmission,
    TaskType,
    WritingParameters,
)
from tasks.store import create_task, get_task, update_task_status


# ── Agent registry ────────────────────────────────────────────────────────────

_AGENT_REGISTRY: dict[TaskType, type[BaseAgent]] = {
    TaskType.CHAPTER_WRITE: ChapterWriterAgent,
    TaskType.CHAPTER_EDIT: ProseEditorAgent,
    TaskType.CHARACTER_DEVELOP: CharacterDeveloperAgent,
    TaskType.WORLDBUILD: WorldbuilderAgent,
    TaskType.OUTLINE: OutlinerAgent,
    TaskType.CONTINUITY_CHECK: ResearcherAgent,
}

# ── Runtime state ─────────────────────────────────────────────────────────────

# task_id → cancel event for all currently-running tasks
_running: dict[str, asyncio.Event] = {}

# project_id → task_id of the currently-running task for that project
_project_active: dict[str, str] = {}

# per-project submission lock to serialise start/cancel races
_project_locks: dict[str, asyncio.Lock] = {}


def _get_project_lock(project_id: str) -> asyncio.Lock:
    if project_id not in _project_locks:
        _project_locks[project_id] = asyncio.Lock()
    return _project_locks[project_id]


# ── Public API ────────────────────────────────────────────────────────────────

async def run_task(
    task_type: TaskType,
    submission: TaskSubmission,
    params: WritingParameters | None = None,
) -> AsyncGenerator[str, None]:
    """
    Submit a new task and stream its progress as newline-delimited JSON strings.

    Each yielded string is a serialised TaskProgressEvent ready for an SSE
    ``data:`` line.  Raises ValueError if the agent type is unknown.

    If the project already has an active task, immediately yields an error event
    instead of starting a new one.
    """
    project_id = submission.project_id
    lock = _get_project_lock(project_id)

    async with lock:
        # ── Reject if project already has a running task ──────────────────
        existing_task_id = _project_active.get(project_id)
        if existing_task_id:
            yield _event_json(TaskProgressEvent(
                type="error",
                task_id=existing_task_id,
                error=(
                    f"Project already has an active task: {existing_task_id}. "
                    "Cancel it before starting a new one."
                ),
            ))
            return

        # ── Look up agent class ───────────────────────────────────────────
        agent_cls = _AGENT_REGISTRY.get(task_type)
        if agent_cls is None:
            dummy_id = str(uuid.uuid4())
            yield _event_json(TaskProgressEvent(
                type="error",
                task_id=dummy_id,
                error=f"Unknown task type: {task_type!r}",
            ))
            return

        # ── Create DB record ──────────────────────────────────────────────
        now = datetime.now(timezone.utc)
        task = AgentTask(
            id=str(uuid.uuid4()),
            project_id=project_id,
            type=task_type,
            status=TaskStatus.PENDING,
            input=submission.input,
            created_at=now,
            updated_at=now,
        )
        create_task(task)

        # ── Register as active ────────────────────────────────────────────
        cancel_event = asyncio.Event()
        _running[task.id] = cancel_event
        _project_active[project_id] = task.id

    # ── Run the agent (outside the lock so other projects aren't blocked) ─
    agent = agent_cls()
    try:
        async for event in _run_agent(agent, task, cancel_event, params):
            yield _event_json(event)
    finally:
        _running.pop(task.id, None)
        # Only clear the project slot if it still points to this task
        if _project_active.get(project_id) == task.id:
            _project_active.pop(project_id, None)


async def cancel_task(task_id: str) -> bool:
    """
    Signal a running task to cancel.

    Returns True if the task was found and signalled, False if it was not running.
    """
    event = _running.get(task_id)
    if event is None:
        # Task might already be done; mark it cancelled in DB if still running
        task = get_task(task_id)
        if task and task.status == TaskStatus.RUNNING:
            update_task_status(task_id, TaskStatus.CANCELLED, progress_message="Cancelled")
            return True
        return False
    event.set()
    return True


def get_active_task_id(project_id: str) -> str | None:
    """Return the task_id of the currently-running task for a project, or None."""
    return _project_active.get(project_id)


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _run_agent(
    agent: BaseAgent,
    task: AgentTask,
    cancel_event: asyncio.Event,
    params: WritingParameters | None,
) -> AsyncGenerator[TaskProgressEvent, None]:
    """Thin wrapper that calls agent.run() and re-yields events."""
    gen = await agent.run(task, cancel_event, params)
    async for event in gen:
        yield event


def _event_json(event: TaskProgressEvent) -> str:
    """Serialise a TaskProgressEvent to a JSON string (for SSE data lines)."""
    return event.model_dump_json(exclude_none=True)
