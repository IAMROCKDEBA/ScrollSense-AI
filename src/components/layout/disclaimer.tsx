import { AlertTriangle } from "lucide-react";

export function Disclaimer() {
  return (
    <div className="flex gap-3 rounded-lg border border-[hsl(var(--warning)/0.32)] bg-[hsl(var(--warning)/0.12)] p-4 text-sm text-[hsl(var(--warning-foreground))]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0">
        ScrollSense AI is an educational digital well-being tool. It is not a medical diagnosis,
        does not access private phone data, and estimates risk using self-reported inputs,
        in-app session behavior, mood check-ins, and cognitive test results.
      </p>
    </div>
  );
}
