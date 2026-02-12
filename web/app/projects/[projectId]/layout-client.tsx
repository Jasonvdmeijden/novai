"use client";

import { usePathname } from "next/navigation";
import { ChatPanel } from "@/components/chat/ChatPanel";

interface ProjectLayoutClientProps {
  projectId: string;
  children: React.ReactNode;
}

export function ProjectLayoutClient({
  projectId,
  children,
}: ProjectLayoutClientProps) {
  const pathname = usePathname();

  // Extract current file path from URL if viewing a vault file
  let currentPath: string | undefined;
  if (pathname.includes("/vault/")) {
    currentPath = decodeURIComponent(pathname.split("/vault/")[1]);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      <ChatPanel projectId={projectId} currentPath={currentPath} />
    </div>
  );
}
