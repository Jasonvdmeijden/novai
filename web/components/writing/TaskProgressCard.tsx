"use client";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskProgressEvent } from "@/types";

interface TaskProgressCardProps {
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  message: string;
  output: string;
  error: string | null;
  events: TaskProgressEvent[];
  onCancel?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const STATUS_ICON = {
  idle: null,
  running: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <AlertCircle className="h-4 w-4 text-destructive" />,
  cancelled: <X className="h-4 w-4 text-muted-foreground" />,
};

const STATUS_LABEL: Record<string, string> = {
  idle: "Idle",
  running: "Running",
  completed: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  idle: "outline",
  running: "default",
  completed: "secondary",
  failed: "destructive",
  cancelled: "outline",
};

export function TaskProgressCard({
  status,
  progress,
  message,
  output,
  error,
  events,
  onCancel,
  onDismiss,
  className,
}: TaskProgressCardProps) {
  if (status === "idle") return null;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {STATUS_ICON[status]}
            <CardTitle className="text-sm">Agent Task</CardTitle>
            <Badge variant={STATUS_VARIANT[status]} className="text-xs">
              {STATUS_LABEL[status]}
            </Badge>
          </div>
          <div className="flex gap-1">
            {status === "running" && onCancel && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel} title="Cancel task">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            {(status === "completed" || status === "failed" || status === "cancelled") && onDismiss && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss} title="Dismiss">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress bar */}
        {status === "running" && (
          <>
            <Progress value={Math.round(progress * 100)} className="h-1.5" />
            <p className="text-xs text-muted-foreground">{message}</p>
          </>
        )}

        {/* Error */}
        {error && (
          <p className="rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {/* Output preview */}
        {output && (
          <ScrollArea className="h-40 rounded border bg-muted/30">
            <pre className="whitespace-pre-wrap p-3 text-xs leading-relaxed">{output}</pre>
          </ScrollArea>
        )}

        {/* Event log (collapsed, only when running) */}
        {status === "running" && events.length > 0 && (
          <div className="space-y-0.5">
            {events
              .filter((e) => e.type === "progress" && e.message)
              .slice(-3)
              .map((e, i) => (
                <p key={i} className="text-xs text-muted-foreground truncate">
                  · {e.message}
                </p>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
