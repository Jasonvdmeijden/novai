"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";

interface TopicFile {
  path: string;
  name: string;
  folder: string;
}

export default function WorldbuildingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [topics, setTopics] = useState<TopicFile[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams({ action: "list", path: "Worldbuilding" });
      const res = await fetch(`/api/vault?${params}`);
      if (!res.ok) return;
      const data = await res.json();

      type Node = { type: string; name: string; path: string; children?: Node[] };
      const collect = (node: Node, folder: string): TopicFile[] => {
        if (node.type === "file" && node.name.endsWith(".md")) {
          return [{ path: node.path, name: node.name.replace(/\.md$/, ""), folder }];
        }
        if (node.type === "directory" && node.children) {
          return node.children.flatMap((c: Node) => collect(c, node.name));
        }
        return [];
      };

      setTopics(collect(data, ""));
    }
    load();
  }, [projectId]);

  return (
    <>
      <Header title="Worldbuilding" subtitle="Settings, cultures, and lore" />
      <main className="flex-1 overflow-auto p-6">
        {topics.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No worldbuilding notes yet — ask the AI to help build your world.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <Card
                key={t.path}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/projects/${projectId}/worldbuilding/${encodeURIComponent(t.path)}`)}
              >
                <CardHeader>
                  <CardTitle className="text-sm">{t.name}</CardTitle>
                  {t.folder && <Badge variant="outline" className="w-fit text-xs mt-1">{t.folder}</Badge>}
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
