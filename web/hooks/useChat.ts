"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "@/types";

interface UseChatOptions {
  projectId: string;
  currentPath?: string;
}

interface PermissionEvent {
  id: string;
  request: string;
  response: string;
  action: string;
  timestamp: string;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  permissions: PermissionEvent[];
  sendMessage: (
    message: string,
    contextFiles?: Array<{ path: string; body: string }>,
    mode?: string,
    planMode?: boolean
  ) => Promise<void>;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

export function useChat({ projectId, currentPath }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [permissions, setPermissions] = useState<PermissionEvent[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    const res = await fetch(`/api/chat/history?projectId=${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
  }, [projectId]);

  const clearHistory = useCallback(async () => {
    await fetch(`/api/chat/history?projectId=${projectId}`, { method: "DELETE" });
    setMessages([]);
  }, [projectId]);

  const sendMessage = useCallback(
    async (
      message: string,
      contextFiles: Array<{ path: string; body: string }> = [],
      mode: string = "chat",
      planMode: boolean = false
    ) => {
      // Add optimistic user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        project_id: projectId,
        role: "user",
        content: message,
        context_files: contextFiles.map((f) => f.path),
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingContent("");

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, message, contextFiles, currentPath, mode, planMode }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error("Chat request failed");
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "text") {
                accumulated += data.content;
                setStreamingContent(accumulated);
              } else if (data.type === "permission") {
                const permEvent: PermissionEvent = {
                  id: crypto.randomUUID(),
                  request: data.request,
                  response: data.response,
                  action: data.action,
                  timestamp: new Date().toISOString(),
                };
                setPermissions((prev) => [...prev, permEvent]);
              } else if (data.type === "done") {
                const assistantMsg: ChatMessage = {
                  id: data.messageId,
                  project_id: projectId,
                  role: "assistant",
                  content: accumulated,
                  context_files: [],
                  created_at: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, assistantMsg]);
                setStreamingContent("");
              } else if (data.type === "error") {
                console.error("Stream error:", data.error);
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Chat error:", err);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [projectId, currentPath]
  );

  return { messages, isStreaming, streamingContent, permissions, sendMessage, loadHistory, clearHistory };
}
