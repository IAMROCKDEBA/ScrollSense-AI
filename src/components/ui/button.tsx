import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[transform,box-shadow,background-color,border-color,color,filter] duration-300 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "btn-metal font-semibold hover:-translate-y-0.5",
        secondary:
          "border border-secondary/30 bg-secondary/[0.14] text-foreground hover:border-secondary/50 hover:bg-secondary/[0.22]",
        outline:
          "border border-foreground/15 bg-card/40 text-foreground hover:border-foreground/30 hover:bg-foreground/[0.06]",
        ghost: "text-foreground hover:bg-foreground/[0.07]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_10px_24px_-10px_hsl(var(--destructive)/0.7)] hover:brightness-110"
      },
      size: {
        default: "h-11 px-5",
        sm: "h-10 px-4",
        lg: "h-12 px-7 text-[0.95rem]",
        icon: "h-11 w-11"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { buttonVariants };
