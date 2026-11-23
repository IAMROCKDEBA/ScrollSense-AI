import { cn } from "@/lib/utils";

/** Shimmering placeholder. The sweep is a transform animation (compositor only). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-foreground/[0.07]", className)} aria-hidden="true">
      <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-foreground/[0.09] to-transparent" />
    </div>
  );
}
