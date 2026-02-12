import { Header } from "@/components/layout/Header";
import { VaultFileView } from "@/components/vault/VaultFileView";

export default async function CharacterProfilePage({
  params,
}: {
  params: Promise<{ projectId: string; characterId: string }>;
}) {
  const { projectId, characterId } = await params;
  const filePath = decodeURIComponent(characterId);
  const name = filePath.split("/").pop()?.replace(/\.md$/, "") ?? "Character";

  return (
    <>
      <Header title={name} subtitle="Character profile" />
      <main className="flex flex-1 overflow-hidden p-4">
        <VaultFileView projectId={projectId} defaultPath={filePath} editable />
      </main>
    </>
  );
}
