import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { ChatMessage } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const db = getDb();
  const messages = db
    .prepare("SELECT * FROM chat_messages WHERE project_id = ? ORDER BY created_at ASC")
    .all(projectId) as ChatMessage[];

  // Parse context_files JSON
  const parsed = messages.map((m) => ({
    ...m,
    context_files: typeof m.context_files === "string" ? JSON.parse(m.context_files) : m.context_files,
  }));

  return NextResponse.json(parsed);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("DELETE FROM chat_messages WHERE project_id = ?").run(projectId);
  return NextResponse.json({ success: true });
}
