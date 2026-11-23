import type { Transition, Variants } from "framer-motion";

/** Shared motion tokens. Mirrors the CSS custom properties in globals.css. */
export const ease = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1]
} as const;

export const duration = {
  fast: 0.16,
  base: 0.28,
  slow: 0.56
} as const;

export const spring = {
  soft: { type: "spring", stiffness: 170, damping: 22, mass: 0.9 },
  snappy: { type: "spring", stiffness: 380, damping: 32, mass: 0.8 },
  bouncy: { type: "spring", stiffness: 260, damping: 17, mass: 0.9 }
} as const satisfies Record<string, Transition>;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.out } }
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.slow, ease: ease.out } }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: duration.slow, ease: ease.out } }
};

export function staggerContainer(step = 0.07, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: step, delayChildren: delay } }
  };
}
