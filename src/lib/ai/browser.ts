"use client";

import { fallbackIntent, type IntentPlan } from "@/lib/intent";
import { offlineAutopsy, offlineGuardian } from "@/lib/ai/fallback";
import type { GuardianResponse } from "@/lib/ai/events";
import type { AutopsyRequest, GuardianContext } from "@/lib/ai/schemas";
import type { AutopsyResult } from "@/types";
import type { Mood, WatchReason } from "@/types";

const AI_TIMEOUT_MS = 14000;

async function postJson<T>(path: string, body: unknown, timeoutMs = AI_TIMEOUT_MS): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`${path} responded ${response.status}`);
  return (await response.json()) as T;
}

export interface AiStatus {
  live: boolean;
  model: string | null;
  fastModel: string | null;
}

export async function fetchAiStatus(): Promise<AiStatus> {
  try {
    const response = await fetch("/api/ai/status", { cache: "no-store" });
    if (!response.ok) throw new Error("status failed");
    return (await response.json()) as AiStatus;
  } catch {
    return { live: false, model: null, fastModel: null };
  }
}

export interface IntentRequest {
  goal: string;
  plannedMinutes: number;
  moodBefore: Mood;
  reason: WatchReason;
  name?: string;
  hour: number;
  recentRisk?: number;
}

/** Ask the planner agent for a feed plan; fall back to the deterministic planner on any failure. */
export async function planIntent(request: IntentRequest): Promise<IntentPlan> {
  try {
    return await postJson<IntentPlan>("/api/ai/intent", request);
  } catch {
    return fallbackIntent(request.goal, request.plannedMinutes, request.moodBefore);
  }
}

/** Ask the Guardian agent for an intervention; the deterministic agent answers if the network or API fails. */
export async function requestGuardian(context: GuardianContext): Promise<GuardianResponse> {
  try {
    return await postJson<GuardianResponse>("/api/ai/guardian", context, 15000);
  } catch {
    return { ...offlineGuardian(context), evidence: context.evidence, source: "offline" };
  }
}

/** Ask the Autopsy analyst for a grounded session post-mortem; falls back to the deterministic analyst. */
export async function requestAutopsy(request: AutopsyRequest): Promise<AutopsyResult> {
  try {
    return await postJson<AutopsyResult>("/api/ai/autopsy", request, 30000);
  } catch {
    return { ...offlineAutopsy(request), source: "offline", generatedAt: new Date().toISOString() };
  }
}
