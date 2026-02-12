"""
ProseEditorAgent — edits and improves existing prose.

Expected task.input keys:
    file_path       : str    — vault-relative path of the file to edit
    content         : str    — (optional) raw prose text if not reading from vault
    focus           : list[str]  — editing priorities: "pacing" | "clarity" | "dialogue"
                                   | "show_dont_tell" | "consistency" | "line_edit"
    instructions    : str    — (optional) specific notes from the author
    context_files   : list[str]  — (optional) character/style files for reference
"""
from typing import Any

from agents.base import BaseAgent
from models.schemas import AgentTask, WritingParameters


_FOCUS_DESCRIPTIONS = {
    "pacing": "sentence rhythm, paragraph length, scene momentum — cut or expand where needed",
    "clarity": "confusing sentences, unclear pronoun references, tangled syntax",
    "dialogue": "natural speech patterns, subtext, dialogue tags, punctuation",
    "show_dont_tell": "replace telling statements with sensory details and actions",
    "consistency": "POV breaks, timeline errors, contradictions with other files",
    "line_edit": "word choice, redundancy, passive voice, clichés, flow",
}


class ProseEditorAgent(BaseAgent):

    def system_prompt(self, params: WritingParameters | None) -> str:
        base = (
            "You are NovAI, an expert fiction editor. "
            "Your job is to improve the author's prose while preserving their "
            "unique voice — enhance, don't replace.\n\n"
            "Editing principles:\n"
            "- Preserve the author's style and voice above all else\n"
            "- Make every word earn its place\n"
            "- Cut adverbs and weak verbs; strengthen with specifics\n"
            "- Ensure emotional resonance in key scenes\n"
            "- Flag (with inline comments) anything requiring the author's decision\n"
            "- After editing, provide a brief summary of the changes made\n\n"
            "Use check_continuity to review character/style references if provided. "
            "Save your edited version with save_chapter (use the original file path).\n"
        )
        if params:
            base += "\n" + self._params_summary(params)
        return base

    def build_messages(self, task: AgentTask) -> list[dict[str, Any]]:
        inp = task.input
        file_path = inp.get("file_path", "")
        content = inp.get("content", "")
        focus: list[str] = inp.get("focus", ["line_edit"])
        instructions = inp.get("instructions", "")
        context_files: list[str] = inp.get("context_files", [])

        focus_notes = "\n".join(
            f"- **{f}**: {_FOCUS_DESCRIPTIONS.get(f, f)}" for f in focus
        )
        instructions_note = (
            f"\n**Author's specific notes:**\n{instructions}\n" if instructions else ""
        )
        context_note = (
            f"\n**Reference files:** {context_files}" if context_files else ""
        )

        if content:
            prose_section = f"\n**Prose to edit:**\n\n{content}\n"
        else:
            prose_section = (
                f"\nThe prose to edit is in the vault at: `{file_path}` — "
                "use check_continuity to read it.\n"
            )

        return [
            {
                "role": "user",
                "content": (
                    f"Edit the following prose with these priorities:\n{focus_notes}\n"
                    f"{instructions_note}{prose_section}{context_note}\n\n"
                    f"Save the edited version to: `{file_path}`\n\n"
                    "Start by calling get_writing_parameters, then check_continuity "
                    "to read the file and any reference files, then edit and save."
                ),
            }
        ]
