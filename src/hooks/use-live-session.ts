"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GuardianEvent, VideoSession, ViewEvent } from "@/types";
import { createId } from "@/lib/utils";
import { computeCompulsion, type CompulsionReading } from "@/lib/telemetry/compulsion";
import { buildSession, type PostSessionAnswers, type SessionConfig } from "@/lib/telemetry/build-session";

export type SessionStatus = "idle" | "live" | "ended";
const PERSIST_EVERY_MS = 5000;

export interface LiveSession {
  status: SessionStatus;
  config: SessionConfig | null;
  views: ViewEvent[];
  elapsedSec: number;
  reading: CompulsionReading;
  guardianEvents: GuardianEvent[];
  mindfulPauseCount: number;
  breakSeconds: number;
  sessionId: string | null;
  durationSec: number;
  begin: (config: SessionConfig) => void;
  recordView: (view: ViewEvent) => void;
  end: (finalView?: ViewEvent | null) => void;
  finalize: (post: PostSessionAnswers) => VideoSession | null;
  reset: () => void;
  startBreak: (seconds?: number) => void;
  endBreak: () => void;
  addGuardianEvent: (event: GuardianEvent) => number;
  respondToGuardian: (index: number, response: "accepted" | "dismissed") => void;
  patchConfig: (patch: Partial<SessionConfig>) => void;
}

/** Owns the lifecycle of one live Reels session: telemetry, timers, compulsion index and persistence. */
export function useLiveSession(onPersist: (session: VideoSession) => void): LiveSession {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [views, setViews] = useState<ViewEvent[]>([]);
  const [guardianEvents, setGuardianEvents] = useState<GuardianEvent[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [hour, setHour] = useState(12);
  const [mindfulPauseCount, setMindfulPauseCount] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startedAt = useRef(0);
  const endedAt = useRef(0);
  const idRef = useRef<string | null>(null);
  const configRef = useRef<SessionConfig | null>(null);
  const viewsRef = useRef<ViewEvent[]>([]);
  const guardianRef = useRef<GuardianEvent[]>([]);
  const mindfulRef = useRef(0);
  const peakRef = useRef(0);
  const statusRef = useRef<SessionStatus>("idle");
  const persistRef = useRef(onPersist);
  useEffect(() => {
    persistRef.current = onPersist;
  });

  const snapshot = useCallback(
    (completed: boolean, post?: PostSessionAnswers) => {
      if (!idRef.current || !configRef.current) return null;
      return buildSession({
        id: idRef.current,
        config: configRef.current,
        startedAtMs: startedAt.current,
        endedAtMs: statusRef.current === "live" ? Date.now() : endedAt.current,
        views: viewsRef.current,
        guardianEvents: guardianRef.current,
        mindfulPauseCount: mindfulRef.current,
        peakCompulsion: peakRef.current,
        completed,
        post
      });
    },
    []
  );

  const persistNow = useCallback(() => {
    const session = snapshot(false);
    if (session) persistRef.current(session);
  }, [snapshot]);

  // 1 Hz clock + break countdown while live.
  useEffect(() => {
    if (status !== "live") return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setElapsedSec(Math.floor((now - startedAt.current) / 1000));
      setHour(new Date(now).getHours());
      setBreakSeconds((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  // Persist a partial (not yet completed) session regularly and when the tab goes away.
  useEffect(() => {
    if (status !== "live") return;
    const timer = window.setInterval(persistNow, PERSIST_EVERY_MS);
    const onHide = () => persistNow();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", onHide);
    };
  }, [status, persistNow]);

  const reading = useMemo(
    () =>
      computeCompulsion({
        views,
        elapsedSec,
        plannedMinutes: config?.plannedMinutes ?? 10,
        hour,
        moodBefore: config?.moodBefore
      }),
    [views, elapsedSec, hour, config]
  );

  useEffect(() => {
    peakRef.current = Math.max(peakRef.current, reading.index);
  }, [reading.index]);

  const begin = useCallback((next: SessionConfig) => {
    const id = createId("session");
    idRef.current = id;
    configRef.current = next;
    startedAt.current = Date.now();
    viewsRef.current = [];
    guardianRef.current = [];
    mindfulRef.current = 0;
    peakRef.current = 0;
    statusRef.current = "live";
    setSessionId(id);
    setConfig(next);
    setViews([]);
    setGuardianEvents([]);
    setElapsedSec(0);
    setHour(new Date().getHours());
    setMindfulPauseCount(0);
    setBreakSeconds(0);
    setDurationSec(0);
    setStatus("live");
    const initial = snapshot(false);
    if (initial) persistRef.current(initial);
  }, [snapshot]);

  const recordView = useCallback((view: ViewEvent) => {
    viewsRef.current = [...viewsRef.current, view];
    setViews(viewsRef.current);
  }, []);

  const end = useCallback((finalView?: ViewEvent | null) => {
    if (statusRef.current !== "live") return;
    if (finalView) {
      viewsRef.current = [...viewsRef.current, finalView];
      setViews(viewsRef.current);
    }
    endedAt.current = Date.now();
    statusRef.current = "ended";
    setDurationSec(Math.round((endedAt.current - startedAt.current) / 1000));
    setStatus("ended");
    const partial = snapshot(false);
    if (partial) persistRef.current(partial);
  }, [snapshot]);

  const finalize = useCallback(
    (post: PostSessionAnswers) => {
      const session = snapshot(true, post);
      if (session) persistRef.current(session);
      return session;
    },
    [snapshot]
  );

  const reset = useCallback(() => {
    idRef.current = null;
    configRef.current = null;
    statusRef.current = "idle";
    viewsRef.current = [];
    guardianRef.current = [];
    setStatus("idle");
    setConfig(null);
    setViews([]);
    setGuardianEvents([]);
    setSessionId(null);
    setElapsedSec(0);
    setBreakSeconds(0);
  }, []);

  const startBreak = useCallback((seconds = 30) => {
    mindfulRef.current += 1;
    setMindfulPauseCount(mindfulRef.current);
    setBreakSeconds(seconds);
  }, []);

  const endBreak = useCallback(() => setBreakSeconds(0), []);

  const addGuardianEvent = useCallback((event: GuardianEvent) => {
    guardianRef.current = [...guardianRef.current, event];
    setGuardianEvents(guardianRef.current);
    return guardianRef.current.length - 1;
  }, []);

  const respondToGuardian = useCallback((index: number, response: "accepted" | "dismissed") => {
    guardianRef.current = guardianRef.current.map((event, i) => (i === index ? { ...event, response } : event));
    setGuardianEvents(guardianRef.current);
  }, []);

  const patchConfig = useCallback((patch: Partial<SessionConfig>) => {
    if (!configRef.current) return;
    configRef.current = { ...configRef.current, ...patch };
    setConfig(configRef.current);
  }, []);

  return {
    status,
    config,
    views,
    elapsedSec,
    reading,
    guardianEvents,
    mindfulPauseCount,
    breakSeconds,
    sessionId,
    durationSec,
    begin,
    recordView,
    end,
    finalize,
    reset,
    startBreak,
    endBreak,
    addGuardianEvent,
    respondToGuardian,
    patchConfig
  };
}
