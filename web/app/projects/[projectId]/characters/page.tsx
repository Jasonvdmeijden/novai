"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface CharFile {
  path: string;
  name: string;
}

export default function CharactersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [chars, setChars] = useState<CharFile[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams({ action: "list", path: "Characters" });
      const res = await fetch(`/api/vault?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const files: CharFile[] = (data.children ?? [])
        .filter((f: { type: string; name: string }) => f.type === "file" && f.name.endsWith(".md"))
        .map((f: { path: string; name: string }) => ({
          path: f.path,
          name: f.name.replace(/\.md$/, ""),
        }));
      setChars(files);
    }
    load();
  }, [projectId]);

  return (
    <>
      <Header title="Characters" subtitle="Character profiles" />
      <main className="flex-1 overflow-auto p-6">
        {chars.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No characters yet — ask the AI to develop one.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chars.map((ch) => (
              <Card
                key={ch.path}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/projects/${projectId}/characters/${encodeURIComponent(ch.path)}`)}
              >
                <CardHeader>
                  <CardTitle className="text-sm">{ch.name}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
