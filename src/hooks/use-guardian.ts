"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GuardianEvent } from "@/types";
import { requestGuardian } from "@/lib/ai/browser";
import { buildGuardianContext, shouldIntervene } from "@/lib/telemetry/guardian-policy";
import type { LiveSession } from "./use-live-session";

export interface GuardianHandlers {
  onBreak: (seconds: number) => void;
  onRetune: (intent: string) => void;
  onEnd: () => void;
  onSetLimit: (minutes: number) => void;
}

export interface ActiveGuardian {
  event: GuardianEvent;
  index: number;
  limitMinutes?: number;
}

/**
 * Connects the deterministic compulsion model to the Guardian agent: the policy decides WHEN to intervene (cheap, instant),
 * the agent decides HOW (personalised, evidence-citing), and the user always has the last word.
 */
export function useGuardian(session: LiveSession, dailyLimitMinutes: number | null, name: string | undefined, handlers: GuardianHandlers) {
  const [active, setActive] = useState<ActiveGuardian | null>(null);
  const inflight = useRef(false);
  const lastAt = useRef<number | null>(null);
  const overrunHandled = useRef(false);
  const sessionKey = useRef<string | null>(null);
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const { status, config, reading, views, elapsedSec, guardianEvents, breakSeconds, sessionId, addGuardianEvent, respondToGuardian } = session;

  // A new session starts with a clean policy state.
  useEffect(() => {
    if (sessionKey.current !== sessionId) {
      sessionKey.current = sessionId;
      lastAt.current = null;
      overrunHandled.current = false;
      inflight.current = false;
    }
  }, [sessionId]);

  useEffect(() => {
    if (status !== "live" || !config || active || inflight.current || breakSeconds > 0) return;
    const now = Date.now();
    const reason = shouldIntervene({
      reading,
      viewCount: views.length,
      elapsedSec,
      plannedMinutes: config.plannedMinutes,
      interventions: guardianEvents.length,
      lastInterventionAtMs: lastAt.current,
      nowMs: now,
      overrunHandled: overrunHandled.current
    });
    if (!reason) return;

    inflight.current = true;
    const context = buildGuardianContext({
      reading,
      views,
      elapsedSec,
      config,
      hour: new Date(now).getHours(),
      events: guardianEvents,
      name,
      dailyLimitMinutes
    });

    void requestGuardian(context).then((response) => {
      inflight.current = false;
      if (sessionKey.current !== sessionId) return;
      lastAt.current = Date.now();
      if (reason === "overrun") overrunHandled.current = true;
      const event: GuardianEvent = {
        at: new Date().toISOString(),
        compulsion: reading.index,
        severity: response.severity,
        headline: response.headline,
        message: response.message,
        evidence: response.evidence,
        action: response.action,
        retuneIntent: response.retuneIntent,
        source: response.source
      };
      const index = addGuardianEvent(event);
      setActive({ event, index, limitMinutes: response.limitMinutes });
    });
  }, [status, config, active, breakSeconds, reading, views, elapsedSec, guardianEvents, name, dailyLimitMinutes, sessionId, addGuardianEvent]);

  const accept = useCallback(() => {
    if (!active) return;
    respondToGuardian(active.index, "accepted");
    const { event, limitMinutes } = active;
    setActive(null);
    const h = handlersRef.current;
    if (event.action === "breathing_break") h.onBreak(30);
    else if (event.action === "retune_feed" && event.retuneIntent) h.onRetune(event.retuneIntent);
    else if (event.action === "end_session") h.onEnd();
    else if (event.action === "set_limit") h.onSetLimit(limitMinutes ?? 15);
  }, [active, respondToGuardian]);

  const dismiss = useCallback(() => {
    if (!active) return;
    respondToGuardian(active.index, "dismissed");
    setActive(null);
  }, [active, respondToGuardian]);

  const end = useCallback(() => {
    if (!active) return;
    respondToGuardian(active.index, "accepted");
    setActive(null);
    handlersRef.current.onEnd();
  }, [active, respondToGuardian]);

  return { active, accept, dismiss, end };
}
