"use client";

import { useEffect, useState } from "react";
import { fetchAiStatus, type AiStatus } from "@/lib/ai/browser";

/** Whether the server has an Anthropic key configured (drives the "Live AI / Offline" badge). */
export function useAiStatus(): AiStatus | null {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchAiStatus().then((value) => {
      if (!cancelled) setStatus(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}
