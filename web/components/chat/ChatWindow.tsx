"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { StreamingText } from "./StreamingText";
import { ChatInput } from "./ChatInput";
import { useChat } from "@/hooks/useChat";
import type { VaultFile } from "@/types";

interface ChatWindowProps {
  projectId: string;
  currentPath?: string;
}

export function ChatWindow({ projectId, currentPath }: ChatWindowProps) {
  const { messages, isStreaming, streamingContent, permissions, sendMessage, loadHistory } =
    useChat({ projectId, currentPath });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [contextFiles, setContextFiles] = useState<VaultFile[]>([]);
  const [selectedMode, setSelectedMode] = useState("chat");
  const [planMode, setPlanMode] = useState(false);
  const [showApplyButton, setShowApplyButton] = useState(false);

  // Auto-inject currentPath as context when it changes
  useEffect(() => {
    if (currentPath) {
      const loadCurrentFile = async () => {
        try {
          const res = await fetch(`/api/vault?action=read&path=${encodeURIComponent(currentPath)}`);
          if (res.ok) {
            const doc = await res.json();
            const file: VaultFile = {
              path: currentPath,
              name: currentPath.split("/").pop() || currentPath,
              type: "file",
            };
            setContextFiles([file]);
          }
        } catch (error) {
          console.error("Failed to load current file:", error);
        }
      };
      loadCurrentFile();
    } else {
      setContextFiles([]);
    }
  }, [currentPath]);

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

  // Check if streaming content ends with READY_TO_APPLY
  useEffect(() => {
    if (planMode && streamingContent.includes("READY_TO_APPLY")) {
      setShowApplyButton(true);
    }
  }, [streamingContent, planMode]);

  const handleSendMessage = async (message: string, files: VaultFile[], mode?: string) => {
    // Convert VaultFile[] to the format expected by sendMessage
    const contextFiles = files.map((f) => ({
      path: f.path,
      body: "", // Body will be fetched by the API if needed
    }));
    const effectiveMode = mode || selectedMode;
    await sendMessage(message, contextFiles, effectiveMode, planMode);
    setPlanMode(false);
    setShowApplyButton(false);
  };

  const handleApplyChanges = async () => {
    const filesToSend = contextFiles.map((f) => ({
      path: f.path,
      body: "",
    }));
    await sendMessage("PROCEED", filesToSend, selectedMode, false);
    setPlanMode(false);
    setShowApplyButton(false);
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

      {/* Apply Changes Button */}
      {showApplyButton && (
        <div className="border-t p-4">
          <Button
            onClick={handleApplyChanges}
            disabled={isStreaming}
            className="w-full gap-2"
            size="sm"
          >
            <Wand2 className="h-4 w-4" />
            Apply Changes
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4">
        {showApplyButton && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
            <strong>AI has planned changes.</strong> Click "Apply Changes" above to execute them, or type a new message to start fresh.
          </div>
        )}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isStreaming || showApplyButton}
          defaultContextFiles={contextFiles}
          onContextChange={setContextFiles}
          mode={selectedMode}
          onModeChange={setSelectedMode}
        />
        {!showApplyButton && (
          <Button
            onClick={() => setPlanMode(true)}
            disabled={isStreaming}
            variant="outline"
            size="sm"
            className="mt-2 w-full gap-2"
          >
            <Wand2 className="h-4 w-4" />
            Plan Changes
          </Button>
        )}
      </div>
    </Card>
  );
}
