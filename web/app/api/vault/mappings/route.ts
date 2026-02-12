import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { VaultMapping } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const db = getDb();
  const mappings = db.prepare("SELECT * FROM vault_mappings WHERE project_id = ?").all(projectId) as VaultMapping[];
  return NextResponse.json(mappings);
}

export async function PUT(request: NextRequest) {
  try {
    const { project_id, category, vault_folder } = await request.json();
    if (!project_id || !category || !vault_folder) {
      return NextResponse.json({ error: "project_id, category, and vault_folder required" }, { status: 400 });
    }
    const db = getDb();
    db.prepare(
      `INSERT INTO vault_mappings (id, project_id, category, vault_folder)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(project_id, category) DO UPDATE SET vault_folder = excluded.vault_folder`
    ).run(uuid(), project_id, category, vault_folder);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
