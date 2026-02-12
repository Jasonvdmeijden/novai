import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeVaultFile } from "@/lib/vault";
import type { VaultSnapshot } from "@/types";

// GET /api/vault/snapshots?projectId=&filePath= — list snapshots for a file
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const filePath  = req.nextUrl.searchParams.get("filePath");

  if (!projectId)
    return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const db = getDb();
  const rows = filePath
    ? db.prepare(
        `SELECT * FROM vault_snapshots
         WHERE project_id = ? AND file_path = ?
         ORDER BY created_at DESC LIMIT 20`
      ).all(projectId, filePath)
    : db.prepare(
        `SELECT * FROM vault_snapshots
         WHERE project_id = ?
         ORDER BY created_at DESC LIMIT 50`
      ).all(projectId);

  return NextResponse.json(rows);
}

// POST /api/vault/snapshots/restore — restore a snapshot (undo)
export async function POST(req: NextRequest) {
  const { snapshotId, projectId } = await req.json();

  if (!snapshotId || !projectId)
    return NextResponse.json(
      { error: "snapshotId and projectId required" },
      { status: 400 }
    );

  const db = getDb();
  const snapshot = db
    .prepare("SELECT * FROM vault_snapshots WHERE id = ? AND project_id = ?")
    .get(snapshotId, projectId) as VaultSnapshot | undefined;

  if (!snapshot)
    return NextResponse.json({ error: "snapshot not found" }, { status: 404 });

  // Restore the "before" content
  await writeVaultFile(snapshot.file_path, snapshot.content_before);

  // Record the restore itself as a snapshot so it's also undoable
  const { randomUUID } = await import("crypto");
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO vault_snapshots
     (id, project_id, task_id, file_path, content_before, content_after, created_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?)`
  ).run(
    randomUUID(), projectId, snapshot.file_path,
    snapshot.content_after,   // current (after) becomes "before"
    snapshot.content_before,  // restored content is "after"
    now
  );

  return NextResponse.json({ restored: true, file_path: snapshot.file_path });
}
