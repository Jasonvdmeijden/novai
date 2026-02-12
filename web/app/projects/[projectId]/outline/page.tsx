"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface OutlineFile {
  path: string;
  name: string;
}

export default function OutlinePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [outlines, setOutlines] = useState<OutlineFile[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams({ action: "list", path: "Overview" });
      const res = await fetch(`/api/vault?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const files: OutlineFile[] = (data.children ?? [])
        .filter((f: { type: string; name: string }) => f.type === "file" && f.name.endsWith(".md"))
        .map((f: { path: string; name: string }) => ({
          path: f.path,
          name: f.name.replace(/\.md$/, ""),
        }));
      setOutlines(files);
    }
    load();
  }, [projectId]);

  return (
    <>
      <Header title="Outline" subtitle="Story structure and chapter plan" />
      <main className="flex-1 overflow-auto p-6">
        {outlines.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No outline yet — ask the AI to develop one.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {outlines.map((outline) => (
              <Card
                key={outline.path}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/projects/${projectId}/outline/${encodeURIComponent(outline.path)}`)}
              >
                <CardHeader>
                  <CardTitle className="text-sm">{outline.name}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
