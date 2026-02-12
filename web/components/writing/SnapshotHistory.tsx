"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DiffView } from "./DiffView";
import { History, RotateCcw } from "lucide-react";
import type { VaultSnapshot } from "@/types";

interface SnapshotHistoryProps {
  projectId: string;
  filePath: string;
  onRestored?: () => void;
}

export function SnapshotHistory({ projectId, filePath, onRestored }: SnapshotHistoryProps) {
  const [snapshots, setSnapshots] = useState<VaultSnapshot[]>([]);
  const [selected, setSelected] = useState<VaultSnapshot | null>(null);
  const [restoring, setRestoring] = useState(false);

  async function load() {
    const params = new URLSearchParams({ projectId, filePath });
    const res = await fetch(`/api/vault/snapshots?${params}`);
    if (res.ok) setSnapshots(await res.json());
  }

  async function restore(snapshot: VaultSnapshot) {
    setRestoring(true);
    await fetch("/api/vault/snapshots/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshotId: snapshot.id, projectId }),
    });
    setRestoring(false);
    setSelected(null);
    onRestored?.();
  }

  return (
    <Dialog onOpenChange={(open) => { if (open) load(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <History className="h-3.5 w-3.5" />
          History
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 overflow-hidden" style={{ height: "500px" }}>
          {/* Snapshot list */}
          <ScrollArea className="w-56 shrink-0 border-r pr-4">
            {snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No history yet.</p>
            ) : (
              <div className="space-y-1">
                {snapshots.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={`w-full rounded px-3 py-2 text-left text-xs transition-colors hover:bg-accent ${
                      selected?.id === s.id ? "bg-accent" : ""
                    }`}
                  >
                    <p className="font-medium">{new Date(s.created_at).toLocaleString()}</p>
                    {s.task_id && (
                      <p className="text-muted-foreground truncate">Task: {s.task_id.slice(0, 8)}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Diff view */}
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            {selected ? (
              <>
                <DiffView
                  before={selected.content_before}
                  after={selected.content_after}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => restore(selected)}
                  disabled={restoring}
                  className="self-end"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  {restoring ? "Restoring…" : "Restore this version"}
                </Button>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Select a version to preview
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
