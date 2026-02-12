from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class TaskType(StrEnum):
    CHAPTER_WRITE = "chapter_write"
    CHAPTER_EDIT = "chapter_edit"
    CHARACTER_DEVELOP = "character_develop"
    WORLDBUILD = "worldbuild"
    OUTLINE = "outline"
    CONTINUITY_CHECK = "continuity_check"


class TaskStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Project(BaseModel):
    id: str
    name: str
    description: str = ""
    vault_subfolder: str = ""
    created_at: datetime
    updated_at: datetime


class WritingParameters(BaseModel):
    id: str
    project_id: str
    genre: str = "Fantasy"
    tone: str = "Serious"
    pov: str = "Third Person Limited"
    tense: str = "Past"
    style: str = "Descriptive"
    pacing: str = "Moderate"
    dialogue_style: str = "Naturalistic"
    language: str = "English"
    chapter_target_words: int = 3000
    custom_instructions: str = ""
    style_references: str = ""
    updated_at: datetime


class AgentTask(BaseModel):
    id: str
    project_id: str
    type: TaskType
    status: TaskStatus = TaskStatus.PENDING
    input: dict[str, Any] = Field(default_factory=dict)
    output: str | None = None
    progress: float = 0.0
    progress_message: str = ""
    error: str | None = None
    created_at: datetime
    updated_at: datetime


class TaskSubmission(BaseModel):
    project_id: str
    input: dict[str, Any] = Field(default_factory=dict)
    parameter_overrides: dict[str, Any] | None = None


class TaskProgressEvent(BaseModel):
    type: str  # progress, output, complete, error
    task_id: str
    progress: float | None = None
    message: str | None = None
    content: str | None = None
    error: str | None = None


class VaultDocument(BaseModel):
    path: str
    content: str
    frontmatter: dict[str, Any] = Field(default_factory=dict)
    body: str = ""
