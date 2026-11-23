"use client";

import { Component, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useCan3D } from "@/hooks/use-motion-tier";
import { Scrolly } from "@/components/ui/scrolly";

// three + @react-three/fiber live in this lazy chunk and never touch first paint.
const HeroOrb = dynamic(() => import("@/components/hero/hero-orb"), { ssr: false });

class WebGLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Pure CSS/SVG orb: the default on touch, low-end, data-saver and reduced-motion devices. */
export function HeroOrbFallback() {
  return (
    <div className="relative aspect-square w-full" aria-hidden="true">
      <div className="absolute inset-[4%] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.25),transparent_65%)]" />
      <div className="absolute inset-[16%] animate-breathe rounded-full bg-[radial-gradient(circle_at_32%_26%,var(--metal-1)_0%,var(--metal-2)_34%,hsl(var(--secondary))_62%,#3b1450_100%)] shadow-[0_0_90px_-10px_hsl(var(--primary)/0.55),inset_-18px_-22px_50px_rgba(40,8,50,0.55)]">
        <div className="absolute left-[16%] top-[12%] h-[26%] w-[38%] -rotate-[24deg] rounded-full bg-white/30 blur-[2px]" />
      </div>
      <div className="absolute inset-[6%] animate-orbit-spin rounded-full border border-primary/30 [transform:rotateX(68deg)]" />
      <div className="absolute inset-[0%] animate-[orbit-spin_60s_linear_infinite_reverse] rounded-full border border-primary/20 [transform:rotateX(74deg)_rotateY(18deg)]" />
      {[
        { top: "10%", left: "8%", delay: "0s", tint: "from-[var(--metal-1)] to-[var(--metal-3)]" },
        { top: "58%", left: "86%", delay: "-2.2s", tint: "from-secondary to-primary" },
        { top: "78%", left: "12%", delay: "-4.4s", tint: "from-accent to-[var(--metal-2)]" }
      ].map((card) => (
        <div
          key={card.top}
          className={`absolute h-[15%] w-[8.5%] animate-float rounded-xl bg-gradient-to-b ${card.tint} opacity-80 shadow-lg`}
          style={{ top: card.top, left: card.left, animationDelay: card.delay }}
        />
      ))}
    </div>
  );
}

export function HeroVisual() {
  const can3D = useCan3D();
  const { resolvedTheme } = useTheme();
  const [degraded, setDegraded] = useState(false);
  const [active, setActive] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const show3D = can3D && !degraded;

  return (
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[36rem]">
      {show3D ? (
        <WebGLBoundary fallback={<HeroOrbFallback />}>
          <HeroOrb dark={resolvedTheme !== "light"} active={active} onDegrade={() => setDegraded(true)} />
        </WebGLBoundary>
      ) : (
        <HeroOrbFallback />
      )}
      <div className="pointer-events-none absolute -bottom-2 right-[2%] flex items-end gap-2 sm:right-[6%]">
        <div className="surface mb-10 hidden max-w-[11rem] rounded-2xl rounded-br-sm px-4 py-3 text-xs leading-5 text-foreground/90 sm:block">
          Hi, I&apos;m Scrolly. Let&apos;s see how you really scroll.
        </div>
        <Scrolly mood="happy" size={96} />
      </div>
    </div>
  );
}
