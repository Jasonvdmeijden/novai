import { redirect } from "next/navigation";

export default function VaultRootPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  // This route should never be reached directly - redirect to files
  // In practice, VaultTreeSidebar will handle navigation
  // This is a fallback to the notes-style view
  redirect("./notes");
}
