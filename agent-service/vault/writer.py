import os
from pathlib import Path

import yaml

from config import settings
from vault.reader import get_vault_path


def write_document(file_path: str, content: str) -> None:
    full_path = get_vault_path(file_path)
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_text(content, encoding="utf-8")


def write_with_frontmatter(
    file_path: str, frontmatter: dict, body: str
) -> None:
    fm_str = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True).strip()
    content = f"---\n{fm_str}\n---\n\n{body}"
    write_document(file_path, content)


def read_before_write(file_path: str) -> str | None:
    full_path = get_vault_path(file_path)
    if full_path.exists():
        return full_path.read_text(encoding="utf-8")
    return None
