"""
ChapterWriterAgent — writes a full chapter draft to the vault.

Expected task.input keys:
    chapter_number  : int    — 1-based chapter index
    title           : str    — chapter title
    file_path       : str    — vault-relative path to save, e.g. "04-Chapters/Chapter-01.md"
    brief           : str    — plot points / scene beats to cover
    context_files   : list[str]  — (optional) vault paths to read for continuity
"""
from typing import Any

from agents.base import BaseAgent
from models.schemas import AgentTask, WritingParameters


class ChapterWriterAgent(BaseAgent):

    def system_prompt(self, params: WritingParameters | None) -> str:
        base = (
            "You are NovAI, an expert fiction author assisting with a novel. "
            "Your job is to write a complete, polished chapter draft that fits "
            "seamlessly into the existing story.\n\n"
            "Guidelines:\n"
            "- Follow the provided brief exactly — hit every plot point and beat\n"
            "- Maintain consistent characterisation with any context files supplied\n"
            "- Write vivid, immersive prose — show, don't tell\n"
            "- End each chapter with a hook that pulls the reader forward\n"
            "- Use save_chapter to persist your work when the draft is complete\n"
            "- Call get_writing_parameters first to confirm style requirements\n"
            "- Call check_continuity with any relevant character/world files before writing\n"
        )
        if params:
            base += "\n" + self._params_summary(params)
        return base

    def build_messages(self, task: AgentTask) -> list[dict[str, Any]]:
        inp = task.input
        chapter_number = inp.get("chapter_number", 1)
        title = inp.get("title", f"Chapter {chapter_number}")
        file_path = inp.get("file_path", f"04-Chapters/Chapter-{chapter_number:02d}.md")
        brief = inp.get("brief", "")
        context_files: list[str] = inp.get("context_files", [])

        context_note = (
            f"\nRelevant vault files for continuity: {context_files}"
            if context_files
            else ""
        )

        return [
            {
                "role": "user",
                "content": (
                    f"Write Chapter {chapter_number}: \"{title}\"\n\n"
                    f"**Scene brief / plot beats:**\n{brief}\n"
                    f"{context_note}\n\n"
                    f"Save the finished draft to: `{file_path}`\n\n"
                    "Start by calling get_writing_parameters, then check_continuity "
                    "if context files were provided, then write and save the chapter."
                ),
            }
        ]
