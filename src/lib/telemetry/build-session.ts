import type { FocusAfter, GuardianEvent, Mood, VideoSession, ViewEvent, WatchReason } from "@/types";
import { round } from "@/lib/utils";

export interface SessionConfig {
  plannedMinutes: number;
  moodBefore: Mood;
  reason: WatchReason;
  goal?: string;
  /** Search queries chosen by the Intent Studio (empty = default topic rotation). */
  queries: string[];
  mantra?: string;
  tone?: string;
  guardrails?: string[];
}

export interface PostSessionAnswers {
  moodAfter: Mood;
  urge: number;
  focusAfter: FocusAfter;
}

export interface BuildSessionArgs {
  id: string;
  config: SessionConfig;
  startedAtMs: number;
  endedAtMs: number;
  views: ViewEvent[];
  guardianEvents: GuardianEvent[];
  mindfulPauseCount: number;
  peakCompulsion: number;
  completed: boolean;
  post?: PostSessionAnswers;
}

/** Collapse raw telemetry into the persisted VideoSession (single source of truth for session fields). */
export function buildSession(args: BuildSessionArgs): VideoSession {
  const { config, views, guardianEvents, post } = args;
  const durationSeconds = Math.max(0, Math.round((args.endedAtMs - args.startedAtMs) / 1000));
  const skipCount = views.filter((view) => view.skippedEarly).length;
  const avgDwell = views.length ? views.reduce((sum, view) => sum + view.dwellMs, 0) / views.length / 1000 : 0;

  return {
    id: args.id,
    completed: args.completed,
    goal: config.goal,
    plannedMinutes: config.plannedMinutes,
    startedAt: new Date(args.startedAtMs).toISOString(),
    endedAt: args.completed ? new Date(args.endedAtMs).toISOString() : undefined,
    durationSeconds,
    videosWatched: views.length,
    skipCount,
    nextClicks: views.length,
    averageTimePerVideo: round(avgDwell),
    continuedAfterWarning: guardianEvents.some((event) => event.response === "dismissed"),
    mindfulPauseCount: args.mindfulPauseCount,
    urgeToContinueScore: post?.urge ?? 0,
    moodBefore: config.moodBefore,
    moodAfter: post?.moodAfter,
    reason: config.reason,
    exceededPlannedTime: durationSeconds / 60 > config.plannedMinutes,
    focusAfter: post?.focusAfter,
    views,
    guardianEvents,
    likes: views.filter((view) => view.liked).length,
    peakCompulsion: args.peakCompulsion
  };
}
