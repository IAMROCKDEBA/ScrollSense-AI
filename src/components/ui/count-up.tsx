"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { ease } from "@/lib/motion";

interface CountUpProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}

/**
 * Number that counts up when scrolled into view. The final value is server-rendered
 * (no-JS / reduced-motion safe); the DOM text is updated directly, so it never re-renders React.
 */
export function CountUp({ value, decimals = 0, duration = 1.2, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const format = (n: number) => n.toFixed(decimals);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduced || !inView) {
      node.textContent = format(reduced ? value : previous.current);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration,
      ease: ease.out,
      onUpdate: (latest) => {
        node.textContent = format(latest);
      }
    });
    previous.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduced, duration, decimals]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(value)}
    </span>
  );
}
