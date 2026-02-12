"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { Edit2, Eye, Save, X, RefreshCw } from "lucide-react";

interface VaultFileViewProps {
  projectId: string;
  defaultPath: string;
  editable?: boolean;
  emptyMessage?: string;
}

export function VaultFileView({
  projectId,
  defaultPath,
  editable = false,
  emptyMessage = "File not found.",
}: VaultFileViewProps) {
  const [body, setBody] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ action: "read", path: defaultPath });
    const res = await fetch(`/api/vault?${params}`);
    if (res.ok) {
      const data = await res.json();
      setBody(data.body ?? data.content ?? "");
    } else {
      setBody(null);
    }
    setLoading(false);
  }, [projectId, defaultPath]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-poll every 5s when not editing
  useEffect(() => {
    if (editing) return;
    const interval = setInterval(() => {
      const params = new URLSearchParams({ action: "read", path: defaultPath });
      fetch(`/api/vault?${params}`)
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          return null;
        })
        .then((data) => {
          if (data) {
            setBody(data.body ?? data.content ?? "");
          }
        })
        .catch((err) => console.error("Auto-poll failed:", err));
    }, 5000);
    return () => clearInterval(interval);
  }, [defaultPath, editing]);

  async function save() {
    setSaving(true);
    await fetch("/api/vault", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, path: defaultPath, content: draft }),
    });
    setBody(draft);
    setEditing(false);
    setSaving(false);
  }

  function startEdit() {
    setDraft(body ?? "");
    setEditing(true);
  }

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
  }

  if (body === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        {editable && (
          <Button size="sm" onClick={() => { setBody(""); setDraft(""); setEditing(true); }}>
            Create file
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-end border-b px-4 py-2">
        {editable && !editing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={startEdit}>
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {editing ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-full w-full resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
          />
        ) : (
          <ScrollArea className="h-full">
            {body ? (
              <div className="prose prose-sm dark:prose-invert max-w-none p-6">
                <ReactMarkdown>{body}</ReactMarkdown>
              </div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground italic">
                File is empty.
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
