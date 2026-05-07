export type StroopColor = "Red" | "Blue" | "Green" | "Yellow" | "Purple";

export const stroopColors: Array<{ name: StroopColor; className: string; hex: string }> = [
  { name: "Red", className: "text-red-400", hex: "#f87171" },
  { name: "Blue", className: "text-sky-400", hex: "#38bdf8" },
  { name: "Green", className: "text-emerald-400", hex: "#34d399" },
  { name: "Yellow", className: "text-amber-300", hex: "#fcd34d" },
  { name: "Purple", className: "text-violet-400", hex: "#a78bfa" }
];
