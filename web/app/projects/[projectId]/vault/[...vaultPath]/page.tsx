import { use } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { VaultFileView } from "@/components/vault/VaultFileView";

export default function VaultFilePage({
  params,
}: {
  params: Promise<{ projectId: string; vaultPath: string[] }>;
}) {
  const { projectId, vaultPath } = use(params);
  const path = decodeURIComponent(vaultPath.join("/"));

  return (
    <>
      <Header title={path.split("/").pop() || "Vault"} />
      <main className="flex flex-col flex-1 overflow-hidden">
        <VaultFileView projectId={projectId} defaultPath={path} editable />
      </main>
    </>
  );
}
