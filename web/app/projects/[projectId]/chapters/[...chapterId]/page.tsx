import { Header } from "@/components/layout/Header";
import { VaultFileView } from "@/components/vault/VaultFileView";

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; chapterId: string[] }>;
}) {
  const { projectId, chapterId } = await params;
  const filePath = decodeURIComponent(chapterId.join("/"));
  const name = filePath.split("/").pop()?.replace(/\.md$/, "") ?? "Chapter";

  return (
    <>
      <Header title={name} subtitle="Chapter content" />
      <main className="flex flex-1 overflow-hidden p-4">
        <VaultFileView projectId={projectId} defaultPath={filePath} editable />
      </main>
    </>
  );
}
