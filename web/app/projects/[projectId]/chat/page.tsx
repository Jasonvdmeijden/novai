import { Header } from "@/components/layout/Header";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <>
      <Header title="Chat" subtitle="Ask NovAI about your book" />
      <main className="flex flex-1 overflow-hidden p-4">
        <ChatWindow projectId={projectId} />
      </main>
    </>
  );
}
