"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { GENRES, TONES, POVS, TENSES, STYLES, PACINGS } from "@/types";
import type { WritingParameters } from "@/types";

type PartialParams = Partial<Pick<WritingParameters,
  "genre" | "tone" | "pov" | "tense" | "style" | "pacing" | "chapter_target_words"
>>;

interface ParameterOverridePanelProps {
  onChange: (overrides: PartialParams) => void;
}

const OVERRIDE_FIELDS: Array<{
  key: keyof PartialParams;
  label: string;
  options?: readonly string[];
  type?: "number";
}> = [
  { key: "genre",                  label: "Genre",      options: GENRES },
  { key: "tone",                   label: "Tone",       options: TONES },
  { key: "pov",                    label: "POV",        options: POVS },
  { key: "tense",                  label: "Tense",      options: TENSES },
  { key: "style",                  label: "Style",      options: STYLES },
  { key: "pacing",                 label: "Pacing",     options: PACINGS },
  { key: "chapter_target_words",   label: "Word target", type: "number" },
];

export function ParameterOverridePanel({ onChange }: ParameterOverridePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [overrides, setOverrides] = useState<PartialParams>({});

  function set(key: keyof PartialParams, value: string | number | undefined) {
    const next = { ...overrides };
    if (value === undefined || value === "") {
      delete next[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
    setOverrides(next);
    onChange(next);
  }

  const activeCount = Object.keys(overrides).length;

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-accent transition-colors rounded-lg"
      >
        <span className="flex items-center gap-2 font-medium">
          Parameter Overrides
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-xs">{activeCount} active</Badge>
          )}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Override writing parameters for this task only. Leave blank to use project defaults.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {OVERRIDE_FIELDS.map(({ key, label, options, type }) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{label}</Label>
                  {overrides[key] !== undefined && (
                    <button
                      type="button"
                      onClick={() => set(key, undefined)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {options ? (
                  <Select
                    value={(overrides[key] as string) ?? ""}
                    onValueChange={(v) => set(key, v || undefined)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Use default" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((o) => (
                        <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    placeholder="Use default"
                    value={(overrides[key] as number | undefined) ?? ""}
                    onChange={(e) => set(key, e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                )}
              </div>
            ))}
          </div>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => { setOverrides({}); onChange({}); }}
            >
              Clear all overrides
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
