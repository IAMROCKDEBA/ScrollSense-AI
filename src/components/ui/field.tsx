import * as React from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: React.ReactNode;
  /** Single form control. It receives the generated id / aria wiring automatically. */
  children: React.ReactElement<Record<string, unknown>>;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
}

/** Label + control + hint/error with correct htmlFor / aria-describedby association. */
export function Field({ label, children, hint, error, className }: FieldProps) {
  const reactId = React.useId();
  const childId = (children.props.id as string | undefined) ?? `field-${reactId}`;
  const hintId = hint ? `${childId}-hint` : undefined;
  const errorId = error ? `${childId}-error` : undefined;
  const describedBy = [children.props["aria-describedby"] as string | undefined, hintId, errorId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={childId} className="block text-[0.8125rem] font-medium leading-none tracking-wide text-foreground/90">
        {label}
      </label>
      {React.cloneElement(children, {
        id: childId,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : children.props["aria-invalid"]
      })}
      {hint ? (
        <p id={hintId} className="text-xs leading-5 text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium leading-5 text-danger-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
