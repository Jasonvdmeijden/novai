"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { ChatMessage } from "./ChatMessage";
import { StreamingText } from "./StreamingText";
import { ChatInput } from "./ChatInput";
import { ContextSelector } from "./ContextSelector";
import { useChat } from "@/hooks/useChat";

interface ChatWindowProps {
  projectId: string;
}

interface ContextFile {
  path: string;
  body: string;
}

export function ChatWindow({ projectId }: ChatWindowProps) {
  const { messages, isStreaming, streamingContent, permissions, sendMessage, loadHistory, clearHistory } =
    useChat({ projectId });
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedContextRef = useRef<ContextFile[]>([]);

  useEffect(() => {
    loadHistory();
  }, [projectId, loadHistory]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, streamingContent]);

  const handleSendMessage = async (message: string) => {
    await sendMessage(message, selectedContextRef.current);
    selectedContextRef.current = [];
  };

  const handleSelectContext = (files: ContextFile[]) => {
    selectedContextRef.current = files;
  };

  return (
    <Card className="flex flex-col h-full bg-background">
      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 overflow-hidden">
        <div className="space-y-0">
          {messages.length === 0 && !streamingContent ? (
            <div className="flex h-full items-center justify-center text-muted-foreground p-4">
              <p>Start a conversation about your book</p>
            </div>
          ) : (
            <>
              {permissions.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 p-4 mx-4 mt-4 rounded-lg space-y-3">
                  <div className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                    <span>🔐</span>
                    <span>Permission Request</span>
                  </div>
                  {permissions.map((perm) => (
                    <div key={perm.id} className="bg-white p-3 rounded border border-amber-200">
                      <div className="text-sm text-amber-950 font-mono bg-amber-50 p-2 rounded mb-2 whitespace-pre-wrap break-words">
                        {perm.request}
                      </div>
                      <div className="text-xs text-amber-700 flex items-center gap-1">
                        <span>✓ Auto-approved</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {streamingContent && (
                <StreamingText content={streamingContent} />
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t space-y-2 p-4">
        {selectedContextRef.current.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {selectedContextRef.current.map((file) => (
              <div
                key={file.path}
                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
              >
                {file.path}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <ContextSelector projectId={projectId} onSelect={handleSelectContext} />
          <div className="flex-1">
            <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
          </div>
        </div>
      </div>
    </Card>
  );
}
