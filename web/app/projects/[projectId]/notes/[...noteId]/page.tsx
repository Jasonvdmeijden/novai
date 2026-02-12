import { Header } from "@/components/layout/Header";
import { VaultFileView } from "@/components/vault/VaultFileView";

export default async function NoteViewPage({
  params,
}: {
  params: Promise<{ projectId: string; noteId: string[] }>;
}) {
  const { projectId, noteId } = await params;
  const filePath = decodeURIComponent(noteId.join("/"));
  const title = filePath.split("/").pop()?.replace(/\.md$/, "") ?? "Note";

  return (
    <>
      <Header title={title} subtitle={filePath} />
      <main className="flex flex-1 overflow-hidden p-4">
        <VaultFileView projectId={projectId} defaultPath={filePath} editable />
      </main>
    </>
  );
}
