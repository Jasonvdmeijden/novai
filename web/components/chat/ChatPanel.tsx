"use client";

import { useState } from "react";
import { MessageCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "./ChatWindow";
import { useResize } from "@/hooks/useResize";

interface ChatPanelProps {
  projectId: string;
  currentPath?: string;
}

export function ChatPanel({ projectId, currentPath }: ChatPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { size, handleMouseDown } = useResize(320, 240, 600, "left");

  if (!expanded) {
    return (
      <div className="flex flex-col items-center justify-start pt-4 border-l bg-background w-10 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded(true)}
          title="Open chat"
          className="h-10 w-10 rounded-none"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex relative">
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 cursor-col-resize hover:bg-primary/30 transition-colors"
      />

      {/* Chat panel */}
      <div className="flex flex-col border-l bg-background overflow-hidden" style={{ width: `${size}px` }}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Chat</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(false)}
            className="h-6 w-6"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatWindow projectId={projectId} currentPath={currentPath} />
        </div>
      </div>
    </div>
  );
}
