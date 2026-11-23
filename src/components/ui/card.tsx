"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** raised = deeper elevation for hero panels; flat = no cursor spotlight */
  variant?: "default" | "raised" | "flat";
}

/**
 * Premium surface: tonal gradient, rose-gold hairline and a cursor-following spotlight.
 * The spotlight is driven by two CSS variables written in a rAF-throttled pointer handler,
 * so there is no React re-render and no layout thrash.
 */
export function Card({ className, variant = "default", onPointerMove, ...props }: CardProps) {
  const frame = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    if (variant === "flat" || event.pointerType !== "mouse") return;
    const target = event.currentTarget;
    const { clientX, clientY } = event;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${clientX - rect.left}px`);
      target.style.setProperty("--my", `${clientY - rect.top}px`);
    });
  }

  return (
    <div
      className={cn(
        "surface metal-border",
        variant !== "flat" && "spotlight",
        variant === "raised" && "surface--raised",
        className
      )}
      onPointerMove={handlePointerMove}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-xl font-medium tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}
