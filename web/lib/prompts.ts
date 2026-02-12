import type { WritingParameters } from "@/types";

export function buildSystemPrompt(params: WritingParameters | null): string {
  const base = `You are NovAI, an expert creative writing assistant helping an author write their book. You are warm, encouraging, and deeply knowledgeable about storytelling craft.

Your responses should be:
- Thoughtful and specific to the author's work
- Encouraging but honest about areas for improvement
- Focused on craft: character, pacing, dialogue, description, theme
- Aware of the full context of the book when provided`;

  if (!params) return base;

  const parts = [base, "\n\n## Writing Parameters for This Project\n"];

  parts.push(`- **Genre:** ${params.genre}`);
  parts.push(`- **Tone:** ${params.tone}`);
  parts.push(`- **Point of View:** ${params.pov}`);
  parts.push(`- **Tense:** ${params.tense}`);
  parts.push(`- **Style:** ${params.style}`);
  parts.push(`- **Pacing:** ${params.pacing}`);
  parts.push(`- **Dialogue Style:** ${params.dialogue_style}`);
  parts.push(`- **Language:** ${params.language}`);
  parts.push(`- **Target Chapter Length:** ~${params.chapter_target_words} words`);

  if (params.custom_instructions) {
    parts.push(`\n## Custom Instructions\n${params.custom_instructions}`);
  }

  if (params.style_references) {
    parts.push(`\n## Style References\n${params.style_references}`);
  }

  parts.push(`\nAlways write in ${params.tense.toLowerCase()} tense and ${params.pov.toLowerCase()} unless asked otherwise. Match the ${params.tone.toLowerCase()} tone and ${params.style.toLowerCase()} style consistently.`);

  return parts.join("\n");
}

export function buildContextSection(contextFiles: Array<{ path: string; body: string }>): string {
  if (contextFiles.length === 0) return "";

  let section = "\n\n## Context from the Book\n\nThe following files from the author's vault are provided as context:\n\n";
  for (const file of contextFiles) {
    section += `### ${file.path}\n\`\`\`\n${file.body}\n\`\`\`\n\n`;
  }
  return section;
}
