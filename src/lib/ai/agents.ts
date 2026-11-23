import type Anthropic from "@anthropic-ai/sdk";
import type { AutopsyResult } from "@/types";
import type { GuardianResponse } from "./events";
import type { IntentPlan } from "@/lib/intent";
import { sanitizeQuery } from "@/lib/shorts/topics";
import { clamp } from "@/lib/utils";
import { aiConfig, getAnthropic } from "./config";
import { offlineAutopsy, offlineGuardian, offlineIntent } from "./fallback";
import { checkGrounding } from "./grounding";
import { AUTOPSY_SYSTEM, GUARDIAN_SYSTEM, INTENT_SYSTEM } from "./prompts";
import {
  AutopsyOutputSchema,
  GuardianOutputSchema,
  IntentOutputSchema,
  type AutopsyRequest,
  type GuardianContext,
  type IntentRequestBody
} from "./schemas";
import { callStructured } from "./structured";

export type GuardianResult = GuardianResponse;

interface Deps {
  client?: Anthropic | null;
  model?: string;
}

function resolve(deps: Deps, kind: "model" | "fastModel") {
  const config = aiConfig();
  return { client: deps.client === undefined ? getAnthropic() : deps.client, model: deps.model ?? config[kind] };
}

const trim = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

// -------------------------------------------------------------------------------- guardian
export async function runGuardian(context: GuardianContext, deps: Deps = {}): Promise<GuardianResult> {
  const offline = (): GuardianResult => ({ ...offlineGuardian(context), evidence: context.evidence, source: "offline" });
  const { client, model } = resolve(deps, "fastModel");
  if (!client) return offline();

  try {
    const { data } = await callStructured({
      client,
      model,
      system: GUARDIAN_SYSTEM,
      user: `<session_telemetry>\n${JSON.stringify(context)}\n</session_telemetry>`,
      schema: GuardianOutputSchema,
      effort: "low",
      maxTokens: 1200,
      timeoutMs: 12_000
    });

    const message = trim(data.message.trim(), 320);
    // Reject any message whose numbers are not in the telemetry (invented figures never reach the student).
    if (!message || !checkGrounding(message, context).grounded) return offline();
    const retuneIntent = data.retuneIntent ? sanitizeQuery(data.retuneIntent) : undefined;
    if (data.action === "retune_feed" && !retuneIntent) return offline();

    return {
      severity: data.severity,
      headline: trim(data.headline.trim(), 64) || "Quick check-in",
      message,
      evidence: context.evidence,
      action: data.action,
      retuneIntent,
      limitMinutes: data.limitMinutes ? clamp(Math.round(data.limitMinutes), 5, 240) : undefined,
      source: "ai"
    };
  } catch {
    return offline();
  }
}

// ---------------------------------------------------------------------------------- intent
export async function runIntent(request: IntentRequestBody, deps: Deps = {}): Promise<IntentPlan> {
  const { client, model } = resolve(deps, "fastModel");
  if (!client) return offlineIntent(request);

  try {
    const { data } = await callStructured({
      client,
      model,
      system: INTENT_SYSTEM,
      user: `<session_intent>\n${JSON.stringify({ goal: request.goal, minutesRequested: request.plannedMinutes, mood: request.moodBefore, reason: request.reason, localHour: request.hour, recentRiskScore: request.recentRisk ?? null })}\n</session_intent>`,
      schema: IntentOutputSchema,
      effort: "low",
      maxTokens: 1500,
      timeoutMs: 15_000
    });

    const queries = [...new Set(data.queries.map(sanitizeQuery).filter((query) => query.length >= 3))].slice(0, 4);
    if (queries.length === 0) return offlineIntent(request);
    const guardrails = data.guardrails.map((rule) => trim(rule.trim(), 140)).filter(Boolean).slice(0, 3);

    return {
      queries,
      plannedMinutes: clamp(Math.round(data.plannedMinutes), Math.min(3, request.plannedMinutes), request.plannedMinutes),
      tone: data.tone,
      guardrails: guardrails.length ? guardrails : offlineIntent(request).guardrails,
      mantra: trim(data.mantra.trim(), 90) || offlineIntent(request).mantra,
      source: "ai"
    };
  } catch {
    return offlineIntent(request);
  }
}

// --------------------------------------------------------------------------------- autopsy
export async function runAutopsy(request: AutopsyRequest, deps: Deps = {}): Promise<AutopsyResult> {
  const generatedAt = new Date().toISOString();
  const offline = (): AutopsyResult => ({ ...offlineAutopsy(request), source: "offline", generatedAt });
  const { client, model } = resolve(deps, "model");
  if (!client) return offline();

  try {
    const { data } = await callStructured({
      client,
      model,
      system: AUTOPSY_SYSTEM,
      user: `<session_data>\n${JSON.stringify(request)}\n</session_data>`,
      schema: AutopsyOutputSchema,
      effort: "low",
      maxTokens: 2500,
      timeoutMs: 25_000
    });

    // Keep only claims whose numbers trace back to the measured data.
    const patterns = data.patterns
      .map((pattern) => ({ title: trim(pattern.title.trim(), 60), evidence: trim(pattern.evidence.trim(), 220), severity: pattern.severity }))
      .filter((pattern) => pattern.title && pattern.evidence && checkGrounding(pattern.evidence, request).grounded)
      .slice(0, 4);
    const summary = trim(data.summary.trim(), 420);
    const scoreNote = trim(data.scoreNote.trim(), 240);
    if (patterns.length < 2 || !summary || !checkGrounding(summary, request).grounded || !checkGrounding(scoreNote, request).grounded) {
      return offline();
    }

    return {
      headline: trim(data.headline.trim(), 80),
      summary,
      patterns,
      experimentForTomorrow: trim(data.experimentForTomorrow.trim(), 220),
      scoreNote,
      source: "ai",
      generatedAt
    };
  } catch {
    return offline();
  }
}
