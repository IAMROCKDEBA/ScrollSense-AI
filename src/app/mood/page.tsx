"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createId } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { FocusAfter, Mood, MoodLog, WatchReason } from "@/types";

const moods: Mood[] = ["Happy", "Bored", "Stressed", "Anxious", "Lonely", "Tired", "Procrastinating", "Neutral"];
const reasons: WatchReason[] = ["Entertainment", "Boredom", "Stress relief", "Habit", "Procrastination", "Learning", "Motivation"];
const focusOptions: FocusAfter[] = ["More focused", "Same", "Less focused"];

export default function MoodPage() {
  const addMoodLog = useAppStore((state) => state.addMoodLog);
  const moodLogs = useAppStore((state) => state.moodLogs);
  const [draft, setDraft] = useState<Omit<MoodLog, "id" | "createdAt">>({
    moodBefore: "Neutral",
    reason: "Entertainment",
    moodAfter: "Neutral",
    urgeToContinueScore: 5,
    exceededPlannedTime: false,
    focusAfter: "Same"
  });

  function save() {
    addMoodLog({
      ...draft,
      id: createId("mood"),
      createdAt: new Date().toISOString()
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Mood Check-in</h1>
          <p className="mt-2 text-muted-foreground">
            Compare how you feel before and after watching. This helps estimate mood dependency risk.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/feed">
            Go to feed
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Before and after session</CardTitle>
            <CardDescription>You can also complete this inside the feed session.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Mood before">
                <MoodSelect value={draft.moodBefore ?? "Neutral"} onChange={(value) => setDraft((current) => ({ ...current, moodBefore: value }))} />
              </Field>
              <Field label="Reason for watching">
                <Select value={draft.reason} onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value as WatchReason }))}>
                  {reasons.map((reason) => (
                    <option key={reason}>{reason}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Mood after">
                <MoodSelect value={draft.moodAfter ?? "Neutral"} onChange={(value) => setDraft((current) => ({ ...current, moodAfter: value }))} />
              </Field>
              <Field label="Do you feel like continuing?">
                <input
                  className="w-full accent-sky-400"
                  type="range"
                  min={1}
                  max={10}
                  value={draft.urgeToContinueScore}
                  onChange={(event) => setDraft((current) => ({ ...current, urgeToContinueScore: Number(event.target.value) }))}
                />
                <div className="text-sm text-muted-foreground">Score: {draft.urgeToContinueScore}/10</div>
              </Field>
              <Field label="Did you exceed your planned time?">
                <Select
                  value={draft.exceededPlannedTime ? "Yes" : "No"}
                  onChange={(event) => setDraft((current) => ({ ...current, exceededPlannedTime: event.target.value === "Yes" }))}
                >
                  <option>Yes</option>
                  <option>No</option>
                </Select>
              </Field>
              <Field label="Do you feel more focused, same, or less focused?">
                <Select value={draft.focusAfter} onChange={(event) => setDraft((current) => ({ ...current, focusAfter: event.target.value as FocusAfter }))}>
                  {focusOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button onClick={save} className="w-full sm:w-fit">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Save mood log
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent check-ins</CardTitle>
            <CardDescription>Stored locally in this browser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {moodLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mood logs yet.</p>
            ) : (
              moodLogs.slice(-5).reverse().map((log) => (
                <div key={log.id} className="rounded-lg border bg-background/55 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{log.moodBefore ?? "Before"}</Badge>
                    <span className="text-muted-foreground">to</span>
                    <Badge variant="outline">{log.moodAfter ?? "After"}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Urge {log.urgeToContinueScore ?? 0}/10 • {log.reason ?? "No reason"} • {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MoodSelect({ value, onChange }: { value: Mood; onChange: (value: Mood) => void }) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value as Mood)}>
      {moods.map((mood) => (
        <option key={mood}>{mood}</option>
      ))}
    </Select>
  );
}
