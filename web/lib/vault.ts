import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { VaultFile, VaultDocument } from "@/types";

const VAULT_PATH = process.env.VAULT_PATH || "/vault";

export function getVaultPath(...segments: string[]): string {
  const resolved = path.resolve(VAULT_PATH, ...segments);
  // Prevent path traversal
  if (!resolved.startsWith(path.resolve(VAULT_PATH))) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

export function listVaultFiles(subpath: string = ""): VaultFile[] {
  const dirPath = getVaultPath(subpath);
  if (!fs.existsSync(dirPath)) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => !e.name.startsWith("."))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    })
    .map((entry) => {
      const entryPath = subpath ? `${subpath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        return {
          path: entryPath,
          name: entry.name,
          type: "directory" as const,
          children: listVaultFiles(entryPath),
        };
      }
      return {
        path: entryPath,
        name: entry.name,
        type: "file" as const,
      };
    });
}

export function readVaultFile(filePath: string): VaultDocument {
  const fullPath = getVaultPath(filePath);
  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(raw);
  return {
    path: filePath,
    content: raw,
    frontmatter: data,
    body: content,
  };
}

export function writeVaultFile(filePath: string, content: string): void {
  const fullPath = getVaultPath(filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, "utf-8");
}

export function vaultFileExists(filePath: string): boolean {
  return fs.existsSync(getVaultPath(filePath));
}

export function deleteVaultFile(filePath: string): void {
  const fullPath = getVaultPath(filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

export function getVaultStats(subpath: string = ""): { files: number; words: number } {
  let files = 0;
  let words = 0;

  function walk(dir: string) {
    const fullDir = getVaultPath(dir);
    if (!fs.existsSync(fullDir)) return;
    const entries = fs.readdirSync(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const entryPath = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.name.endsWith(".md")) {
        files++;
        const content = fs.readFileSync(getVaultPath(entryPath), "utf-8");
        words += content.split(/\s+/).filter(Boolean).length;
      }
    }
  }

  walk(subpath);
  return { files, words };
}
