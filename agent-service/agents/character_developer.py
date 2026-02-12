"""
CharacterDeveloperAgent — builds out a full character profile in the vault.

Expected task.input keys:
    name            : str    — character's name
    file_path       : str    — vault-relative path, e.g. "02-Characters/Hero.md"
    role            : str    — (optional) story role, e.g. "protagonist"
    brief           : str    — (optional) seed description / known facts
    context_files   : list[str]  — (optional) existing character / world files for consistency
"""
from typing import Any

from agents.base import BaseAgent
from models.schemas import AgentTask, WritingParameters


class CharacterDeveloperAgent(BaseAgent):

    def system_prompt(self, params: WritingParameters | None) -> str:
        base = (
            "You are NovAI, an expert character designer for fiction. "
            "Your job is to develop rich, three-dimensional characters that feel "
            "authentic and serve the story.\n\n"
            "A complete character profile includes:\n"
            "- Physical description (appearance, mannerisms, voice)\n"
            "- Backstory and formative experiences\n"
            "- Personality traits, strengths, and flaws\n"
            "- Goals, motivations, and fears\n"
            "- Relationships to other characters\n"
            "- Character arc (how they change over the story)\n"
            "- Speech patterns and distinctive verbal quirks\n\n"
            "Use check_continuity to review existing characters before writing "
            "to avoid contradictions. "
            "Save the completed profile with save_chapter (use the character file path).\n"
        )
        if params:
            base += "\n" + self._params_summary(params)
        return base

    def build_messages(self, task: AgentTask) -> list[dict[str, Any]]:
        inp = task.input
        name = inp.get("name", "Unnamed Character")
        file_path = inp.get("file_path", f"02-Characters/{name.replace(' ', '-')}.md")
        role = inp.get("role", "")
        brief = inp.get("brief", "")
        context_files: list[str] = inp.get("context_files", [])

        role_note = f"**Story role:** {role}\n" if role else ""
        brief_note = f"**Known facts / seed description:**\n{brief}\n" if brief else ""
        context_note = (
            f"**Existing files to check for consistency:** {context_files}\n"
            if context_files
            else ""
        )

        return [
            {
                "role": "user",
                "content": (
                    f"Develop a full character profile for: **{name}**\n\n"
                    f"{role_note}{brief_note}{context_note}\n"
                    f"Save the profile to: `{file_path}`\n\n"
                    "Start by calling get_writing_parameters to match the story's tone, "
                    "then check_continuity if context files were provided, "
                    "then write and save the complete profile."
                ),
            }
        ]
