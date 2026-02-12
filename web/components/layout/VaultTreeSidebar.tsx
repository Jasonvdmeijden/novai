"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FileText, Folder, ChevronRight, ChevronDown, RefreshCw, Trash2, FilePlus, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResize } from "@/hooks/useResize";

interface VaultNode {
  path: string;
  name: string;
  type: "file" | "directory";
  children?: VaultNode[];
}

interface VaultTreeSidebarProps {
  projectId: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: VaultNode | null;
}

interface DialogState {
  type: "newfile" | "newfolder" | "rename" | "move" | "delete" | null;
  node: VaultNode | null;
  value: string;
  parentPath?: string;
}

function FileTree({
  node,
  depth,
  onSelect,
  currentPath,
  onContextMenu,
  onRenameStart,
  renamingPath,
  onRenameSave,
}: {
  node: VaultNode;
  depth: number;
  onSelect: (path: string) => void;
  currentPath?: string;
  onContextMenu: (e: React.MouseEvent, node: VaultNode) => void;
  onRenameStart: (path: string) => void;
  renamingPath: string | null;
  onRenameSave: (oldPath: string, newName: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [renameValue, setRenameValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDir = node.type === "directory";
  const isActive = currentPath === node.path;
  const isRenaming = renamingPath === node.path;

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameSubmit = () => {
    const newName = renameValue.trim();
    if (newName && newName !== node.name) {
      const newPath = node.path.substring(0, node.path.lastIndexOf("/") + 1) + newName;
      onRenameSave(node.path, newPath);
    }
    setRenameValue(node.name);
  };

  return (
    <div>
      <div
        onContextMenu={(e) => onContextMenu(e, node)}
        className="group relative"
      >
        {isRenaming ? (
          <div
            className="flex w-full items-center gap-2 px-2 py-1"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <span className="w-3.5" />
            <Input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") setRenameValue(node.name);
              }}
              onBlur={handleRenameSubmit}
              className="h-6 px-1 py-0 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : (
          <button
            onClick={() => (isDir ? setExpanded(!expanded) : onSelect(node.path))}
            className={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent text-left transition-colors",
              isActive && "bg-primary/20 font-medium"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {isDir ? (
              <>
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <Folder className="h-4 w-4 shrink-0 text-primary" />
              </>
            ) : (
              <>
                <span className="w-3.5" />
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              </>
            )}
            <span className="truncate">{node.name}</span>
          </button>
        )}
      </div>
      {isDir && expanded && node.children?.map((child) => (
        <FileTree
          key={child.path}
          node={child}
          depth={depth + 1}
          onSelect={onSelect}
          currentPath={currentPath}
          onContextMenu={onContextMenu}
          onRenameStart={onRenameStart}
          renamingPath={renamingPath}
          onRenameSave={onRenameSave}
        />
      ))}
    </div>
  );
}

export function VaultTreeSidebar({ projectId }: VaultTreeSidebarProps) {
  const [tree, setTree] = useState<VaultNode | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  });
  const [dialog, setDialog] = useState<DialogState>({
    type: null,
    node: null,
    value: "",
  });
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { size, handleMouseDown } = useResize(224, 160, 400, "right");

  const currentPath = pathname.includes("/vault/")
    ? decodeURIComponent(pathname.split("/vault/")[1])
    : undefined;

  const loadTree = useCallback(async () => {
    try {
      const res = await fetch(`/api/vault?projectId=${projectId}`);
      if (res.ok) setTree(await res.json());
    } catch (error) {
      console.error("Failed to load vault tree:", error);
    }
  }, [projectId]);

  // Auto-poll every 5s
  useEffect(() => {
    loadTree();
    const interval = setInterval(loadTree, 5000);
    return () => clearInterval(interval);
  }, [projectId, loadTree]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTree();
    setIsRefreshing(false);
  };

  const handleContextMenu = (e: React.MouseEvent, node: VaultNode) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleSelect = (path: string) => {
    router.push(`/projects/${projectId}/vault/${encodeURIComponent(path)}`);
  };

  // Dialog handlers
  const openDialog = (type: DialogState["type"], node: VaultNode | null = contextMenu.node, parentPath?: string) => {
    closeContextMenu();
    setDialog({
      type,
      node,
      value: "",
      parentPath,
    });
  };

  const closeDialog = () => {
    setDialog({ type: null, node: null, value: "" });
  };

  const handleNewFile = async () => {
    if (!dialog.value.trim() || !dialog.node) return;
    const newPath = dialog.node.path + "/" + dialog.value;
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "newfile", path: newPath }),
      });
      if (res.ok) {
        closeDialog();
        await loadTree();
      }
    } catch (error) {
      console.error("Failed to create file:", error);
    }
  };

  const handleNewFolder = async () => {
    if (!dialog.value.trim() || !dialog.node) return;
    const newPath = dialog.node.path + "/" + dialog.value;
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mkdir", path: newPath }),
      });
      if (res.ok) {
        closeDialog();
        await loadTree();
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  const handleRename = async (oldPath: string, newPath: string) => {
    try {
      const res = await fetch("/api/vault", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", oldPath, newPath }),
      });
      if (res.ok) {
        setRenamingPath(null);
        await loadTree();
      }
    } catch (error) {
      console.error("Failed to rename:", error);
    }
  };

  const handleDelete = async () => {
    if (!dialog.node) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/vault", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: dialog.node.path }),
      });
      if (res.ok) {
        closeDialog();
        await loadTree();
      } else {
        console.error(`Delete failed: ${res.status} ${res.statusText}`);
        alert(`Failed to delete: ${res.statusText}`);
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex relative">
        {/* Sidebar */}
        <nav className="flex flex-col border-r bg-muted/30 overflow-hidden" style={{ width: `${size}px` }}>
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Files</p>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => tree && openDialog("newfile", tree)}
                className="h-5 w-5"
              >
                <FilePlus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => tree && openDialog("newfolder", tree)}
                className="h-5 w-5"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-5 w-5"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {tree ? (
                <FileTree
                  node={tree}
                  depth={0}
                  onSelect={handleSelect}
                  currentPath={currentPath}
                  onContextMenu={handleContextMenu}
                  onRenameStart={setRenamingPath}
                  renamingPath={renamingPath}
                  onRenameSave={handleRename}
                />
              ) : (
                <div className="text-xs text-muted-foreground p-2">Loading...</div>
              )}
            </div>
          </ScrollArea>
        </nav>

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1 cursor-col-resize hover:bg-primary/30 transition-colors"
        />
      </div>

      {/* Context Menu Portal */}
      {contextMenu.visible && contextMenu.node && (
        <div
          className="fixed z-50"
          style={{
            left: `${Math.max(10, Math.min(contextMenu.x, window.innerWidth - 180))}px`,
            top: `${Math.max(10, Math.min(contextMenu.y, window.innerHeight - 180))}px`,
          }}
          onMouseLeave={closeContextMenu}
        >
          <div className="bg-background border rounded-lg shadow-lg overflow-hidden">
            {contextMenu.node.type === "directory" && (
              <>
                <button
                  onClick={() => openDialog("newfile", contextMenu.node)}
                  className="w-full px-4 py-2 text-sm hover:bg-accent text-left transition-colors"
                >
                  New File
                </button>
                <button
                  onClick={() => openDialog("newfolder", contextMenu.node)}
                  className="w-full px-4 py-2 text-sm hover:bg-accent text-left transition-colors"
                >
                  New Folder
                </button>
              </>
            )}
            <button
              onClick={() => {
                closeContextMenu();
                setRenamingPath(contextMenu.node?.path || null);
              }}
              className="w-full px-4 py-2 text-sm hover:bg-accent text-left transition-colors"
            >
              Rename
            </button>
            <button
              onClick={() => openDialog("move", contextMenu.node)}
              className="w-full px-4 py-2 text-sm hover:bg-accent text-left transition-colors"
            >
              Move
            </button>
            <button
              onClick={() => openDialog("delete", contextMenu.node)}
              className="w-full px-4 py-2 text-sm hover:bg-accent text-left transition-colors text-destructive"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu.visible && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
          onContextMenu={(e) => e.preventDefault()}
        />
      )}

      {/* Dialogs */}
      <Dialog open={dialog.type === "newfile"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Filename (e.g., chapter-1.md)"
              value={dialog.value}
              onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNewFile();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleNewFile} disabled={!dialog.value.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.type === "newfolder"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Folder name"
              value={dialog.value}
              onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNewFolder();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleNewFolder} disabled={!dialog.value.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.type === "delete"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              Are you sure you want to delete <strong>{dialog.node?.name}</strong>?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.type === "move"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select destination folder for <strong>{dialog.node?.name}</strong>
            </p>
            {/* Simple folder picker - shows top-level folders */}
            {tree?.children && (
              <div className="border rounded-lg p-2 max-h-60 overflow-y-auto">
                {tree.children
                  .filter((child) => child.type === "directory")
                  .map((folder) => (
                    <button
                      key={folder.path}
                      onClick={() => {
                        if (dialog.node) {
                          const destPath = folder.path + "/" + dialog.node.name;
                          fetch("/api/vault", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "move",
                              srcPath: dialog.node.path,
                              destDir: folder.path,
                            }),
                          })
                            .then(() => {
                              closeDialog();
                              loadTree();
                            })
                            .catch((err) => console.error("Failed to move:", err));
                        }
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded transition-colors"
                    >
                      📁 {folder.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
