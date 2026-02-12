import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskWizard } from "@/components/writing/TaskWizard";
import type { Project, WritingParameters } from "@/types";
import { MessageSquare, FileText, Users, Globe } from "lucide-react";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const db = getDb();
  const project = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(projectId) as Project | undefined;
  if (!project) notFound();

  const params_row = db
    .prepare("SELECT * FROM writing_parameters WHERE project_id = ?")
    .get(project.id) as WritingParameters | undefined;

  const messageCount = (
    db
      .prepare("SELECT COUNT(*) as n FROM chat_messages WHERE project_id = ?")
      .get(project.id) as { n: number }
  ).n;

  const taskCount = (
    db
      .prepare("SELECT COUNT(*) as n FROM agent_tasks WHERE project_id = ?")
      .get(project.id) as { n: number }
  ).n;

  return (
    <>
      <Header
        title={project.name}
        subtitle={project.description || undefined}
        actions={<TaskWizard projectId={projectId} />}
      />
      <main className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={MessageSquare} label="Chat Messages" value={messageCount} />
          <StatCard icon={FileText} label="Agent Tasks Run" value={taskCount} />
          <StatCard
            icon={Users}
            label="Genre"
            value={params_row?.genre ?? "—"}
            text
          />
          <StatCard
            icon={Globe}
            label="Language"
            value={params_row?.language ?? "—"}
            text
          />
        </div>

        {/* Writing parameters summary */}
        {params_row && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Writing Style
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[
                params_row.genre,
                params_row.tone,
                params_row.pov,
                params_row.tense,
                params_row.style,
                params_row.pacing,
              ].map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Project metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Created:</span>{" "}
              {new Date(project.created_at).toLocaleString()}
            </p>
            <p>
              <span className="font-medium text-foreground">Last updated:</span>{" "}
              {new Date(project.updated_at).toLocaleString()}
            </p>
            {project.vault_subfolder && (
              <p>
                <span className="font-medium text-foreground">Vault folder:</span>{" "}
                {project.vault_subfolder}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  text,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  text?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={text ? "text-sm font-medium" : "text-2xl font-bold"}>
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
