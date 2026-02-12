"""
FastAPI router for agent task endpoints.

Routes
------
POST   /tasks/{task_type}          — submit a task, returns SSE progress stream
GET    /tasks/{task_id}/status     — poll task status (non-streaming)
POST   /tasks/{task_id}/cancel     — cancel a running task

SSE format (each event):
    data: <TaskProgressEvent JSON>\n\n
"""
import asyncio
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from agents.base import BaseAgent
from models.schemas import (
    AgentTask,
    TaskStatus,
    TaskSubmission,
    TaskType,
    WritingParameters,
)
from tasks.manager import cancel_task, get_active_task_id, run_task
from tasks.store import get_task

router = APIRouter()


# ── POST /tasks/{task_type} ───────────────────────────────────────────────────

@router.post("/{task_type}")
async def submit_task(task_type: TaskType, submission: TaskSubmission) -> StreamingResponse:
    """
    Submit a new agent task and stream its progress via Server-Sent Events.

    The response body is a text/event-stream where each event is a JSON-encoded
    TaskProgressEvent.  The stream ends after a ``complete`` or ``error`` event.

    If the project already has a running task the stream immediately returns a
    single ``error`` event with the existing task_id.
    """
    params = _load_params(submission)

    return StreamingResponse(
        _sse_generator(task_type, submission, params),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )


async def _sse_generator(
    task_type: TaskType,
    submission: TaskSubmission,
    params: WritingParameters | None,
) -> AsyncGenerator[str, None]:
    """Wrap manager.run_task output as SSE data lines."""
    try:
        async for json_str in run_task(task_type, submission, params):
            yield f"data: {json_str}\n\n"
    except asyncio.CancelledError:
        yield 'data: {"type":"error","task_id":"","error":"Stream disconnected"}\n\n'
    except Exception as exc:
        yield f'data: {{"type":"error","task_id":"","error":{_json_str(str(exc))}}}\n\n'


# ── GET /tasks/{task_id}/status ───────────────────────────────────────────────

@router.get("/{task_id}/status")
async def task_status(task_id: str) -> dict:
    """
    Return the current status of a task.  Suitable for polling when the SSE
    stream has been lost (e.g. page refresh).
    """
    task = get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id!r} not found")

    return {
        "task_id": task.id,
        "project_id": task.project_id,
        "type": task.type,
        "status": task.status,
        "progress": task.progress,
        "progress_message": task.progress_message,
        "output": task.output,
        "error": task.error,
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
    }


# ── POST /tasks/{task_id}/cancel ──────────────────────────────────────────────

@router.post("/{task_id}/cancel")
async def cancel(task_id: str) -> dict:
    """
    Signal a running task to cancel.

    Returns ``{"cancelled": true}`` if the signal was sent, or
    ``{"cancelled": false, "reason": "..."}`` if the task was not running.
    """
    task = get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id!r} not found")

    if task.status not in (TaskStatus.PENDING, TaskStatus.RUNNING):
        return {
            "cancelled": False,
            "reason": f"Task is already {task.status}",
        }

    signalled = await cancel_task(task_id)
    return {"cancelled": signalled}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_params(submission: TaskSubmission) -> WritingParameters | None:
    """
    Load writing parameters for the project, then apply any per-task overrides
    from submission.parameter_overrides.
    """
    params = BaseAgent._load_writing_params(submission.project_id)
    if params is None:
        return None

    overrides = submission.parameter_overrides
    if not overrides:
        return params

    # Apply only known WritingParameters fields
    valid_fields = WritingParameters.model_fields.keys()
    patch = {k: v for k, v in overrides.items() if k in valid_fields}
    if patch:
        params = params.model_copy(update=patch)

    return params


def _json_str(s: str) -> str:
    """Escape a plain string for safe embedding inside a JSON string literal."""
    import json
    return json.dumps(s)
