"""
OutlinerAgent — creates or expands a structured book outline.

Expected task.input keys:
    premise         : str    — one-paragraph story premise
    file_path       : str    — vault-relative path, e.g. "01-Overview/Outline.md"
    chapter_count   : int    — (optional) target number of chapters, default 20
    existing_outline: str    — (optional) partial outline to expand
    context_files   : list[str]  — (optional) synopsis / character / world files
"""
from typing import Any

from agents.base import BaseAgent
from models.schemas import AgentTask, WritingParameters


class OutlinerAgent(BaseAgent):

    def system_prompt(self, params: WritingParameters | None) -> str:
        base = (
            "You are NovAI, an expert story structure consultant. "
            "Your job is to build a compelling, well-paced outline that gives "
            "the author a clear roadmap for writing their novel.\n\n"
            "A strong outline includes:\n"
            "- Three-act structure (or appropriate alternative) clearly marked\n"
            "- Each chapter: number, title, POV character, key events, emotional beat\n"
            "- Major turning points: inciting incident, midpoint, dark night, climax\n"
            "- Character arc checkpoints woven through the plot\n"
            "- Subplots tracked across chapters\n"
            "- Cliffhangers and chapter hooks noted\n\n"
            "Use check_continuity to review any existing synopsis, character, or "
            "world files before building the outline. "
            "Save the outline with save_chapter (use the outline file path).\n"
        )
        if params:
            base += "\n" + self._params_summary(params)
        return base

    def build_messages(self, task: AgentTask) -> list[dict[str, Any]]:
        inp = task.input
        premise = inp.get("premise", "")
        file_path = inp.get("file_path", "01-Overview/Outline.md")
        chapter_count = inp.get("chapter_count", 20)
        existing_outline = inp.get("existing_outline", "")
        context_files: list[str] = inp.get("context_files", [])

        premise_section = f"**Premise:**\n{premise}\n\n" if premise else ""
        existing_section = (
            f"**Existing outline to expand / revise:**\n{existing_outline}\n\n"
            if existing_outline
            else ""
        )
        context_note = (
            f"**Context files to review first:** {context_files}\n\n"
            if context_files
            else ""
        )

        return [
            {
                "role": "user",
                "content": (
                    f"{premise_section}"
                    f"Create a detailed {chapter_count}-chapter outline for this novel.\n\n"
                    f"{existing_section}{context_note}"
                    f"Save the outline to: `{file_path}`\n\n"
                    "Start by calling get_writing_parameters, then check_continuity "
                    "if context files were provided, then write and save the outline."
                ),
            }
        ]
