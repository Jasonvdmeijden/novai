import json
import sqlite3
from datetime import datetime, timezone

from models.schemas import AgentTask, TaskStatus


_db_path: str = ""


def init_db(db_path: str) -> None:
    global _db_path
    _db_path = db_path
    conn = _get_conn()
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS agent_tasks (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            input TEXT NOT NULL DEFAULT '{}',
            output TEXT,
            progress REAL NOT NULL DEFAULT 0,
            progress_message TEXT NOT NULL DEFAULT '',
            error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path)
    conn.row_factory = sqlite3.Row
    return conn


def create_task(task: AgentTask) -> None:
    conn = _get_conn()
    conn.execute(
        """INSERT INTO agent_tasks (id, project_id, type, status, input, output,
           progress, progress_message, error, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            task.id,
            task.project_id,
            task.type,
            task.status,
            json.dumps(task.input),
            task.output,
            task.progress,
            task.progress_message,
            task.error,
            task.created_at.isoformat(),
            task.updated_at.isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def get_task(task_id: str) -> AgentTask | None:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM agent_tasks WHERE id = ?", (task_id,)).fetchone()
    conn.close()
    if not row:
        return None
    return _row_to_task(row)


def update_task_status(
    task_id: str,
    status: TaskStatus,
    progress: float | None = None,
    progress_message: str | None = None,
    output: str | None = None,
    error: str | None = None,
) -> None:
    conn = _get_conn()
    updates = ["status = ?", "updated_at = ?"]
    params: list = [status, datetime.now(timezone.utc).isoformat()]

    if progress is not None:
        updates.append("progress = ?")
        params.append(progress)
    if progress_message is not None:
        updates.append("progress_message = ?")
        params.append(progress_message)
    if output is not None:
        updates.append("output = ?")
        params.append(output)
    if error is not None:
        updates.append("error = ?")
        params.append(error)

    params.append(task_id)
    conn.execute(f"UPDATE agent_tasks SET {', '.join(updates)} WHERE id = ?", params)
    conn.commit()
    conn.close()


def _row_to_task(row: sqlite3.Row) -> AgentTask:
    return AgentTask(
        id=row["id"],
        project_id=row["project_id"],
        type=row["type"],
        status=row["status"],
        input=json.loads(row["input"]),
        output=row["output"],
        progress=row["progress"],
        progress_message=row["progress_message"],
        error=row["error"],
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )
