import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProjectSidebar } from "@/components/layout/ProjectSidebar";
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
      <ProjectSidebar projectId={project.id} projectName={project.name} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
