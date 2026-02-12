import { NextRequest, NextResponse } from "next/server";
import { listVaultFiles, readVaultFile, writeVaultFile, deleteVaultFile, getVaultStats } from "@/lib/vault";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";
  const filePath = searchParams.get("path") || "";

  try {
    switch (action) {
      case "list":
        const files = listVaultFiles(filePath);
        return NextResponse.json({ children: files });
      case "read":
        if (!filePath) return NextResponse.json({ error: "path required" }, { status: 400 });
        return NextResponse.json(readVaultFile(filePath));
      case "stats":
        return NextResponse.json(getVaultStats(filePath));
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { path: filePath, content } = await request.json();
    if (!filePath || content === undefined) {
      return NextResponse.json({ error: "path and content required" }, { status: 400 });
    }
    writeVaultFile(filePath, content);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { path: filePath } = await request.json();
    if (!filePath) {
      return NextResponse.json({ error: "path required" }, { status: 400 });
    }
    deleteVaultFile(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
