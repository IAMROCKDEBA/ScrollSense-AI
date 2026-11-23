"use client";

import { useState } from "react";
import { m } from "framer-motion";
import { Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoodPicker } from "@/components/ui/mood-picker";
import { Scrolly } from "@/components/ui/scrolly";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { intentChips } from "@/lib/intent";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import type { SessionConfig } from "@/lib/telemetry/build-session";
import type { Mood, WatchReason } from "@/types";

const moods: Mood[] = ["Happy", "Bored", "Stressed", "Anxious", "Lonely", "Tired", "Procrastinating", "Neutral"];
const reasons: WatchReason[] = ["Entertainment", "Boredom", "Stress relief", "Habit", "Procrastination", "Learning", "Motivation"];
const presets = [5, 10, 15, 30];

interface IntentStudioProps {
  busy: boolean;
  /** Short status while the intent is being planned / the feed is being prepared. */
  statusLabel?: string;
  aiLive: boolean;
  /** Prefilled by the Coach (or any hand-off) before the studio mounts. */
  initial?: { goal: string; minutes: number } | null;
  onStart: (config: Omit<SessionConfig, "queries" | "mantra">) => void;
}

/** Pre-session ritual: say what you want from the scroll, set a budget, and let the agent plan the feed. */
export function IntentStudio({ busy, statusLabel, aiLive, initial, onStart }: IntentStudioProps) {
  const [goal, setGoal] = useState(initial?.goal ?? "");
  const [minutes, setMinutes] = useState(initial?.minutes ?? 10);
  const [mood, setMood] = useState<Mood>("Neutral");
  const [reason, setReason] = useState<WatchReason>("Entertainment");

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <m.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.soft}
        className="surface surface--raised relative overflow-hidden p-6 sm:p-8"
      >
        <div className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Intent Studio · {aiLive ? "Claude plans your feed" : "Offline planner"}
        </div>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          What do you want <em className="text-aurora pr-1 italic">from this scroll?</em>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Say it in your own words. An AI agent turns it into a curated feed, a time budget and guardrails, then
          watches over the session with you.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="intent-goal" className="text-[0.8125rem] font-medium tracking-wide text-foreground/90">
              Your goal <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="intent-goal"
              value={goal}
              maxLength={240}
              rows={3}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="e.g. Exam tomorrow, I need 10 minutes to calm down and then learn something useful"
              className="mt-2"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {intentChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setGoal(chip.goal);
                    setMinutes(chip.minutes);
                  }}
                  className="focus-ring rounded-full border border-foreground/12 bg-foreground/[0.04] px-3.5 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/[0.09]"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <fieldset>
            <legend className="text-[0.8125rem] font-medium tracking-wide text-foreground/90">Time budget</legend>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Time budget in minutes">
              {presets.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={minutes === value}
                  onClick={() => setMinutes(value)}
                  className={cn(
                    "focus-ring h-12 min-w-16 rounded-2xl border px-4 text-sm font-medium tabular-nums transition-colors",
                    minutes === value
                      ? "border-primary/60 bg-primary/[0.14] text-foreground"
                      : "border-foreground/10 bg-foreground/[0.03] text-foreground/80 hover:bg-foreground/[0.07]"
                  )}
                >
                  {value} min
                </button>
              ))}
            </div>
          </fieldset>

          <MoodPicker label="How are you feeling right now?" value={mood} options={moods} onChange={setMood} />

          <div>
            <label htmlFor="intent-reason" className="text-[0.8125rem] font-medium tracking-wide text-foreground/90">
              What is pulling you in?
            </label>
            <Select id="intent-reason" className="mt-2" value={reason} onChange={(event) => setReason(event.target.value as WatchReason)}>
              {reasons.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </div>

          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => onStart({ plannedMinutes: minutes, moodBefore: mood, reason, goal: goal.trim() || undefined })}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {busy ? statusLabel || "Preparing your feed…" : "Plan my feed & start"}
          </Button>
        </div>
      </m.section>

      <aside className="surface p-6">
        <Scrolly mood={busy ? "breathing" : "calm"} size={120} className="mx-auto" />
        <h2 className="mt-4 text-center font-display text-lg font-medium tracking-tight">How this works</h2>
        <ol className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
          <li><span className="font-medium text-foreground">1 · Plan.</span> Your intent becomes a curated Shorts feed and guardrails.</li>
          <li><span className="font-medium text-foreground">2 · Scroll.</span> Real swipe, dwell and skip behaviour is measured on-device.</li>
          <li><span className="font-medium text-foreground">3 · Guard.</span> A live agent nudges you when scrolling turns compulsive.</li>
          <li><span className="font-medium text-foreground">4 · Reflect.</span> An autopsy explains what actually happened.</li>
        </ol>
      </aside>
    </div>
  );
}
