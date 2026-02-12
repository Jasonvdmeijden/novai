"use client";

import { useState, useCallback, useRef } from "react";
import type { TaskProgressEvent, TaskType } from "@/types";

interface TaskState {
  taskId: string | null;
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  message: string;
  output: string;
  error: string | null;
  events: TaskProgressEvent[];
}

const INITIAL: TaskState = {
  taskId: null,
  status: "idle",
  progress: 0,
  message: "",
  output: "",
  error: null,
  events: [],
};

interface UseAgentTaskOptions {
  onComplete?: (output: string, taskId: string) => void;
  onError?: (error: string) => void;
}

export function useAgentTask(options: UseAgentTaskOptions = {}) {
  const [state, setState] = useState<TaskState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(
    async (
      taskType: TaskType,
      input: Record<string, unknown>,
      projectId: string,
      parameterOverrides?: Record<string, unknown>
    ) => {
      // Cancel any running task first
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setState({ ...INITIAL, status: "running", message: "Submitting…" });

      try {
        const res = await fetch(`/api/agent?type=${taskType}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId, input, parameter_overrides: parameterOverrides }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event: TaskProgressEvent = JSON.parse(line.slice(6));

              setState((prev) => {
                const events = [...prev.events, event];
                const taskId = event.task_id || prev.taskId;

                if (event.type === "progress") {
                  return {
                    ...prev,
                    taskId,
                    events,
                    progress: event.progress ?? prev.progress,
                    message: event.message ?? prev.message,
                  };
                }

                if (event.type === "output") {
                  return {
                    ...prev,
                    taskId,
                    events,
                    output: prev.output + (event.content ?? ""),
                  };
                }

                if (event.type === "complete") {
                  options.onComplete?.(event.content ?? prev.output, taskId ?? "");
                  return {
                    ...prev,
                    taskId,
                    events,
                    status: "completed",
                    progress: 1,
                    message: event.message ?? "Done",
                    output: event.content ?? prev.output,
                  };
                }

                if (event.type === "error") {
                  options.onError?.(event.error ?? "Unknown error");
                  return {
                    ...prev,
                    taskId,
                    events,
                    status: "failed",
                    error: event.error ?? "Unknown error",
                    message: "Failed",
                  };
                }

                return { ...prev, taskId, events };
              });
            } catch {
              // skip malformed lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setState((prev) => ({ ...prev, status: "cancelled", message: "Cancelled" }));
        } else {
          const msg = (err as Error).message;
          options.onError?.(msg);
          setState((prev) => ({ ...prev, status: "failed", error: msg, message: "Failed" }));
        }
      }
    },
    [options]
  );

  const cancel = useCallback(async () => {
    abortRef.current?.abort();
    const { taskId } = state;
    if (taskId) {
      await fetch(`/api/agent/${taskId}/stream`, { method: "POST" });
    }
    setState((prev) => ({ ...prev, status: "cancelled", message: "Cancelled" }));
  }, [state]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL);
  }, []);

  return { ...state, submit, cancel, reset };
}
