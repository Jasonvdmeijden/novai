"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FileText, Folder, ChevronRight, ChevronDown } from "lucide-react";

interface VaultNode {
  path: string;
  name: string;
  type: "file" | "directory";
  children?: VaultNode[];
}

function FileTree({ node, depth, onSelect }: { node: VaultNode; depth: number; onSelect: (path: string) => void }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isDir = node.type === "directory";

  return (
    <div>
      <button
        onClick={() => isDir ? setExpanded(!expanded) : onSelect(node.path)}
        className={cn("flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent text-left transition-colors")}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDir ? (
          <>
            {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            <Folder className="h-4 w-4 shrink-0 text-blue-500" />
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && expanded && node.children?.map((child) => (
        <FileTree key={child.path} node={child} depth={depth + 1} onSelect={onSelect} />
      ))}
    </div>
  );
}

export default function NotesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const [tree, setTree] = useState<VaultNode | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/vault?projectId=${projectId}`);
      if (res.ok) setTree(await res.json());
    }
    load();
  }, [projectId]);

  return (
    <>
      <Header title="Notes" subtitle="Vault file browser" />
      <main className="flex flex-1 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          {tree ? (
            <FileTree node={tree} depth={0} onSelect={(path) => router.push(`/projects/${projectId}/notes/${encodeURIComponent(path)}`)} />
          ) : (
            <p className="text-sm text-muted-foreground p-4">Loading vault...</p>
          )}
        </ScrollArea>
      </main>
    </>
  );
}
