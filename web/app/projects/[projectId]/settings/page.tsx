"use client";

import { use, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GENRES, TONES, POVS, TENSES, STYLES, PACINGS, DIALOGUE_STYLES, type WritingParameters } from "@/types";

export default function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const [wp, setWp] = useState<WritingParameters | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [promptPreview, setPromptPreview] = useState("");

  useEffect(() => {
    fetch(`/api/projects/params?projectId=${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setWp);
  }, [projectId]);

  useEffect(() => {
    if (!wp) return;
    fetch(`/api/projects/prompt?projectId=${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPromptPreview(d.prompt));
  }, [wp, projectId]);

  function update(key: keyof WritingParameters, value: string | number) {
    setWp((prev) => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }

  async function save() {
    if (!wp) return;
    setSaving(true);
    await fetch("/api/projects/params", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, params: wp }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!wp) return (
    <>
      <Header title="Settings" />
      <main className="flex-1 p-6 text-sm text-muted-foreground">Loading…</main>
    </>
  );

  return (
    <>
      <Header title="Settings" subtitle="Writing style configuration"
        actions={<Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}</Button>}
      />
      <main className="flex-1 overflow-auto p-6 max-w-3xl">
        <Tabs defaultValue="core">
          <TabsList className="mb-6">
            <TabsTrigger value="core">Core</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="preview">Prompt Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="core" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Essential Parameters</CardTitle><CardDescription>These settings have the strongest impact on how the AI writes.</CardDescription></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <SF label="Genre" value={wp.genre} options={[...GENRES]} onChange={(v) => update("genre", v)} />
                <SF label="Tone" value={wp.tone} options={[...TONES]} onChange={(v) => update("tone", v)} />
                <SF label="Point of View" value={wp.pov} options={[...POVS]} onChange={(v) => update("pov", v)} />
                <SF label="Tense" value={wp.tense} options={[...TENSES]} onChange={(v) => update("tense", v)} />
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">{[wp.genre, wp.tone, wp.pov, wp.tense].map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
          </TabsContent>

          <TabsContent value="style" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Prose Style</CardTitle><CardDescription>Fine-tune how the AI crafts sentences and scenes.</CardDescription></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <SF label="Prose Style" value={wp.style} options={[...STYLES]} onChange={(v) => update("style", v)} />
                <SF label="Pacing" value={wp.pacing} options={[...PACINGS]} onChange={(v) => update("pacing", v)} />
                <SF label="Dialogue Style" value={wp.dialogue_style} options={[...DIALOGUE_STYLES]} onChange={(v) => update("dialogue_style", v)} />
                <div className="space-y-2"><Label>Language</Label><Input value={wp.language} onChange={(e) => update("language", e.target.value)} /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Advanced</CardTitle><CardDescription>Custom instructions override everything else — use carefully.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Words per Chapter</Label>
                  <Input type="number" min={500} max={20000} step={500} value={wp.chapter_target_words}
                    onChange={(e) => update("chapter_target_words", parseInt(e.target.value) || 3000)} />
                  <p className="text-xs text-muted-foreground">Guides agent tasks — not a hard limit.</p>
                </div>
                <div className="space-y-2">
                  <Label>Style References</Label>
                  <Textarea rows={3} placeholder="e.g. 'Write like Ursula K. Le Guin — lyrical, with quiet authority'" value={wp.style_references} onChange={(e) => update("style_references", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Custom Instructions</Label>
                  <Textarea rows={5} placeholder="Any specific rules for the AI to always follow…" value={wp.custom_instructions} onChange={(e) => update("custom_instructions", e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader><CardTitle className="text-sm">System Prompt Preview</CardTitle><CardDescription>The exact prompt sent to Claude. Save then reload to refresh.</CardDescription></CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap rounded bg-muted p-4 text-xs leading-relaxed">{promptPreview || "Save your settings to generate a preview."}</pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function SF({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
