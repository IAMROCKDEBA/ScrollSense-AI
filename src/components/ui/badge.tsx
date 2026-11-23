import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-secondary/30 bg-secondary/[0.14] text-foreground",
        outline: "border-foreground/15 bg-foreground/[0.03] text-foreground/90",
        success: "border-success/30 bg-success/[0.12] text-success-foreground",
        warning: "border-warning/35 bg-warning/[0.14] text-warning-foreground",
        danger: "border-danger/35 bg-danger/[0.14] text-danger-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Adds a small status dot before the label. */
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </div>
  );
}
