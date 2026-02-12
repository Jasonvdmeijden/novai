import os
from pathlib import Path

import yaml

from config import settings
from models.schemas import VaultDocument


def get_vault_path(*segments: str) -> Path:
    base = Path(settings.vault_path)
    resolved = (base / Path(*segments)).resolve()
    if not str(resolved).startswith(str(base.resolve())):
        raise ValueError("Path traversal detected")
    return resolved


def list_markdown_files(subpath: str = "") -> list[str]:
    root = get_vault_path(subpath) if subpath else get_vault_path()
    if not root.exists():
        return []
    return sorted(
        str(p.relative_to(get_vault_path()))
        for p in root.rglob("*.md")
        if not p.name.startswith(".")
    )


def read_document(file_path: str) -> VaultDocument:
    full_path = get_vault_path(file_path)
    raw = full_path.read_text(encoding="utf-8")
    frontmatter: dict = {}
    body = raw

    if raw.startswith("---"):
        parts = raw.split("---", 2)
        if len(parts) >= 3:
            try:
                frontmatter = yaml.safe_load(parts[1]) or {}
            except yaml.YAMLError:
                pass
            body = parts[2].strip()

    return VaultDocument(
        path=file_path,
        content=raw,
        frontmatter=frontmatter,
        body=body,
    )


def read_multiple(file_paths: list[str]) -> list[VaultDocument]:
    return [read_document(p) for p in file_paths if get_vault_path(p).exists()]
