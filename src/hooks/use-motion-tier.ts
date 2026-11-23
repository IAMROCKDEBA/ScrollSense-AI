"use client";

import { useSyncExternalStore } from "react";

/**
 * full  - all ambient + 3D effects
 * lite  - entrance/hover motion only (low-end, data-saver, slow network, touch/small screens)
 * none  - user asked for reduced motion: static, calm, still premium
 */
export type MotionTier = "full" | "lite" | "none";

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: NetworkInformationLike;
};

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const DESKTOP_QUERY = "(min-width: 1024px) and (pointer: fine)";

function readTier(): MotionTier {
  if (typeof window === "undefined") return "lite";
  if (window.matchMedia(REDUCED_QUERY).matches) return "none";
  const nav = navigator as NavigatorWithHints;
  if (nav.connection?.saveData) return "lite";
  if (/(^|-)(2g|3g)$/.test(nav.connection?.effectiveType ?? "")) return "lite";
  if ((nav.deviceMemory ?? 8) < 4) return "lite";
  if ((navigator.hardwareConcurrency ?? 8) < 4) return "lite";
  return "full";
}

function subscribe(query: string) {
  return (notify: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
  };
}

const subscribeReduced = subscribe(REDUCED_QUERY);
const subscribeDesktop = subscribe(DESKTOP_QUERY);

export function useMotionTier(): MotionTier {
  return useSyncExternalStore(subscribeReduced, readTier, () => "lite" as MotionTier);
}

let webglSupport: boolean | undefined;
function hasWebGL() {
  if (webglSupport !== undefined) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    webglSupport = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

function readCan3D() {
  return readTier() === "full" && window.matchMedia(DESKTOP_QUERY).matches && hasWebGL();
}

/** True only on capable desktop hardware with WebGL and no reduced-motion preference. */
export function useCan3D(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const offA = subscribeReduced(notify);
      const offB = subscribeDesktop(notify);
      return () => {
        offA();
        offB();
      };
    },
    readCan3D,
    () => false
  );
}
