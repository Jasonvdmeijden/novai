"""
ResearcherAgent — researches a topic relevant to the book and saves findings.

Expected task.input keys:
    topic           : str    — research subject, e.g. "Medieval siege warfare"
    file_path       : str    — vault-relative path to save findings
    questions       : list[str]  — (optional) specific questions to answer
    context_files   : list[str]  — (optional) existing notes to build upon
    depth           : str    — "brief" | "standard" | "deep" (default: "standard")
"""
from typing import Any

from agents.base import BaseAgent
from models.schemas import AgentTask, WritingParameters


_DEPTH_GUIDANCE = {
    "brief": (
        "Provide a concise 300–500 word overview covering the most essential facts "
        "an author needs to write convincingly about this topic."
    ),
    "standard": (
        "Provide a thorough 800–1200 word reference document covering key facts, "
        "interesting details, common misconceptions, and story-relevant angles."
    ),
    "deep": (
        "Provide a comprehensive 1500+ word reference with detailed analysis, "
        "historical context, multiple perspectives, specific examples, and a "
        "bibliography-style list of further reading suggestions."
    ),
}


class ResearcherAgent(BaseAgent):

    def system_prompt(self, params: WritingParameters | None) -> str:
        base = (
            "You are NovAI, a research assistant specialising in helping fiction "
            "authors write with authenticity and accuracy.\n\n"
            "Research principles:\n"
            "- Draw on your training knowledge — be factual and precise\n"
            "- Highlight aspects most useful for storytelling\n"
            "- Note where authors typically make mistakes\n"
            "- Suggest specific details that add verisimilitude\n"
            "- Flag areas where you are uncertain so the author can verify\n"
            "- Organise findings with clear headings for easy reference\n\n"
            "Use check_continuity to review any existing notes on the topic first. "
            "Save your research with save_chapter (use the research file path).\n"
        )
        if params:
            base += "\n" + self._params_summary(params)
        return base

    def build_messages(self, task: AgentTask) -> list[dict[str, Any]]:
        inp = task.input
        topic = inp.get("topic", "Research Topic")
        file_path = inp.get(
            "file_path",
            f"06-Reference/{topic.replace(' ', '-')}.md",
        )
        questions: list[str] = inp.get("questions", [])
        context_files: list[str] = inp.get("context_files", [])
        depth = inp.get("depth", "standard")

        depth_note = _DEPTH_GUIDANCE.get(depth, _DEPTH_GUIDANCE["standard"])

        questions_section = ""
        if questions:
            q_lines = "\n".join(f"- {q}" for q in questions)
            questions_section = f"\n**Specific questions to answer:**\n{q_lines}\n"

        context_note = (
            f"\n**Existing notes to build upon:** {context_files}"
            if context_files
            else ""
        )

        return [
            {
                "role": "user",
                "content": (
                    f"Research this topic for a fiction author: **{topic}**\n\n"
                    f"**Depth:** {depth} — {depth_note}\n"
                    f"{questions_section}{context_note}\n\n"
                    f"Save your findings to: `{file_path}`\n\n"
                    "Start by calling get_writing_parameters to understand the story's "
                    "genre and setting, then check_continuity if existing notes were "
                    "provided, then write and save the research document."
                ),
            }
        ]
