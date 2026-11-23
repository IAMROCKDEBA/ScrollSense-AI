"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import {
  BarChart3,
  Bot,
  Brain,
  FileText,
  House,
  Info,
  MoonStar,
  Ellipsis,
  PlaySquare,
  Settings,
  Sparkles,
  UserRound,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { LogoMark } from "@/components/ui/logo-mark";
import { Scrolly } from "@/components/ui/scrolly";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BreathingOverlay } from "@/components/coach/breathing-overlay";
import { CoachLauncher } from "@/components/coach/coach-launcher";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const home: NavItem = { href: "/", label: "Home", icon: House };

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: "Journey",
    items: [
      { href: "/onboarding", label: "Onboarding", icon: UserRound },
      { href: "/mood", label: "Mood", icon: MoonStar },
      { href: "/feed", label: "Feed", icon: PlaySquare },
      { href: "/coach", label: "Coach", icon: Bot },
      { href: "/tests", label: "Tests", icon: Brain }
    ]
  },
  {
    title: "Insights",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
      { href: "/recommendations", label: "Plan", icon: Sparkles },
      { href: "/report", label: "Report", icon: FileText }
    ]
  },
  {
    title: "More",
    items: [
      { href: "/methodology", label: "Method", icon: Info },
      { href: "/settings", label: "Settings", icon: Settings }
    ]
  }
];

const tabs: NavItem[] = [
  home,
  { href: "/feed", label: "Feed", icon: PlaySquare },
  { href: "/tests", label: "Tests", icon: Brain },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 }
];

const sheetItems: NavItem[] = [
  { href: "/onboarding", label: "Onboarding", icon: UserRound },
  { href: "/mood", label: "Mood", icon: MoonStar },
  { href: "/coach", label: "Coach", icon: Bot },
  { href: "/recommendations", label: "Plan", icon: Sparkles },
  { href: "/report", label: "Report", icon: FileText },
  { href: "/methodology", label: "Method", icon: Info },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPath, setSheetPath] = useState(pathname);

  // Close the sheet whenever the route changes (derived-state pattern, no effect needed).
  if (sheetPath !== pathname) {
    setSheetPath(pathname);
    setSheetOpen(false);
  }

  const inSheet = sheetItems.some((item) => item.href === pathname);

  return (
    <div className="min-h-screen">
      {/* ---------- Desktop rail ---------- */}
      <aside
        data-print-hide
        className="glass fixed inset-y-4 left-4 z-30 hidden w-[16.5rem] flex-col overflow-hidden rounded-[1.75rem] border border-foreground/10 shadow-raised lg:flex"
      >
        <Link href="/" className="focus-ring group m-3 flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-foreground/[0.05]">
          <LogoMark size={42} />
          <div className="min-w-0">
            <div className="font-display text-lg font-medium leading-tight tracking-tight">ScrollSense</div>
            <div className="text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">AI well-being</div>
          </div>
        </Link>

        <nav aria-label="Primary" className="hide-scrollbar flex-1 space-y-5 overflow-y-auto px-3 pb-3 pt-1">
          <ul>
            <RailLink item={home} active={pathname === home.href} />
          </ul>
          {groups.map((group) => (
            <div key={group.title}>
              <div className="mb-1.5 px-3 text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                {group.title}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <RailLink key={item.href} item={item} active={pathname === item.href} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-3 border-t border-foreground/10 p-3">
          <div className="flex items-center gap-3 rounded-2xl bg-foreground/[0.04] p-3">
            <Scrolly mood="calm" size={44} />
            <p className="text-xs leading-5 text-muted-foreground">
              Local-first. No login, no database, no private app tracking.
            </p>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">Appearance</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <header
        data-print-hide
        className="glass sticky top-0 z-30 flex items-center justify-between border-b border-foreground/10 px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] lg:hidden"
      >
        <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-xl">
          <LogoMark size={36} />
          <span className="font-display text-lg font-medium tracking-tight">ScrollSense</span>
        </Link>
        <ThemeToggle />
      </header>

      <main id="main-content" tabIndex={-1} className="min-w-0 outline-none lg:pl-[19.25rem]">
        <div className="mx-auto min-w-0 max-w-[80rem] px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pb-12 lg:pt-10">
          {children}
        </div>
      </main>

      {/* ---------- Mobile bottom tab bar ---------- */}
      <nav
        data-print-hide
        aria-label="Primary"
        className="glass fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto flex max-w-md items-center justify-between rounded-full border border-foreground/10 p-1.5 shadow-raised lg:hidden"
      >
        {tabs.map((item) => (
          <TabLink key={item.href} item={item} active={pathname === item.href} />
        ))}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          className={cn(
            "focus-ring relative flex h-14 min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[0.625rem] font-medium tracking-wide transition-colors",
            inSheet ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {inSheet ? <ActivePill /> : null}
          <Ellipsis className="relative h-5 w-5" aria-hidden="true" />
          <span className="relative">More</span>
        </button>
      </nav>

      <MoreSheet open={sheetOpen} onClose={() => setSheetOpen(false)} pathname={pathname} />
      <CoachLauncher />
      <BreathingOverlay />
    </div>
  );
}

function ActivePill() {
  return (
    <m.span
      layoutId="nav-pill"
      transition={spring.snappy}
      className="absolute inset-0 rounded-[inherit] border border-foreground/10 bg-foreground/[0.09] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.08)]"
      aria-hidden="true"
    />
  );
}

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "focus-ring group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-200",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {active ? (
          <m.span
            layoutId="rail-pill"
            transition={spring.snappy}
            className="absolute inset-0 rounded-xl border border-foreground/10 bg-foreground/[0.08] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]"
            aria-hidden="true"
          />
        ) : (
          <span
            className="absolute inset-0 rounded-xl bg-foreground/[0.05] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            aria-hidden="true"
          />
        )}
        {active ? (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-metal" aria-hidden="true" />
        ) : null}
        <Icon className={cn("relative h-[1.1rem] w-[1.1rem] transition-colors", active && "text-primary")} aria-hidden="true" />
        <span className="relative">{item.label}</span>
      </Link>
    </li>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring relative flex h-14 min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[0.625rem] font-medium tracking-wide transition-colors",
        active ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {active ? <ActivePill /> : null}
      <Icon className={cn("relative h-5 w-5", active && "text-primary")} aria-hidden="true" />
      <span className="relative">{item.label}</span>
    </Link>
  );
}

function MoreSheet({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          key="sheet"
          className="fixed inset-0 z-50 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          data-print-hide
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-background/70"
          />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label="More pages"
            className="surface surface--raised absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] mx-auto max-w-md p-4"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={spring.soft}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="font-display text-lg font-medium tracking-tight">Explore</div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="focus-ring grid h-11 w-11 place-items-center rounded-full border border-foreground/15 bg-foreground/[0.04]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {sheetItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "focus-ring flex h-14 items-center gap-3 rounded-2xl border px-4 text-sm font-medium transition-colors",
                        active
                          ? "border-primary/40 bg-primary/[0.12] text-foreground"
                          : "border-foreground/10 bg-foreground/[0.035] text-foreground/90 hover:bg-foreground/[0.07]"
                      )}
                    >
                      <Icon className={cn("h-[1.1rem] w-[1.1rem]", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
