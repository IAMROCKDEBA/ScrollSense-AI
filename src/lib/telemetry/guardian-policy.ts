import type { GuardianEvent, ViewEvent } from "@/types";
import type { GuardianContext } from "@/lib/ai/schemas";
import { round } from "@/lib/utils";
import type { SessionConfig } from "./build-session";
import type { CompulsionReading } from "./compulsion";

export const COMPULSION_TRIGGER = 50;
export const MAX_INTERVENTIONS = 4;
export const COOLDOWN_MS = 75_000;
/** Do not judge the first moments of a session. */
export const WARMUP_VIEWS = 6;

export type TriggerReason = "compulsion" | "overrun";

export interface TriggerInput {
  reading: CompulsionReading;
  viewCount: number;
  elapsedSec: number;
  plannedMinutes: number;
  interventions: number;
  lastInterventionAtMs: number | null;
  nowMs: number;
  /** Already raised an overrun intervention this session. */
  overrunHandled: boolean;
}

/** Pure policy: should the Guardian step in right now, and why? */
export function shouldIntervene(input: TriggerInput): TriggerReason | null {
  if (input.interventions >= MAX_INTERVENTIONS) return null;
  if (input.lastInterventionAtMs !== null && input.nowMs - input.lastInterventionAtMs < COOLDOWN_MS) return null;
  if (input.viewCount < WARMUP_VIEWS) return null;

  const overrun = input.elapsedSec >= input.plannedMinutes * 60;
  if (overrun && !input.overrunHandled) return "overrun";
  if (input.reading.index >= COMPULSION_TRIGGER) return "compulsion";
  return null;
}

export interface ContextInput {
  reading: CompulsionReading;
  views: ViewEvent[];
  elapsedSec: number;
  config: SessionConfig;
  hour: number;
  events: GuardianEvent[];
  name?: string;
  dailyLimitMinutes: number | null;
}

/** Compact, size-capped telemetry sent to the Guardian agent. Titles and names are not included. */
export function buildGuardianContext(input: ContextInput): GuardianContext {
  return {
    compulsion: input.reading.index,
    level: input.reading.level,
    evidence: input.reading.evidence,
    components: input.reading.components
      .filter((component) => component.contribution > 0)
      .map((component) => ({ label: component.label, contribution: component.contribution, detail: component.detail })),
    elapsedSec: Math.round(input.elapsedSec),
    plannedMinutes: input.config.plannedMinutes,
    hour: input.hour,
    videosWatched: input.views.length,
    recentDwellSec: input.views.slice(-12).map((view) => round(view.dwellMs / 1000, 1)),
    goal: input.config.goal,
    moodBefore: input.config.moodBefore,
    previous: input.events.slice(-6).map((event) => ({ headline: event.headline, action: event.action, response: event.response })),
    name: input.name,
    dailyLimitMinutes: input.dailyLimitMinutes
  };
}
