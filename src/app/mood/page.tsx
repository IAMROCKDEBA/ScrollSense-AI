"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { MoodPicker, moodEmoji } from "@/components/ui/mood-picker";
import { PageHeader } from "@/components/ui/page-header";
import { Scrolly } from "@/components/ui/scrolly";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { createId } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { FocusAfter, Mood, MoodLog, WatchReason } from "@/types";

const moods: Mood[] = ["Happy", "Bored", "Stressed", "Anxious", "Lonely", "Tired", "Procrastinating", "Neutral"];
const reasons: WatchReason[] = ["Entertainment", "Boredom", "Stress relief", "Habit", "Procrastination", "Learning", "Motivation"];
const focusOptions: FocusAfter[] = ["More focused", "Same", "Less focused"];

export default function MoodPage() {
  const addMoodLog = useAppStore((state) => state.addMoodLog);
  const moodLogs = useAppStore((state) => state.moodLogs);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Omit<MoodLog, "id" | "createdAt">>({
    moodBefore: "Neutral",
    reason: "Entertainment",
    moodAfter: "Neutral",
    urgeToContinueScore: 5,
    exceededPlannedTime: false,
    focusAfter: "Same"
  });

  function save() {
    if (isSaving) return;
    setIsSaving(true);
    setSaveMessage("Saved. Opening video session...");

    try {
      addMoodLog({
        ...draft,
        id: createId("mood"),
        createdAt: new Date().toISOString()
      });
      window.setTimeout(() => {
        window.location.href = "/feed";
      }, 150);
    } catch {
      setSaveMessage("The check-in could not be saved in this browser. Try refreshing once.");
      setIsSaving(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Step 2 · Mood"
        title={
          <>
            How do you <em className="text-aurora pr-1 italic">feel?</em>
          </>
        }
        description="Compare how you feel before and after watching. This helps estimate mood dependency risk."
        actions={
          <Button asChild variant="outline">
            <Link href="/feed">
              Go to feed
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_0.7fr]">
        <Card variant="raised">
          <CardHeader>
            <CardTitle>Before and after session</CardTitle>
            <CardDescription>You can also complete this inside the feed session.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/feed" method="get" onSubmit={onSubmit} className="grid gap-7">
              {saveMessage ? (
                <div className="rounded-2xl border border-success/40 bg-success/[0.1] p-4 text-sm font-medium text-success-foreground" role="status">
                  {saveMessage}
                </div>
              ) : null}

              <MoodPicker
                label="Mood before"
                value={draft.moodBefore ?? "Neutral"}
                options={moods}
                onChange={(value) => setDraft((current) => ({ ...current, moodBefore: value }))}
              />
              <MoodPicker
                label="Mood after"
                value={draft.moodAfter ?? "Neutral"}
                options={moods}
                onChange={(value) => setDraft((current) => ({ ...current, moodAfter: value }))}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Reason for watching">
                  <Select value={draft.reason} onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value as WatchReason }))}>
                    {reasons.map((reason) => (
                      <option key={reason}>{reason}</option>
                    ))}
                  </Select>
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
                <Field
                  label="Do you feel like continuing?"
                  hint={`Score: ${draft.urgeToContinueScore}/10`}
                >
                  <Slider
                    min={1}
                    max={10}
                    value={draft.urgeToContinueScore}
                    onChange={(event) => setDraft((current) => ({ ...current, urgeToContinueScore: Number(event.target.value) }))}
                  />
                </Field>
                <Field label="Do you feel more focused, same, or less focused?">
                  <Select value={draft.focusAfter} onChange={(event) => setDraft((current) => ({ ...current, focusAfter: event.target.value as FocusAfter }))}>
                    {focusOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Button type="submit" size="lg" disabled={isSaving} className="w-full sm:w-fit">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {isSaving ? "Saving..." : "Save mood log and continue"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent check-ins</CardTitle>
            <CardDescription>Stored locally in this browser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {moodLogs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Scrolly mood="calm" size={100} />
                <p className="text-sm text-muted-foreground">No mood logs yet. Your first check-in will appear here.</p>
              </div>
            ) : (
              moodLogs.slice(-5).reverse().map((log) => (
                <div key={log.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      <span aria-hidden="true">{log.moodBefore ? moodEmoji[log.moodBefore] : ""}</span> {log.moodBefore ?? "Before"}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-label="to" />
                    <Badge variant="outline">
                      <span aria-hidden="true">{log.moodAfter ? moodEmoji[log.moodAfter] : ""}</span> {log.moodAfter ?? "After"}
                    </Badge>
                  </div>
                  <div className="mt-2.5 text-xs leading-5 text-muted-foreground">
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
