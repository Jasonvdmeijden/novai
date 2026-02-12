"""
Custom in-process writing tools available to all NovAI agents.

These are exposed to Claude as Anthropic-format tool definitions. When Claude
calls one, execute_tool() dispatches to the matching Python function.

Each handler receives:
    tool_input : dict — the arguments Claude passed
    context    : dict — runtime context (project_id, task_id, db_path)
"""
import json
import sqlite3
from datetime import datetime, timezone
from typing import Any

from vault.reader import get_vault_path, list_markdown_files, read_document
from vault.writer import write_with_frontmatter, read_before_write


# ── Tool Definitions (Anthropic schema format) ──────────────────────────────

CUSTOM_TOOLS: list[dict[str, Any]] = [
    {
        "name": "get_writing_parameters",
        "description": (
            "Retrieve the writing style parameters configured for this project, "
            "including genre, tone, POV, tense, style, pacing, dialogue style, "
            "language, target word count, and any custom instructions. "
            "Call this at the start of every writing task."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "save_chapter",
        "description": (
            "Save a completed or in-progress chapter draft to the Obsidian vault. "
            "The file is written to the project's chapters folder. "
            "Existing content is overwritten; a snapshot is captured automatically."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": (
                        "Vault-relative path for the chapter file, e.g. "
                        "'04-Chapters/Chapter-01.md'."
                    ),
                },
                "title": {
                    "type": "string",
                    "description": "Chapter title used in the file's frontmatter.",
                },
                "chapter_number": {
                    "type": "integer",
                    "description": "Numeric chapter index (1-based).",
                },
                "content": {
                    "type": "string",
                    "description": "Full chapter prose to save.",
                },
                "word_count": {
                    "type": "integer",
                    "description": "Approximate word count of the content.",
                },
                "status": {
                    "type": "string",
                    "enum": ["draft", "revised", "final"],
                    "description": "Draft status tag.",
                },
            },
            "required": ["file_path", "title", "chapter_number", "content"],
        },
    },
    {
        "name": "update_progress",
        "description": (
            "Append a timestamped progress note to the project's Notes folder. "
            "Use this to log milestones, decisions, or issues discovered during "
            "a long-running task so the user can see what happened."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "note": {
                    "type": "string",
                    "description": "The progress message to record.",
                },
                "category": {
                    "type": "string",
                    "enum": ["milestone", "decision", "issue", "info"],
                    "description": "Category tag for the note.",
                },
            },
            "required": ["note"],
        },
    },
    {
        "name": "check_continuity",
        "description": (
            "Read a set of vault files and return their combined contents so you "
            "can check for continuity issues — character names, timeline, "
            "world-building facts, etc. Provide a list of relevant file paths."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "file_paths": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": (
                        "Vault-relative paths of the files to read, e.g. "
                        "['02-Characters/Hero.md', '04-Chapters/Chapter-01.md']."
                    ),
                },
            },
            "required": ["file_paths"],
        },
    },
]


# ── Handlers ─────────────────────────────────────────────────────────────────

def _get_writing_parameters(tool_input: dict, context: dict) -> dict:
    project_id = context["project_id"]
    db_path = context["db_path"]

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM writing_parameters WHERE project_id = ?", (project_id,)
    ).fetchone()
    conn.close()

    if not row:
        return {"error": f"No writing parameters found for project {project_id}"}

    return {
        "genre": row["genre"],
        "tone": row["tone"],
        "pov": row["pov"],
        "tense": row["tense"],
        "style": row["style"],
        "pacing": row["pacing"],
        "dialogue_style": row["dialogue_style"],
        "language": row["language"],
        "chapter_target_words": row["chapter_target_words"],
        "custom_instructions": row["custom_instructions"],
        "style_references": row["style_references"],
    }


def _save_chapter(tool_input: dict, context: dict) -> dict:
    file_path: str = tool_input["file_path"]
    title: str = tool_input["title"]
    chapter_number: int = tool_input["chapter_number"]
    content: str = tool_input["content"]
    word_count: int = tool_input.get("word_count", len(content.split()))
    status: str = tool_input.get("status", "draft")

    # Capture snapshot of existing content for undo support
    existing = read_before_write(file_path)

    frontmatter = {
        "title": title,
        "chapter": chapter_number,
        "status": status,
        "word_count": word_count,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    write_with_frontmatter(file_path, frontmatter, content)

    # Persist snapshot to DB if we had prior content
    if existing is not None:
        _record_snapshot(
            context["project_id"],
            context.get("task_id"),
            file_path,
            existing,
            content,
            context["db_path"],
        )

    return {
        "saved": True,
        "file_path": file_path,
        "word_count": word_count,
        "status": status,
    }


def _update_progress(tool_input: dict, context: dict) -> dict:
    note: str = tool_input["note"]
    category: str = tool_input.get("category", "info")
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    progress_file = "05-Notes/task-progress.md"

    # Append to existing log or create a new one
    existing = read_before_write(progress_file)
    entry = f"\n## [{timestamp}] ({category})\n\n{note}\n"
    new_content = (existing or "# Task Progress Log\n") + entry

    vault_path = get_vault_path(progress_file)
    vault_path.parent.mkdir(parents=True, exist_ok=True)
    vault_path.write_text(new_content, encoding="utf-8")

    return {"logged": True, "file_path": progress_file, "category": category}


def _check_continuity(tool_input: dict, context: dict) -> dict:
    file_paths: list[str] = tool_input["file_paths"]
    results: list[dict] = []
    errors: list[str] = []

    for path in file_paths:
        try:
            doc = read_document(path)
            results.append({"path": path, "content": doc.body})
        except FileNotFoundError:
            errors.append(f"Not found: {path}")
        except Exception as exc:
            errors.append(f"Error reading {path}: {exc}")

    return {"files": results, "errors": errors, "count": len(results)}


# ── Snapshot helper ───────────────────────────────────────────────────────────

def _record_snapshot(
    project_id: str,
    task_id: str | None,
    file_path: str,
    content_before: str,
    content_after: str,
    db_path: str,
) -> None:
    import uuid
    conn = sqlite3.connect(db_path)
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """INSERT INTO vault_snapshots
           (id, project_id, task_id, file_path, content_before, content_after, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (str(uuid.uuid4()), project_id, task_id, file_path, content_before, content_after, now),
    )
    conn.commit()
    conn.close()


# ── Dispatcher ────────────────────────────────────────────────────────────────

_HANDLERS = {
    "get_writing_parameters": _get_writing_parameters,
    "save_chapter": _save_chapter,
    "update_progress": _update_progress,
    "check_continuity": _check_continuity,
}

CUSTOM_TOOL_NAMES: frozenset[str] = frozenset(_HANDLERS)


def execute_tool(tool_name: str, tool_input: dict, context: dict) -> str:
    """
    Dispatch a tool call to the matching handler.

    Returns a JSON string suitable for inclusion in a tool_result message.
    Raises ValueError for unknown tools.
    """
    handler = _HANDLERS.get(tool_name)
    if handler is None:
        raise ValueError(f"Unknown writing tool: {tool_name!r}")
    result = handler(tool_input, context)
    return json.dumps(result, ensure_ascii=False)
