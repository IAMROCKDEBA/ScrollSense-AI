"use client";

import { LazyMotion, MotionConfig } from "framer-motion";

const loadFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

/**
 * Loads framer-motion features lazily (keeps first-load JS small) and honours the
 * user's reduced-motion preference for every transform-based animation.
 * All animated elements must use `m.*`, never `motion.*` (strict mode).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
