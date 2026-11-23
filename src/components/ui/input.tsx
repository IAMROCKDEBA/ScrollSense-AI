import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldControlClass =
  "w-full rounded-xl border border-input bg-background/60 px-4 text-sm text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)] transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground/80 hover:border-foreground/60 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(fieldControlClass, "flex h-11 py-2 file:border-0 file:bg-transparent file:text-sm file:font-medium", className)}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";
