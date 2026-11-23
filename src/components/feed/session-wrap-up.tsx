"use client";

import { useState } from "react";
import Link from "next/link";
import { m } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MoodPicker } from "@/components/ui/mood-picker";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Stat } from "@/components/ui/stat";
import { spring } from "@/lib/motion";
import { formatDuration } from "@/lib/utils";
import { summarizeViews } from "@/lib/telemetry/session-recorder";
import type { PostSessionAnswers } from "@/lib/telemetry/build-session";
import type { FocusAfter, Mood, ViewEvent } from "@/types";

const moods: Mood[] = ["Happy", "Bored", "Stressed", "Anxious", "Lonely", "Tired", "Procrastinating", "Neutral"];
const focusOptions: FocusAfter[] = ["More focused", "Same", "Less focused"];

interface SessionWrapUpProps {
  views: ViewEvent[];
  durationSeconds: number;
  plannedMinutes: number;
  saved: boolean;
  /** Slot rendered once saved (the AI session autopsy). */
  afterSave?: React.ReactNode;
  onSave: (answers: PostSessionAnswers) => void;
  onAnother: () => void;
}

export function SessionWrapUp({ views, durationSeconds, plannedMinutes, saved, afterSave, onSave, onAnother }: SessionWrapUpProps) {
  const [moodAfter, setMoodAfter] = useState<Mood>("Neutral");
  const [urge, setUrge] = useState(5);
  const [focusAfter, setFocusAfter] = useState<FocusAfter>("Same");
  const summary = summarizeViews(views, durationSeconds * 1000);
  const overPlan = durationSeconds / 60 > plannedMinutes;

  return (
    <m.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <section className="space-y-6">
        <div>
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Session complete</div>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Here is what <em className="text-aurora pr-1 italic">actually happened.</em>
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat compact label="Duration" value={formatDuration(durationSeconds)} tone={overPlan ? "warning" : "default"} hint={`plan ${plannedMinutes} min`} />
          <Stat compact label="Videos" value={String(summary.videos)} hint={`${summary.videosPerMinute.toFixed(1)} / min`} />
          <Stat compact label="Quick skips" value={`${Math.round(summary.skipRate * 100)}%`} hint={`longest streak ${summary.longestSkipStreak}`} />
          <Stat compact label="Avg hold" value={`${summary.avgDwellSec.toFixed(1)}s`} hint={`${Math.round(summary.avgCompletion * 100)}% watched`} />
        </div>

        {saved ? (
          afterSave
        ) : (
          <div className="surface space-y-5 p-6">
            <h2 className="font-display text-xl font-medium tracking-tight">How do you feel now?</h2>
            <MoodPicker label="Mood after" value={moodAfter} options={moods} onChange={setMoodAfter} />
            <Field label="Do you feel like continuing?" hint={`${urge}/10`}>
              <Slider min={1} max={10} value={urge} onChange={(event) => setUrge(Number(event.target.value))} />
            </Field>
            <Field label="Focus after the session">
              <Select value={focusAfter} onChange={(event) => setFocusAfter(event.target.value as FocusAfter)}>
                {focusOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </Field>
            <Button size="lg" onClick={() => onSave({ moodAfter, urge, focusAfter })}>
              Save &amp; analyse my session
            </Button>
          </div>
        )}
      </section>

      <aside className="space-y-3">
        <Button variant="outline" className="w-full justify-between" onClick={onAnother}>
          Start another session <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button asChild variant="outline" className="w-full justify-between">
          <Link href="/tests">
            Take the brain tests <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild className="w-full justify-between">
          <Link href="/dashboard">
            See my dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </aside>
    </m.div>
  );
}
