"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, ChevronDown, FileText, Folder, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VaultFile } from "@/types";

interface ContextFile {
  path: string;
  body: string;
}

interface ContextSelectorProps {
  projectId?: string;
  onSelect: (files: VaultFile[] | ContextFile[]) => void;
  selectedPaths?: string[];
  disabled?: boolean;
  children?: React.ReactNode;
}

interface FileTreeNodeProps {
  file: VaultFile;
  projectId: string;
  depth: number;
  selectedPaths: Set<string>;
  onToggleSelect: (path: string, isDir: boolean) => void;
  expandedDirs: Set<string>;
  onToggleExpand: (path: string) => void;
}

function FileTreeNode({
  file,
  projectId,
  depth,
  selectedPaths,
  onToggleSelect,
  expandedDirs,
  onToggleExpand,
}: FileTreeNodeProps) {
  const isDir = file.type === "directory";
  const isExpanded = expandedDirs.has(file.path);
  const isSelected = selectedPaths.has(file.path);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggleSelect(file.path, isDir);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(file.path);
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 hover:bg-accent cursor-pointer text-sm",
          isSelected && "bg-primary/10"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDir ? (
          <button onClick={handleExpand} className="p-0 h-5 w-5 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelect}
          className="h-4 w-4 cursor-pointer"
        />

        {isDir ? (
          <Folder className="h-4 w-4 text-blue-500 shrink-0" />
        ) : (
          <FileText className="h-4 w-4 text-gray-500 shrink-0" />
        )}

        <span className="truncate flex-1">{file.name}</span>
      </div>

      {isDir && isExpanded && file.children && (
        <div>
          {file.children.map((child) => (
            <FileTreeNode
              key={child.path}
              file={child}
              projectId={projectId}
              depth={depth + 1}
              selectedPaths={selectedPaths}
              onToggleSelect={onToggleSelect}
              expandedDirs={expandedDirs}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ContextSelector({ projectId = "", onSelect, selectedPaths = [], disabled = false, children }: ContextSelectorProps) {
  const [vaultFiles, setVaultFiles] = useState<VaultFile | null>(null);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set(selectedPaths));
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadVaultFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ projectId });
      const res = await fetch(`/api/vault?${params}`);
      if (res.ok) {
        const data = await res.json();
        setVaultFiles(data);
        // Expand root by default
        if (data?.path) {
          setExpandedDirs(new Set([data.path]));
        }
      }
    } catch (err) {
      console.error("Failed to load vault files:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && !vaultFiles) {
      loadVaultFiles();
    }
  }, [isOpen, vaultFiles, loadVaultFiles]);

  const toggleSelectFile = useCallback(async (path: string, isDir: boolean) => {
    const newSelected = new Set(selectedSet);

    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      if (!isDir) {
        // Load file content
        try {
          const params = new URLSearchParams({ projectId, path });
          const res = await fetch(`/api/vault?${params}`);
          if (res.ok) {
            const data = await res.json();
            newSelected.add(path);
          }
        } catch (err) {
          console.error("Failed to load file:", err);
          return;
        }
      } else {
        newSelected.add(path);
      }
    }

    setSelectedSet(newSelected);
  }, [selectedSet, projectId]);

  const toggleExpand = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    const files: (ContextFile | VaultFile)[] = [];

    for (const path of Array.from(selectedSet)) {
      try {
        const params = new URLSearchParams({ projectId, path });
        const res = await fetch(`/api/vault?${params}`);
        if (res.ok) {
          const data = await res.json();
          // Return as VaultFile if possible, otherwise as ContextFile
          files.push({
            path,
            name: path.split("/").pop() || path,
            type: "file",
            body: data.body,
          });
        }
      } catch (err) {
        console.error(`Failed to load ${path}:`, err);
      }
    }

    onSelect(files as VaultFile[]);
    setIsOpen(false);
  }, [selectedSet, projectId, onSelect]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={disabled}>
        {children || (
          <Button variant="outline" size="sm">
            Add Context
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Files for Context</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {selectedSet.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedSet).map((path) => (
                <Badge
                  key={path}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <span className="truncate max-w-[200px]">{path}</span>
                  <button
                    onClick={() => {
                      const newSet = new Set(selectedSet);
                      newSet.delete(path);
                      setSelectedSet(newSet);
                    }}
                    className="ml-1 hover:bg-accent rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <ScrollArea className="border rounded-md h-[400px]">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading vault files...</div>
            ) : vaultFiles ? (
              <div className="p-2">
                <FileTreeNode
                  file={vaultFiles}
                  projectId={projectId}
                  depth={0}
                  selectedPaths={selectedSet}
                  onToggleSelect={toggleSelectFile}
                  expandedDirs={expandedDirs}
                  onToggleExpand={toggleExpand}
                />
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">No files available</div>
            )}
          </ScrollArea>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selectedSet.size === 0}>
              Add {selectedSet.size > 0 ? `(${selectedSet.size})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
