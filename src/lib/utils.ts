import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Frequency, Mood } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min = 0, max = 100) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function frequencyToScore(value?: Frequency) {
  const map: Record<Frequency, number> = {
    Never: 0,
    Rarely: 25,
    Sometimes: 50,
    Often: 75,
    Always: 100
  };
  return value ? map[value] : 0;
}

export function moodValence(mood?: Mood) {
  const map: Record<Mood, number> = {
    Happy: 2,
    Neutral: 0,
    Bored: -1,
    Tired: -1,
    Procrastinating: -1,
    Stressed: -2,
    Anxious: -2,
    Lonely: -2
  };
  return mood ? map[mood] : 0;
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}
