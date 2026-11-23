"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Round icon toggle with a rotating sun/moon crossfade. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} theme` : "Toggle theme"}
      className={cn(
        "focus-ring relative grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-foreground/15 bg-card/50 text-foreground transition-[background-color,transform] duration-300 hover:bg-foreground/[0.07] active:scale-95",
        className
      )}
    >
      <Sun
        className={cn(
          "absolute h-[1.15rem] w-[1.15rem] transition-[transform,opacity] duration-500 ease-out",
          isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
        aria-hidden="true"
      />
      <Moon
        className={cn(
          "absolute h-[1.15rem] w-[1.15rem] transition-[transform,opacity] duration-500 ease-out",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
        )}
        aria-hidden="true"
      />
    </button>
  );
}

const options = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor }
] as const;

/** Three-way segmented control for the Settings page. */
export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const active = mounted ? theme ?? "system" : "dark";

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-full border border-foreground/10 bg-foreground/[0.04] p-1">
      {options.map(({ value, label, icon: Icon }) => {
        const selected = active === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className={cn(
              "focus-ring flex h-10 items-center justify-center gap-2 rounded-full text-sm font-medium transition-[background-color,color,box-shadow] duration-300",
              selected ? "bg-metal text-[hsl(300_50%_9%)] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.4)] dark:text-[hsl(300_50%_9%)]" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
