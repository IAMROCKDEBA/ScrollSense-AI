import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Consistent, choreographed page opener (CSS entrance, works before hydration). */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-3">
        {eyebrow ? (
          <div className="rise flex items-center gap-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-primary" style={{ "--i": 0 } as React.CSSProperties}>
            <span className="h-px w-8 bg-metal" aria-hidden="true" />
            {eyebrow}
          </div>
        ) : null}
        <h1
          className="rise font-display text-[2.1rem] font-medium leading-[1.05] tracking-tight sm:text-5xl"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          {title}
        </h1>
        {description ? (
          <p className="rise max-w-2xl text-base leading-7 text-muted-foreground" style={{ "--i": 2 } as React.CSSProperties}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="rise flex shrink-0 flex-wrap gap-2" style={{ "--i": 3 } as React.CSSProperties}>
          {actions}
        </div>
      ) : null}
    </header>
  );
}
