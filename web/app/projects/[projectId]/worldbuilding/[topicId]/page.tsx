import { Header } from "@/components/layout/Header";
import { VaultFileView } from "@/components/vault/VaultFileView";

export default async function TopicEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; topicId: string }>;
}) {
  const { projectId, topicId } = await params;
  const filePath = decodeURIComponent(topicId);
  const title = filePath.split("/").pop()?.replace(/\.md$/, "") ?? "Topic";

  return (
    <>
      <Header title={title} subtitle="Worldbuilding document" />
      <main className="flex flex-1 overflow-hidden p-4">
        <VaultFileView projectId={projectId} defaultPath={filePath} editable />
      </main>
    </>
  );
}
