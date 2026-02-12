"""
WorldbuilderAgent — creates detailed worldbuilding content for a specific topic.

Expected task.input keys:
    topic           : str    — subject to build out, e.g. "Magic System", "The Capital City"
    category        : str    — "geography" | "culture" | "history" | "magic" | "technology" | "religion" | "other"
    file_path       : str    — vault-relative path, e.g. "03-Worldbuilding/Magic-System.md"
    brief           : str    — (optional) seed notes / constraints
    context_files   : list[str]  — (optional) related world files for consistency
"""
from typing import Any

from agents.base import BaseAgent
from models.schemas import AgentTask, WritingParameters


_CATEGORY_FOCUS = {
    "geography": (
        "physical landscape, climate, regions, maps, travel distances, "
        "natural resources, and how the environment shapes culture"
    ),
    "culture": (
        "society structure, customs, traditions, arts, food, fashion, "
        "language quirks, holidays, values, and taboos"
    ),
    "history": (
        "key historical events, wars, dynasties, turning points, myths, "
        "legendary figures, and how the past shapes the present"
    ),
    "magic": (
        "rules of the magic system, costs and limitations, who can use it, "
        "how it's learned, cultural attitudes toward it, and its role in the plot"
    ),
    "technology": (
        "level of technological development, key inventions, how technology "
        "affects daily life, military applications, and social implications"
    ),
    "religion": (
        "belief systems, deities or cosmology, rituals, clergy structure, "
        "holy sites, conflicts between faiths, and how religion drives characters"
    ),
    "other": "all relevant aspects of this topic in thorough detail",
}


class WorldbuilderAgent(BaseAgent):

    def system_prompt(self, params: WritingParameters | None) -> str:
        base = (
            "You are NovAI, an expert worldbuilder for fiction. "
            "Your job is to create rich, internally consistent world details "
            "that deepen the story and make the setting feel real.\n\n"
            "Good worldbuilding:\n"
            "- Has internal logic — rules exist for a reason\n"
            "- Connects to the story's themes and conflicts\n"
            "- Reveals character through culture and history\n"
            "- Avoids info-dumps — details should feel lived-in\n"
            "- Leaves room for mystery and discovery\n\n"
            "Use check_continuity to review related world files first. "
            "Save your work with save_chapter (use the worldbuilding file path).\n"
        )
        if params:
            base += "\n" + self._params_summary(params)
        return base

    def build_messages(self, task: AgentTask) -> list[dict[str, Any]]:
        inp = task.input
        topic = inp.get("topic", "Worldbuilding Topic")
        category = inp.get("category", "other")
        file_path = inp.get(
            "file_path",
            f"03-Worldbuilding/{topic.replace(' ', '-')}.md",
        )
        brief = inp.get("brief", "")
        context_files: list[str] = inp.get("context_files", [])

        focus = _CATEGORY_FOCUS.get(category, _CATEGORY_FOCUS["other"])
        brief_note = f"**Seed notes / constraints:**\n{brief}\n\n" if brief else ""
        context_note = (
            f"**Related world files to check first:** {context_files}\n\n"
            if context_files
            else ""
        )

        return [
            {
                "role": "user",
                "content": (
                    f"Build out the worldbuilding entry for: **{topic}**\n\n"
                    f"**Category:** {category}\n"
                    f"**Focus areas:** {focus}\n\n"
                    f"{brief_note}{context_note}"
                    f"Save the result to: `{file_path}`\n\n"
                    "Start by calling get_writing_parameters to match the story's genre "
                    "and tone, then check_continuity if context files were provided, "
                    "then write and save the worldbuilding document."
                ),
            }
        ]
