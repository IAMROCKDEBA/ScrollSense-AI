import { Info } from "lucide-react";

export function Disclaimer() {
  return (
    <div
      role="note"
      className="flex gap-3.5 rounded-2xl border border-warning/30 bg-warning/[0.09] p-4 text-sm leading-6 text-warning-foreground sm:p-5"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0">
        ScrollSense AI is an educational digital well-being tool. It is not a medical diagnosis, does not access
        private phone data, and estimates risk using self-reported inputs, in-app session behavior, mood check-ins,
        and cognitive test results.
      </p>
    </div>
  );
}
