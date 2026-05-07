"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Brain,
  FileText,
  Home,
  Info,
  MoonStar,
  PlaySquare,
  Settings,
  Sparkles,
  UserRound
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/onboarding", label: "Onboarding", icon: UserRound },
  { href: "/mood", label: "Mood", icon: MoonStar },
  { href: "/feed", label: "Feed", icon: PlaySquare },
  { href: "/tests", label: "Tests", icon: Brain },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/recommendations", label: "Plan", icon: Sparkles },
  { href: "/report", label: "Report", icon: FileText },
  { href: "/methodology", label: "Method", icon: Info },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-background/90 backdrop-blur-xl lg:block">
        <div className="flex h-full flex-col">
          <Link href="/" className="flex items-center gap-3 border-b px-5 py-5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="font-semibold">ScrollSense AI</div>
              <div className="text-xs text-muted-foreground">Digital well-being analyzer</div>
            </div>
          </Link>
          <nav className="grid gap-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                    active && "bg-primary/12 text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t p-4 text-xs text-muted-foreground">
            Local-first v1. No login, no database, no private app tracking.
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b bg-background/88 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="text-sm font-semibold">ScrollSense AI</div>
            <div className="text-xs text-muted-foreground">Risk predictor</div>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground",
                  active && "border-primary/50 bg-primary/12 text-primary"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="min-w-0 lg:pl-64">
        <div className="mx-auto min-w-0 max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
