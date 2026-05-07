import { cn, clamp } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  label: string;
  tone?: "sky" | "green" | "yellow" | "orange" | "red" | "violet";
  className?: string;
}

const toneMap = {
  sky: "stroke-sky-400",
  green: "stroke-emerald-400",
  yellow: "stroke-amber-300",
  orange: "stroke-orange-400",
  red: "stroke-red-400",
  violet: "stroke-violet-400"
};

export function ProgressRing({ value, label, tone = "sky", className }: ProgressRingProps) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const safeValue = clamp(value);
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className={cn("relative grid place-items-center", className)}>
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 112 112" role="img" aria-label={`${label}: ${safeValue}%`}>
        <circle className="stroke-muted" cx="56" cy="56" r={radius} fill="none" strokeWidth="10" />
        <circle
          className={cn("transition-all duration-700", toneMap[tone])}
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-semibold">{Math.round(safeValue)}</div>
        <div className="max-w-20 text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
