"use client";

import * as React from "react";
import { m } from "framer-motion";
import { ease } from "@/lib/motion";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

/** Fades/slides content in once as it enters the viewport (transform + opacity only). */
export function Reveal({ children, className, delay = 0, y = 26 }: RevealProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, ease: ease.out, delay }}
    >
      {children}
    </m.div>
  );
}
