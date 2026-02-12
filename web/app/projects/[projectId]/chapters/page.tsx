"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface ChapterFile {
  path: string;
  name: string;
}

export default function ChaptersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [chapters, setChapters] = useState<ChapterFile[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams({ action: "list", path: "Chapters" });
      const res = await fetch(`/api/vault?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const files: ChapterFile[] = (data.children ?? [])
        .filter((f: { type: string }) => f.type === "file")
        .map((f: { path: string; name: string }) => ({
          path: f.path,
          name: f.name.replace(/\.md$/, ""),
        }));
      setChapters(files);
    }
    load();
  }, [projectId]);

  return (
    <>
      <Header title="Chapters" subtitle="Your manuscript" />
      <main className="flex-1 overflow-auto p-6">
        {chapters.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No chapters yet — use the AI to write the first one.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((ch) => (
              <Card
                key={ch.path}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/projects/${projectId}/chapters/${encodeURIComponent(ch.path)}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{ch.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="text-xs">draft</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
