// ── Project ──────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  description: string;
  vault_subfolder: string;
  created_at: string;
  updated_at: string;
}

// ── Writing Parameters ──────────────────────────────
export interface WritingParameters {
  id: string;
  project_id: string;
  genre: string;
  tone: string;
  pov: string;
  tense: string;
  style: string;
  pacing: string;
  dialogue_style: string;
  language: string;
  chapter_target_words: number;
  custom_instructions: string;
  style_references: string;
  updated_at: string;
}

export const GENRES = [
  "Fantasy", "Sci-Fi", "Romance", "Thriller", "Mystery",
  "Horror", "Literary Fiction", "Historical Fiction",
  "Young Adult", "Middle Grade", "Memoir", "Non-Fiction",
] as const;

export const TONES = [
  "Dark", "Light", "Humorous", "Serious", "Whimsical",
  "Gritty", "Lyrical", "Suspenseful", "Romantic", "Melancholic",
] as const;

export const POVS = [
  "First Person", "Second Person", "Third Person Limited",
  "Third Person Omniscient", "Multiple POV",
] as const;

export const TENSES = ["Past", "Present"] as const;

export const STYLES = [
  "Minimalist", "Descriptive", "Conversational", "Formal",
  "Poetic", "Cinematic", "Stream of Consciousness",
] as const;

export const PACINGS = ["Slow", "Moderate", "Fast", "Variable"] as const;

export const DIALOGUE_STYLES = [
  "Naturalistic", "Stylized", "Sparse", "Heavy", "Subtext-Heavy",
] as const;

// ── Chat ────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  project_id: string;
  role: "user" | "assistant";
  content: string;
  context_files: string[];
  created_at: string;
}

// ── Agent Tasks ─────────────────────────────────────
export type TaskType =
  | "chapter_write"
  | "chapter_edit"
  | "character_develop"
  | "worldbuild"
  | "outline"
  | "continuity_check";

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface AgentTask {
  id: string;
  project_id: string;
  type: TaskType;
  status: TaskStatus;
  input: Record<string, unknown>;
  output: string | null;
  progress: number;
  progress_message: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

// ── SSE Events ──────────────────────────────────────
export interface TaskProgressEvent {
  type: "progress" | "output" | "complete" | "error";
  task_id: string;
  progress?: number;
  message?: string;
  content?: string;
  error?: string;
}

// ── Vault ───────────────────────────────────────────
export interface VaultFile {
  path: string;
  name: string;
  type: "file" | "directory";
  children?: VaultFile[];
}

export interface VaultDocument {
  path: string;
  content: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

export type VaultCategory =
  | "overview"
  | "characters"
  | "worldbuilding"
  | "chapters"
  | "notes"
  | "reference";

export interface VaultMapping {
  id: string;
  project_id: string;
  category: VaultCategory;
  vault_folder: string;
}

// ── Vault Snapshots ─────────────────────────────────
export interface VaultSnapshot {
  id: string;
  project_id: string;
  task_id: string | null;
  file_path: string;
  content_before: string;
  content_after: string;
  created_at: string;
}
