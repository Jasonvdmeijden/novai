import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/prompts";
import type { WritingParameters } from "@/types";

// GET /api/projects/prompt?projectId= — returns the rendered system prompt
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId)
    return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const db = getDb();
  const params = db
    .prepare("SELECT * FROM writing_parameters WHERE project_id = ?")
    .get(projectId) as WritingParameters | undefined;

  return NextResponse.json({ prompt: buildSystemPrompt(params ?? null) });
}
