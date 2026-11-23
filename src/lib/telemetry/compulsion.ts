import type { Mood, ViewEvent } from "@/types";
import { clamp, moodValence, round } from "@/lib/utils";
import { trailingSkipStreak } from "./session-recorder";

export type CompulsionLevel = "calm" | "drifting" | "compulsive";

export interface CompulsionComponent {
  key: "cadence" | "skipStreak" | "dwellDecay" | "overrun" | "lateNight" | "mood";
  label: string;
  /** Normalised 0..1 signal strength. */
  value: number;
  weight: number;
  /** value * weight * 100. */
  contribution: number;
  detail: string;
}

export interface CompulsionInput {
  views: ViewEvent[];
  elapsedSec: number;
  plannedMinutes: number;
  /** Local hour 0-23. */
  hour: number;
  moodBefore?: Mood;
}

export interface CompulsionReading {
  index: number;
  level: CompulsionLevel;
  components: CompulsionComponent[];
  /** Human-readable evidence lines for the strongest signals (shown to the user, cited by the AI). */
  evidence: string[];
}

const RECENT_WINDOW = 6;
const EARLY_WINDOW = 5;

export const WEIGHTS = {
  cadence: 0.3,
  skipStreak: 0.2,
  dwellDecay: 0.15,
  overrun: 0.2,
  lateNight: 0.08,
  mood: 0.07
} as const;

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function levelFor(index: number): CompulsionLevel {
  if (index >= 60) return "compulsive";
  if (index >= 35) return "drifting";
  return "calm";
}

/**
 * Live "Compulsion Index" (0-100): a transparent weighted blend of six behavioural signals.
 * Pure and deterministic so it can run every second in the browser and be unit-tested.
 */
export function computeCompulsion(input: CompulsionInput): CompulsionReading {
  const { views, elapsedSec, plannedMinutes, hour, moodBefore } = input;
  const recent = views.slice(-RECENT_WINDOW);
  const early = views.slice(0, EARLY_WINDOW);
  const recentDwell = mean(recent.map((view) => view.dwellMs / 1000));
  const earlyDwell = mean(early.map((view) => view.dwellMs / 1000));

  // Fast swiping: <=4s average dwell is maximal, >=20s is calm.
  const cadence = recent.length >= 3 ? clamp(((20 - recentDwell) / 16) * 100, 0, 100) / 100 : 0;
  const streak = trailingSkipStreak(views);
  const skipStreak = clamp(streak / 6, 0, 1);
  // Attention decay: recent dwell collapsing relative to the opening reels.
  const dwellDecay =
    views.length >= 10 && earlyDwell > 0 ? clamp((1 - recentDwell / earlyDwell) / 0.6, 0, 1) : 0;
  const plannedSec = Math.max(1, plannedMinutes * 60);
  const ratio = elapsedSec / plannedSec;
  const overrun = ratio < 0.8 ? 0 : clamp((ratio - 0.8) / 0.8, 0, 1);
  const lateNight = hour >= 0 && hour < 5 ? 1 : hour === 23 ? 0.7 : hour === 22 ? 0.4 : 0;
  const mood = clamp(-moodValence(moodBefore) / 2, 0, 1);

  const raw: Omit<CompulsionComponent, "contribution">[] = [
    {
      key: "cadence",
      label: "Swipe speed",
      value: cadence,
      weight: WEIGHTS.cadence,
      detail: recent.length >= 3 ? `Last ${recent.length} reels held for ${round(recentDwell, 1)}s on average` : "Not enough reels yet"
    },
    {
      key: "skipStreak",
      label: "Skip streak",
      value: skipStreak,
      weight: WEIGHTS.skipStreak,
      detail: `${streak} quick skip${streak === 1 ? "" : "s"} in a row`
    },
    {
      key: "dwellDecay",
      label: "Attention decay",
      value: dwellDecay,
      weight: WEIGHTS.dwellDecay,
      detail:
        views.length >= 10
          ? `Hold time fell from ${round(earlyDwell, 1)}s to ${round(recentDwell, 1)}s`
          : "Needs 10+ reels to measure"
    },
    {
      key: "overrun",
      label: "Plan overrun",
      value: overrun,
      weight: WEIGHTS.overrun,
      detail: `${round(ratio * 100)}% of the ${plannedMinutes}-minute plan used`
    },
    {
      key: "lateNight",
      label: "Late night",
      value: lateNight,
      weight: WEIGHTS.lateNight,
      detail: `Local time ${String(hour).padStart(2, "0")}:00`
    },
    {
      key: "mood",
      label: "Mood trigger",
      value: mood,
      weight: WEIGHTS.mood,
      detail: moodBefore ? `Started while feeling ${moodBefore.toLowerCase()}` : "No mood recorded"
    }
  ];

  const components = raw.map((component) => ({
    ...component,
    contribution: round(component.value * component.weight * 100, 1)
  }));
  const index = round(clamp(components.reduce((sum, component) => sum + component.contribution, 0)));

  const evidence = [...components]
    .filter((component) => component.value >= 0.4)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((component) => `${component.label}: ${component.detail}`);

  return { index, level: levelFor(index), components, evidence };
}
