"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "focus-ring relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-foreground/15 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-metal border-transparent" : "bg-foreground/10",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-spring",
          checked ? "translate-x-[1.5rem]" : "translate-x-[0.25rem]"
        )}
      />
    </button>
  )
);
Switch.displayName = "Switch";
