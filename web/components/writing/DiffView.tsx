"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DiffViewProps {
  before: string;
  after: string;
  className?: string;
}

type DiffLine =
  | { type: "same";    text: string }
  | { type: "removed"; text: string }
  | { type: "added";   text: string };

/** Very simple line-level diff (no external dependency). */
function lineDiff(before: string, after: string): DiffLine[] {
  const oldLines = before.split("\n");
  const newLines = after.split("\n");

  // LCS-based diff via dynamic programming
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: "same", text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "added", text: newLines[j - 1] });
      j--;
    } else {
      result.push({ type: "removed", text: oldLines[i - 1] });
      i--;
    }
  }
  return result.reverse();
}

export function DiffView({ before, after, className }: DiffViewProps) {
  const diff = useMemo(() => lineDiff(before, after), [before, after]);

  const addedCount = diff.filter((l) => l.type === "added").length;
  const removedCount = diff.filter((l) => l.type === "removed").length;

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-lg border", className)}>
      {/* Summary bar */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2 text-xs">
        <span className="text-green-600 font-medium">+{addedCount} added</span>
        <span className="text-destructive font-medium">−{removedCount} removed</span>
      </div>

      <ScrollArea className="flex-1">
        <pre className="text-xs font-mono leading-6">
          {diff.map((line, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-2 px-4",
                line.type === "added"   && "bg-green-500/10 text-green-700 dark:text-green-400",
                line.type === "removed" && "bg-destructive/10 text-destructive",
                line.type === "same"    && "text-muted-foreground"
              )}
            >
              <span className="w-4 shrink-0 select-none opacity-50">
                {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
              </span>
              <span className="whitespace-pre-wrap break-all">{line.text}</span>
            </div>
          ))}
        </pre>
      </ScrollArea>
    </div>
  );
}
