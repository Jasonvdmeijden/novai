import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join("/data", "novai.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      vault_subfolder TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS writing_parameters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
      genre TEXT NOT NULL DEFAULT 'Fantasy',
      tone TEXT NOT NULL DEFAULT 'Serious',
      pov TEXT NOT NULL DEFAULT 'Third Person Limited',
      tense TEXT NOT NULL DEFAULT 'Past',
      style TEXT NOT NULL DEFAULT 'Descriptive',
      pacing TEXT NOT NULL DEFAULT 'Moderate',
      dialogue_style TEXT NOT NULL DEFAULT 'Naturalistic',
      language TEXT NOT NULL DEFAULT 'English',
      chapter_target_words INTEGER NOT NULL DEFAULT 3000,
      custom_instructions TEXT NOT NULL DEFAULT '',
      style_references TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      context_files TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      input TEXT NOT NULL DEFAULT '{}',
      output TEXT,
      progress REAL NOT NULL DEFAULT 0,
      progress_message TEXT NOT NULL DEFAULT '',
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vault_mappings (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      vault_folder TEXT NOT NULL,
      UNIQUE(project_id, category)
    );

    CREATE TABLE IF NOT EXISTS vault_snapshots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_id TEXT REFERENCES agent_tasks(id),
      file_path TEXT NOT NULL,
      content_before TEXT NOT NULL,
      content_after TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_project ON chat_messages(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON agent_tasks(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_snapshots_project ON vault_snapshots(project_id, created_at);
  `);
}
