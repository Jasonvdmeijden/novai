import { Header } from "@/components/layout/Header";
import { VaultFileView } from "@/components/vault/VaultFileView";

export default async function OutlineDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; outlineId: string[] }>;
}) {
  const { projectId, outlineId } = await params;
  const filePath = decodeURIComponent(outlineId.join("/"));
  const name = filePath.split("/").pop()?.replace(/\.md$/, "") ?? "Outline";

  return (
    <>
      <Header title={name} subtitle="Story outline" />
      <main className="flex flex-1 overflow-hidden p-4">
        <VaultFileView projectId={projectId} defaultPath={filePath} editable />
      </main>
    </>
  );
}
