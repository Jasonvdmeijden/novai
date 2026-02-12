"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ParameterOverridePanel } from "./ParameterOverridePanel";
import { TaskProgressCard } from "./TaskProgressCard";
import { useAgentTask } from "@/hooks/useAgentTask";
import { Wand2, ChevronRight, ChevronLeft } from "lucide-react";
import type { TaskType } from "@/types";

// ── Task config definitions ──────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number";
  placeholder?: string;
  required?: boolean;
}

interface TaskConfig {
  label: string;
  description: string;
  fields: FieldDef[];
}

const TASK_CONFIGS: Record<string, TaskConfig> = {
  chapter_write: {
    label: "Write Chapter",
    description: "Generate a full chapter draft based on your plot brief.",
    fields: [
      { key: "chapter_number", label: "Chapter Number", type: "number", required: true },
      { key: "title",          label: "Chapter Title",  type: "text",   placeholder: "The Storm", required: true },
      { key: "file_path",      label: "Save Path",      type: "text",   placeholder: "04-Chapters/Chapter-01.md" },
      { key: "brief",          label: "Scene Brief / Plot Beats", type: "textarea", placeholder: "Describe what happens…", required: true },
    ],
  },
  chapter_edit: {
    label: "Edit Chapter",
    description: "Revise and improve an existing chapter's prose.",
    fields: [
      { key: "file_path",     label: "Vault File Path", type: "text",     placeholder: "04-Chapters/Chapter-01.md", required: true },
      { key: "instructions",  label: "Instructions",    type: "textarea", placeholder: "Tighten the pacing in the opening…" },
    ],
  },
  character_develop: {
    label: "Develop Character",
    description: "Build out a rich, three-dimensional character profile.",
    fields: [
      { key: "name",      label: "Character Name", type: "text",     required: true },
      { key: "file_path", label: "Save Path",      type: "text",     placeholder: "02-Characters/Hero.md" },
      { key: "role",      label: "Story Role",     type: "text",     placeholder: "Protagonist" },
      { key: "brief",     label: "Known Facts",    type: "textarea", placeholder: "What you already know about this character…" },
    ],
  },
  worldbuild: {
    label: "Build World Detail",
    description: "Create detailed worldbuilding content for a specific topic.",
    fields: [
      { key: "topic",     label: "Topic",     type: "text",     placeholder: "Magic System", required: true },
      { key: "file_path", label: "Save Path", type: "text",     placeholder: "03-Worldbuilding/Magic-System.md" },
      { key: "brief",     label: "Seed Notes", type: "textarea", placeholder: "Key constraints or ideas to incorporate…" },
    ],
  },
  outline: {
    label: "Generate Outline",
    description: "Create a structured chapter-by-chapter book outline.",
    fields: [
      { key: "premise",        label: "Premise",          type: "textarea", placeholder: "One paragraph story premise…", required: true },
      { key: "chapter_count",  label: "Number of Chapters", type: "number" },
      { key: "file_path",      label: "Save Path",        type: "text",     placeholder: "01-Overview/Outline.md" },
    ],
  },
  continuity_check: {
    label: "Research Topic",
    description: "Research a subject for your book and save findings.",
    fields: [
      { key: "topic",     label: "Research Topic", type: "text",     required: true },
      { key: "file_path", label: "Save Path",      type: "text",     placeholder: "06-Reference/Topic.md" },
      { key: "questions", label: "Specific Questions (one per line)", type: "textarea" },
    ],
  },
};

// ── Wizard component ─────────────────────────────────────────────────────────

interface TaskWizardProps {
  projectId: string;
  defaultTaskType?: TaskType;
  trigger?: React.ReactNode;
  onComplete?: (output: string, taskId: string) => void;
}

type Step = "configure" | "confirm" | "watch";

export function TaskWizard({
  projectId,
  defaultTaskType = "chapter_write",
  trigger,
  onComplete,
}: TaskWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("configure");
  const [taskType, setTaskType] = useState<TaskType>(defaultTaskType);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});

  const task = useAgentTask({
    onComplete: (output, taskId) => {
      onComplete?.(output, taskId);
    },
  });

  const config = TASK_CONFIGS[taskType];

  function handleClose() {
    if (task.status === "running") return; // don't close mid-task
    setOpen(false);
    setTimeout(() => {
      setStep("configure");
      setFieldValues({});
      setOverrides({});
      task.reset();
    }, 200);
  }

  function buildInput(): Record<string, unknown> {
    const input: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fieldValues)) {
      if (!v) continue;
      const fieldDef = config.fields.find((f) => f.key === k);
      if (fieldDef?.type === "number") {
        input[k] = parseInt(v) || undefined;
      } else if (k === "questions") {
        input[k] = v.split("\n").map((s) => s.trim()).filter(Boolean);
      } else {
        input[k] = v;
      }
    }
    return input;
  }

  function canAdvance(): boolean {
    return config.fields
      .filter((f) => f.required)
      .every((f) => fieldValues[f.key]?.trim());
  }

  async function startTask() {
    setStep("watch");
    await task.submit(taskType, buildInput(), projectId, Object.keys(overrides).length ? overrides : undefined);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Wand2 className="mr-2 h-4 w-4" />
            AI Task
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.label}
            <Badge variant="outline" className="text-xs font-normal">
              {step === "configure" ? "1 / 3 Configure" : step === "confirm" ? "2 / 3 Review" : "3 / 3 Running"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Configure ── */}
        {step === "configure" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{config.description}</p>

            {/* Task type selector */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(TASK_CONFIGS).map(([type, cfg]) => (
                <button
                  key={type}
                  onClick={() => { setTaskType(type as TaskType); setFieldValues({}); }}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    taskType === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            <Separator />

            {config.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-sm">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    rows={3}
                    placeholder={field.placeholder}
                    value={fieldValues[field.key] ?? ""}
                    onChange={(e) => setFieldValues((p) => ({ ...p, [field.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={fieldValues[field.key] ?? ""}
                    onChange={(e) => setFieldValues((p) => ({ ...p, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            <ParameterOverridePanel onChange={setOverrides} />

            <div className="flex justify-end">
              <Button onClick={() => setStep("confirm")} disabled={!canAdvance()}>
                Review
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Confirm ── */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
              <p className="font-medium">{config.label}</p>
              {Object.entries(buildInput()).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs">
                  <span className="text-muted-foreground w-28 shrink-0">{k}:</span>
                  <span className="break-all">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                </div>
              ))}
              {Object.keys(overrides).length > 0 && (
                <>
                  <Separator className="my-1" />
                  <p className="text-xs text-muted-foreground">Overrides: {Object.keys(overrides).join(", ")}</p>
                </>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("configure")}>
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
              <Button onClick={startTask}>
                <Wand2 className="mr-2 h-4 w-4" />
                Start Task
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Watch ── */}
        {step === "watch" && (
          <div className="space-y-4">
            <TaskProgressCard
              status={task.status}
              progress={task.progress}
              message={task.message}
              output={task.output}
              error={task.error}
              events={task.events}
              onCancel={task.cancel}
            />

            {(task.status === "completed" || task.status === "failed" || task.status === "cancelled") && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { task.reset(); setStep("configure"); }}>
                  New Task
                </Button>
                <Button onClick={handleClose}>Done</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
