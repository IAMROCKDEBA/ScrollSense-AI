"use client";

import { cn } from "@/lib/utils";
import type { Mood } from "@/types";

export const moodEmoji: Record<Mood, string> = {
  Happy: "😊",
  Neutral: "🙂",
  Bored: "😐",
  Tired: "😴",
  Procrastinating: "🙃",
  Stressed: "😣",
  Anxious: "😟",
  Lonely: "🥺"
};

interface MoodPickerProps {
  label: string;
  value: Mood;
  options: Mood[];
  onChange: (value: Mood) => void;
}

/** Accessible radio-group of mood chips (arrow-key friendly via native radios). */
export function MoodPicker({ label, value, options, onChange }: MoodPickerProps) {
  const name = `mood-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="text-[0.8125rem] font-medium leading-none tracking-wide text-foreground/90">{label}</legend>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-2">
        {options.map((mood) => {
          const selected = mood === value;
          return (
            <label
              key={mood}
              className={cn(
                "relative flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out active:scale-[0.97] has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/30",
                selected
                  ? "border-primary/60 bg-primary/[0.14] font-medium text-foreground shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.6)]"
                  : "border-foreground/10 bg-foreground/[0.03] text-foreground/80 hover:border-foreground/25 hover:bg-foreground/[0.06]"
              )}
            >
              <input
                type="radio"
                name={name}
                value={mood}
                checked={selected}
                onChange={() => onChange(mood)}
                className="sr-only"
              />
              <span className="text-lg leading-none" aria-hidden="true">
                {moodEmoji[mood]}
              </span>
              <span className="truncate">{mood}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
