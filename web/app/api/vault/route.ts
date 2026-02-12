import { NextRequest, NextResponse } from "next/server";
import { listVaultFiles, readVaultFile, writeVaultFile, deleteVaultFile, getVaultStats, renameVaultFile, moveVaultFile, createVaultDirectory } from "@/lib/vault";
import path from "path";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";
  const filePath = searchParams.get("path") || "";

  try {
    switch (action) {
      case "list":
        const files = listVaultFiles(filePath);
        // Return tree structure directly
        const tree = {
          path: filePath || "vault",
          name: "Vault",
          type: "directory" as const,
          children: files,
        };
        return NextResponse.json(tree);
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, oldPath, newPath, srcPath, destDir } = body;

    if (action === "rename") {
      if (!oldPath || !newPath) {
        return NextResponse.json({ error: "oldPath and newPath required" }, { status: 400 });
      }
      renameVaultFile(oldPath, newPath);
      return NextResponse.json({ success: true });
    } else if (action === "move") {
      if (!srcPath || !destDir) {
        return NextResponse.json({ error: "srcPath and destDir required" }, { status: 400 });
      }
      moveVaultFile(srcPath, destDir);
      const filename = path.basename(srcPath);
      const newPath = destDir ? `${destDir}/${filename}` : filename;
      return NextResponse.json({ success: true, newPath });
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, path: dirPath } = body;

    if (action === "mkdir") {
      if (!dirPath) {
        return NextResponse.json({ error: "path required" }, { status: 400 });
      }
      createVaultDirectory(dirPath);
      return NextResponse.json({ success: true });
    } else if (action === "newfile") {
      if (!dirPath) {
        return NextResponse.json({ error: "path required" }, { status: 400 });
      }
      writeVaultFile(dirPath, "");
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
