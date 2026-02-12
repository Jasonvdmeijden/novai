import { Header } from "@/components/layout/Header";
import { VaultFileView } from "@/components/vault/VaultFileView";
import { TaskWizard } from "@/components/writing/TaskWizard";
import { SnapshotHistory } from "@/components/writing/SnapshotHistory";

export default async function ChapterEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; chapterId: string }>;
}) {
  const { projectId, chapterId } = await params;
  const filePath = decodeURIComponent(chapterId);
  const title = filePath.split("/").pop()?.replace(/\.md$/, "") ?? "Chapter";

  return (
    <>
      <Header
        title={title}
        subtitle="Chapter editor"
        actions={
          <div className="flex items-center gap-2">
            <SnapshotHistory projectId={projectId} filePath={filePath} />
            <TaskWizard
              projectId={projectId}
              defaultTaskType="chapter_edit"
              trigger={
                <button className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors">
                  AI Edit
                </button>
              }
            />
          </div>
        }
      />
      <main className="flex flex-1 overflow-hidden p-4">
        <VaultFileView projectId={projectId} defaultPath={filePath} editable />
      </main>
    </>
  );
}
