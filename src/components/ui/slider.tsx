import * as React from "react";
import { cn } from "@/lib/utils";

/** Themed range input. Controlled usage expected (value + onChange). Styles live in globals.css (.range). */
export const Slider = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ className, min = 0, max = 100, value, style, ...props }, ref) => {
    const lo = Number(min);
    const hi = Number(max);
    const pct = hi > lo ? ((Number(value ?? lo) - lo) / (hi - lo)) * 100 : 0;
    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        value={value}
        className={cn("range focus-ring", className)}
        style={{ "--fill": `${pct}%`, ...style } as React.CSSProperties}
        {...props}
      />
    );
  }
);
Slider.displayName = "Slider";
