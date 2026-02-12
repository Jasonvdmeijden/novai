"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, X } from "lucide-react";
import { ContextSelector } from "./ContextSelector";
import { ChatModeSelector } from "./ChatModeSelector";
import type { VaultFile } from "@/types";

interface ChatInputProps {
  onSend: (message: string, contextFiles: VaultFile[], mode?: string) => void;
  disabled?: boolean;
  defaultContextFiles?: VaultFile[];
  onContextChange?: (files: VaultFile[]) => void;
  mode?: string;
  onModeChange?: (mode: string) => void;
}

export function ChatInput({
  onSend,
  disabled,
  defaultContextFiles = [],
  onContextChange,
  mode = "chat",
  onModeChange,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [contextFiles, setContextFiles] = useState<VaultFile[]>(defaultContextFiles);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [selectedMode, setSelectedMode] = useState(mode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update context files when prop changes
  useEffect(() => {
    setContextFiles(defaultContextFiles);
  }, [defaultContextFiles]);

  // Update mode when prop changes
  useEffect(() => {
    setSelectedMode(mode);
  }, [mode]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, contextFiles, selectedMode);
    setValue("");
    textareaRef.current?.focus();
  };

  const handleModeChange = (newMode: string) => {
    setSelectedMode(newMode);
    onModeChange?.(newMode);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setValue(textarea.value);
    // Auto-grow textarea
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
  };

  const handleAddContext = (files: VaultFile[] | any[]) => {
    const filesToAdd = Array.isArray(files) ? files : [files];
    const updated = [...contextFiles, ...filesToAdd];
    setContextFiles(updated);
    onContextChange?.(updated);
    setShowContextSelector(false);
  };

  const handleRemoveContext = (path: string) => {
    const updated = contextFiles.filter((f) => f.path !== path);
    setContextFiles(updated);
    onContextChange?.(updated);
  };

  return (
    <div className={`rounded-xl border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring overflow-hidden transition-all ${disabled ? "ring-2 ring-primary/20" : ""}`}>
      {/* Mode selector */}
      <ChatModeSelector selectedMode={selectedMode} onModeChange={handleModeChange} />

      {/* Context chips */}
      {contextFiles.length > 0 && (
        <div className="border-b px-3 py-2 flex flex-wrap gap-2">
          {contextFiles.map((file) => (
            <div
              key={file.path}
              className="inline-flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs"
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => handleRemoveContext(file.path)}
                className="hover:text-foreground text-muted-foreground transition-colors"
                aria-label="Remove context"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea or Loading State */}
      {disabled ? (
        <div className="w-full min-h-[44px] flex items-center justify-center p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex gap-1">
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span className="ml-2">NovAI is crafting your response</span>
          </div>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask NovAI about your book..."
          className="w-full border-0 bg-transparent resize-none min-h-[44px] max-h-[160px] focus-visible:ring-0 p-3 font-normal text-sm"
          rows={1}
          disabled={disabled}
          style={{ overflow: "hidden" }}
        />
      )}

      {/* Toolbar */}
      <div className="border-t px-3 py-2 flex items-center justify-between bg-muted/30">
        {!disabled ? (
          <>
            <ContextSelector onSelect={handleAddContext} disabled={disabled}>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                className="h-8 px-2 text-xs"
              >
                <Paperclip className="h-3.5 w-3.5 mr-1" />
                Context
              </Button>
            </ContextSelector>

            <div className="text-xs text-muted-foreground">
              Shift+Enter for newline
            </div>

            <Button
              onClick={handleSend}
              disabled={disabled || !value.trim()}
              size="sm"
              className="h-8 px-2"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <div className="w-full flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>✨ Creating magic</span>
              <span className="inline-flex gap-1 ml-1">
                <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
