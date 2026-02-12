"use client";

import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Eye,
  PenLine,
  Sparkles,
  LayoutList,
  GitBranch,
  Globe,
} from "lucide-react";

interface ChatMode {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const MODES: ChatMode[] = [
  { id: "chat", label: "Chat", icon: <MessageCircle className="h-3.5 w-3.5" /> },
  { id: "review", label: "Review", icon: <Eye className="h-3.5 w-3.5" /> },
  { id: "editor", label: "Editor", icon: <PenLine className="h-3.5 w-3.5" /> },
  { id: "creative", label: "Creative", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: "structure", label: "Structure", icon: <LayoutList className="h-3.5 w-3.5" /> },
  { id: "continuity", label: "Continuity", icon: <GitBranch className="h-3.5 w-3.5" /> },
  { id: "world", label: "World Builder", icon: <Globe className="h-3.5 w-3.5" /> },
];

interface ChatModeSelectorProps {
  selectedMode: string;
  onModeChange: (mode: string) => void;
}

export function ChatModeSelector({ selectedMode, onModeChange }: ChatModeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1 px-3 py-2">
      {MODES.map((mode) => (
        <Button
          key={mode.id}
          variant={selectedMode === mode.id ? "default" : "ghost"}
          size="sm"
          onClick={() => onModeChange(mode.id)}
          className="h-7 px-2 text-xs gap-1"
        >
          {mode.icon}
          {mode.label}
        </Button>
      ))}
    </div>
  );
}
