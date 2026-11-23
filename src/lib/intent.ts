import type { Mood } from "@/types";
import { clamp } from "@/lib/utils";

export type IntentTone = "calm" | "curious" | "playful" | "focused";

export interface IntentPlan {
  queries: string[];
  plannedMinutes: number;
  tone: IntentTone;
  guardrails: string[];
  mantra: string;
  source: "ai" | "offline";
}

interface Rule {
  match: RegExp;
  tone: IntentTone;
  queries: string[];
  mantra: string;
}

const rules: Rule[] = [
  {
    match: /calm|relax|stress|anx|sleep|peace|unwind|tired|overwhelm/i,
    tone: "calm",
    queries: ["calm nature", "relaxing satisfying", "breathing exercise"],
    mantra: "Slow is the point. Let your shoulders drop."
  },
  {
    match: /learn|study|exam|science|fact|knowledge|educat|understand|explain/i,
    tone: "curious",
    queries: ["science facts", "explained simply", "study tips"],
    mantra: "One new idea beats ten forgotten clips."
  },
  {
    match: /laugh|funny|fun\b|humou?r|comedy|joke|meme/i,
    tone: "playful",
    queries: ["funny moments", "comedy skits"],
    mantra: "Enjoy it, then actually stop."
  },
  {
    match: /motiv|inspir|focus|product|goal|discipline|work/i,
    tone: "focused",
    queries: ["study motivation", "productivity tips"],
    mantra: "Fuel up for the thing you actually care about."
  },
  {
    match: /tech|code|program|gadget|\bai\b|software/i,
    tone: "curious",
    queries: ["tech explained", "coding tips"],
    mantra: "Curiosity with a finish line."
  }
];

const moodTone: Partial<Record<Mood, IntentTone>> = {
  Stressed: "calm",
  Anxious: "calm",
  Tired: "calm",
  Lonely: "calm",
  Bored: "playful",
  Procrastinating: "focused"
};

/** Deterministic intent planner used offline and as the safety net behind the AI planner. */
export function fallbackIntent(goal: string, minutes: number, mood: Mood): IntentPlan {
  const text = goal.trim();
  const matched = rules.filter((rule) => rule.match.test(text));
  const tone = matched[0]?.tone ?? moodTone[mood] ?? "curious";
  const queries = matched.length
    ? [...new Set(matched.flatMap((rule) => rule.queries))].slice(0, 4)
    : rules.find((rule) => rule.tone === tone)?.queries ?? ["mind blowing facts", "science facts"];

  return {
    queries,
    plannedMinutes: clamp(Math.round(minutes), 1, 120),
    tone,
    guardrails: [
      `Stop at ${clamp(Math.round(minutes), 1, 120)} minutes — set a timer you can see.`,
      "If you catch yourself swiping without watching, take the breathing break.",
      "End the session on a video you enjoyed, not one you are escaping from."
    ],
    mantra: matched[0]?.mantra ?? "Decide first, then scroll.",
    source: "offline"
  };
}

export const intentChips = [
  { label: "Unwind for 10 min", goal: "I want to relax and unwind for a few minutes", minutes: 10 },
  { label: "Learn something quick", goal: "Teach me something interesting I can use", minutes: 10 },
  { label: "Need a laugh", goal: "I just want to laugh for a bit", minutes: 5 },
  { label: "Get motivated", goal: "I need motivation to start studying", minutes: 5 }
] as const;
