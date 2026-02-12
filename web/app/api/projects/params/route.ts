import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { WritingParameters } from "@/types";
import { randomUUID } from "crypto";

// GET /api/projects/params?projectId=
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId)
    return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const db = getDb();
  const row = db
    .prepare("SELECT * FROM writing_parameters WHERE project_id = ?")
    .get(projectId) as WritingParameters | undefined;

  if (!row)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(row);
}

// PUT /api/projects/params — upsert writing parameters
export async function PUT(req: NextRequest) {
  const { projectId, params } = await req.json();
  if (!projectId || !params)
    return NextResponse.json({ error: "projectId and params required" }, { status: 400 });

  const db = getDb();
  const now = new Date().toISOString();

  const existing = db
    .prepare("SELECT id FROM writing_parameters WHERE project_id = ?")
    .get(projectId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE writing_parameters SET
        genre = ?, tone = ?, pov = ?, tense = ?, style = ?, pacing = ?,
        dialogue_style = ?, language = ?, chapter_target_words = ?,
        custom_instructions = ?, style_references = ?, updated_at = ?
       WHERE project_id = ?`
    ).run(
      params.genre, params.tone, params.pov, params.tense, params.style,
      params.pacing, params.dialogue_style, params.language,
      params.chapter_target_words, params.custom_instructions,
      params.style_references, now, projectId
    );
  } else {
    db.prepare(
      `INSERT INTO writing_parameters
        (id, project_id, genre, tone, pov, tense, style, pacing,
         dialogue_style, language, chapter_target_words, custom_instructions,
         style_references, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(), projectId,
      params.genre, params.tone, params.pov, params.tense, params.style,
      params.pacing, params.dialogue_style, params.language,
      params.chapter_target_words, params.custom_instructions,
      params.style_references, now
    );
  }

  const updated = db
    .prepare("SELECT * FROM writing_parameters WHERE project_id = ?")
    .get(projectId) as WritingParameters;
  return NextResponse.json(updated);
}
