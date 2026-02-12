import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { VaultTreeSidebar } from "@/components/layout/VaultTreeSidebar";
import { ProjectLayoutClient } from "./layout-client";
import type { Project } from "@/types";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const db = getDb();
  const project = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(projectId) as Project | undefined;

  if (!project) notFound();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar projectId={project.id} />
      <VaultTreeSidebar projectId={project.id} />
      <ProjectLayoutClient projectId={project.id}>
        {children}
      </ProjectLayoutClient>
    </div>
  );
}
