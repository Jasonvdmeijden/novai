import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Project } from "@/types";
import { randomUUID } from "crypto";

// GET /api/projects — list all projects
export async function GET() {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM projects ORDER BY updated_at DESC")
    .all() as Project[];
  return NextResponse.json(rows);
}

// POST /api/projects — create a new project
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description = "", vault_subfolder = "" } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO projects (id, name, description, vault_subfolder, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, name.trim(), description, vault_subfolder, now, now);

  // Seed default writing parameters
  db.prepare(
    `INSERT OR IGNORE INTO writing_parameters (id, project_id, updated_at)
     VALUES (?, ?, ?)`
  ).run(randomUUID(), id, now);

  const project = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(id) as Project;

  return NextResponse.json(project, { status: 201 });
}

// PATCH /api/projects?id= — update a project
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const { name, description, vault_subfolder } = body;

  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM projects WHERE id = ?")
    .get(id);
  if (!existing)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const sets: string[] = ["updated_at = ?"];
  const params: unknown[] = [new Date().toISOString()];

  if (name !== undefined) { sets.push("name = ?"); params.push(name); }
  if (description !== undefined) { sets.push("description = ?"); params.push(description); }
  if (vault_subfolder !== undefined) { sets.push("vault_subfolder = ?"); params.push(vault_subfolder); }

  params.push(id);
  db.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  const project = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(id) as Project;
  return NextResponse.json(project);
}

// DELETE /api/projects?id= — delete a project
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  if (result.changes === 0)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ deleted: true });
}
