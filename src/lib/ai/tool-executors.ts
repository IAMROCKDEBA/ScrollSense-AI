import { predictRisk } from "@/lib/risk-engine";
import { frequencyToScore, moodValence, round } from "@/lib/utils";
import { scorableSessions } from "@/lib/risk-input";
import type { RiskInput, RiskScore } from "@/types";
import type { CoachAction, CoachCard } from "./events";
import { ToolInputSchemas, type Snapshot, type ToolName } from "./schemas";
import { inputFromSnapshot } from "./snapshot";

export interface ToolOutcome {
  /** JSON string returned to the model as the tool_result. */
  content: string;
  /** One-line human summary for the agent trace. */
  summary: string;
  card?: CoachCard;
  action?: CoachAction;
  actionLabel?: string;
  isError?: boolean;
}

function ok(data: unknown, summary: string, extra: Partial<ToolOutcome> = {}): ToolOutcome {
  return { content: JSON.stringify(data), summary, ...extra };
}

function fail(message: string): ToolOutcome {
  return { content: JSON.stringify({ error: message }), summary: message, isError: true };
}

function riskCard(risk: RiskScore): CoachCard {
  return {
    type: "risk",
    score: risk.addictionRiskScore,
    category: risk.finalRiskCategory,
    confidence: risk.confidence,
    focus: risk.focusScore,
    wellbeing: risk.digitalWellbeingScore,
    impulse: risk.impulseControlScore,
    topFactors: risk.topRiskFactors,
    trend: risk.trend ? `${risk.trend.direction} (${risk.trend.delta > 0 ? "+" : ""}${risk.trend.delta})` : undefined
  };
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().slice(0, 16).replace("T", " ");
}

type Applied = { label: string; from: string; to: string };

/** Apply a what-if patch to the measured inputs and report each change. */
export function applyWhatIf(base: RiskInput, patch: ReturnType<typeof ToolInputSchemas.simulate_what_if.parse>): { input: RiskInput; changes: Applied[] } {
  const input: RiskInput = { ...base };
  const changes: Applied[] = [];
  const show = (value: number | undefined, unit = "") => (value === undefined ? "not measured" : `${round(value, 1)}${unit}`);

  if (patch.sleepHours !== undefined) {
    changes.push({ label: "Sleep", from: show(base.sleepHours, " h"), to: `${patch.sleepHours} h` });
    input.sleepHours = patch.sleepHours;
  }
  if (patch.studyHours !== undefined) {
    changes.push({ label: "Study time", from: show(base.studyHours, " h"), to: `${patch.studyHours} h` });
    input.studyHours = patch.studyHours;
  }
  if (patch.dailyUsageMinutes !== undefined) {
    changes.push({ label: "Daily usage", from: show(base.dailyUsageMinutes, " min"), to: `${patch.dailyUsageMinutes} min` });
    input.dailyUsageMinutes = patch.dailyUsageMinutes;
  }
  if (patch.lateNightUsage !== undefined) {
    changes.push({ label: "Late-night use", from: show(base.lateNightUsageScore, "/100"), to: patch.lateNightUsage });
    input.lateNightUsageScore = frequencyToScore(patch.lateNightUsage);
  }
  if (patch.unintentionalOpening !== undefined) {
    changes.push({ label: "Unintentional opening", from: show(base.unintentionalOpeningScore, "/100"), to: patch.unintentionalOpening });
    input.unintentionalOpeningScore = frequencyToScore(patch.unintentionalOpening);
  }
  if (patch.videosPerMinute !== undefined) {
    changes.push({ label: "Swipe speed", from: show(base.videosPerMinute, " reels/min"), to: `${patch.videosPerMinute} reels/min` });
    input.videosPerMinute = patch.videosPerMinute;
  }
  if (patch.sessionMinutes !== undefined) {
    changes.push({ label: "Session length", from: base.sessionDuration === undefined ? "not measured" : `${round(base.sessionDuration / 60, 1)} min`, to: `${patch.sessionMinutes} min` });
    input.sessionDuration = patch.sessionMinutes * 60;
    // Cutting session minutes cuts the same number of minutes off the plan overrun.
    if (base.plannedVsActualGap !== undefined && base.sessionDuration !== undefined) {
      const saved = Math.max(0, base.sessionDuration / 60 - patch.sessionMinutes);
      input.plannedVsActualGap = Math.max(0, base.plannedVsActualGap - saved);
    }
  }
  if (patch.urgeToContinue !== undefined) {
    changes.push({ label: "Urge to continue", from: show(base.urgeToContinueScore, "/10"), to: `${patch.urgeToContinue}/10` });
    input.urgeToContinueScore = patch.urgeToContinue;
  }
  return { input, changes };
}

export function runTool(name: string, rawInput: unknown, snapshot: Snapshot): ToolOutcome {
  if (!(name in ToolInputSchemas)) return fail(`Unknown tool "${name}".`);
  const toolName = name as ToolName;
  const parsed = ToolInputSchemas[toolName].safeParse(rawInput ?? {});
  if (!parsed.success) return fail(`Invalid input for ${name}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  const input = parsed.data as Record<string, unknown>;

  switch (toolName) {
    case "get_profile": {
      if (!snapshot.profile) return ok({ profile: null }, "No profile saved yet");
      // The model gets habits, not identity: the name is deliberately omitted.
      const { dailyUsageMinutes, studyHours, sleepHours, lateNightUsage, losesTrackOfTime, unintentionalOpening, mainPlatform, age, studentStatus } = snapshot.profile;
      return ok(
        { profile: { age, studentStatus, mainPlatform, dailyUsageMinutes, studyHours, sleepHours, lateNightUsage, losesTrackOfTime, unintentionalOpening } },
        "Loaded profile"
      );
    }

    case "get_risk_breakdown": {
      const risk = predictRisk(inputFromSnapshot(snapshot));
      return ok(
        {
          riskScore: risk.addictionRiskScore,
          category: risk.finalRiskCategory,
          confidencePct: risk.confidence,
          focusScore: risk.focusScore,
          memoryScore: risk.memoryScore,
          impulseControlScore: risk.impulseControlScore,
          moodDependencyScore: risk.moodDependencyScore,
          digitalWellbeingScore: risk.digitalWellbeingScore,
          trend: risk.trend ?? null,
          sessionsUsed: risk.sessionsUsed,
          missingEvidence: risk.missing,
          factors: risk.breakdown
            .filter((factor) => factor.score !== null)
            .sort((a, b) => b.contribution - a.contribution)
            .map((factor) => ({ factor: factor.label, group: factor.group, contributionPts: factor.contribution, detail: factor.detail })),
          unmeasured: risk.breakdown.filter((factor) => factor.score === null).map((factor) => factor.label)
        },
        `Risk ${risk.addictionRiskScore}/100 (${risk.finalRiskCategory}), confidence ${risk.confidence}%`,
        { card: riskCard(risk) }
      );
    }

    case "get_recent_sessions": {
      const limit = input.limit as number;
      const sessions = scorableSessions(snapshot.sessions as never).slice(-limit).reverse();
      const rows = sessions.map((session) => ({
        id: session.id,
        when: formatWhen(session.startedAt),
        minutes: round(session.durationSeconds / 60, 1),
        videos: session.videosWatched,
        skipPct: session.videosWatched ? round((session.skipCount / session.videosWatched) * 100) : 0,
        urge: session.urgeToContinueScore,
        peak: session.peakCompulsion === undefined ? undefined : round(session.peakCompulsion),
        goal: session.goal
      }));
      return ok(
        { count: rows.length, sessions: rows.map((row) => ({ ...row, plannedMinutes: sessions.find((s) => s.id === row.id)?.plannedMinutes })) },
        `Found ${rows.length} completed session${rows.length === 1 ? "" : "s"}`,
        { card: { type: "sessions", rows } }
      );
    }

    case "get_session_detail": {
      const sessions = scorableSessions(snapshot.sessions as never);
      const id = input.session_id as string | undefined;
      const session = id ? sessions.find((item) => item.id === id) : sessions.at(-1);
      if (!session) return fail("No matching completed session.");
      const raw = snapshot.sessions.find((item) => item.id === session.id);
      return ok(
        {
          id: session.id,
          startedAt: session.startedAt,
          goal: session.goal ?? null,
          plannedMinutes: session.plannedMinutes,
          actualMinutes: round(session.durationSeconds / 60, 1),
          videos: session.videosWatched,
          quickSkips: session.skipCount,
          urgeAfter: session.urgeToContinueScore,
          moodBefore: session.moodBefore ?? null,
          moodAfter: session.moodAfter ?? null,
          peakCompulsionIndex: session.peakCompulsion ?? null,
          guardianInterventions: raw?.guardianEvents ?? [],
          telemetry: raw?.summary ?? null
        },
        "Loaded session detail"
      );
    }

    case "get_mood_trend": {
      const points = snapshot.moodLogs
        .filter((log) => log.moodBefore && log.moodAfter)
        .slice(-8)
        .map((log) => ({ label: formatWhen(log.createdAt).slice(5, 10), before: log.moodBefore as string, after: log.moodAfter as string }));
      const drops = snapshot.moodLogs
        .filter((log) => log.moodBefore && log.moodAfter)
        .map((log) => moodValence(log.moodBefore) - moodValence(log.moodAfter));
      const avgDrop = drops.length ? round(drops.reduce((a, b) => a + b, 0) / drops.length, 2) : null;
      return ok({ entries: points, averageMoodDropPerSession: avgDrop }, `Read ${points.length} mood check-ins`, {
        card: points.length ? { type: "mood", points } : undefined
      });
    }

    case "get_cognitive_results": {
      const c = snapshot.cognitive;
      if (!c) return ok({ taken: false }, "No brain tests taken yet");
      return ok(c, "Loaded brain-test results", { card: { type: "cognitive", reactionMs: c.reactionTimeMs, memory: c.memoryScore, stroop: c.stroopScore } });
    }

    case "simulate_what_if": {
      const patch = ToolInputSchemas.simulate_what_if.parse(input);
      const base = inputFromSnapshot(snapshot);
      const baseRisk = predictRisk(base);
      if (baseRisk.confidence === 0) return fail("There is no measured data to simulate from yet.");
      const { input: changed, changes } = applyWhatIf(base, patch);
      if (changes.length === 0) return fail("Provide at least one change to simulate.");
      const afterRisk = predictRisk(changed);
      const factorDeltas = afterRisk.breakdown
        .map((factor, index) => ({ label: factor.label, delta: round(factor.contribution - baseRisk.breakdown[index].contribution, 1) }))
        .filter((item) => Math.abs(item.delta) >= 0.1)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 5);
      const delta = round(afterRisk.addictionRiskScore - baseRisk.addictionRiskScore, 1);
      return ok(
        {
          before: { score: baseRisk.addictionRiskScore, category: baseRisk.finalRiskCategory },
          after: { score: afterRisk.addictionRiskScore, category: afterRisk.finalRiskCategory },
          scoreChange: delta,
          changes,
          factorChanges: factorDeltas,
          note: "Computed with the app's real scoring model; the scenario is hypothetical, not a prediction."
        },
        `${baseRisk.addictionRiskScore} → ${afterRisk.addictionRiskScore} (${delta > 0 ? "+" : ""}${delta})`,
        {
          card: {
            type: "what_if",
            before: { score: baseRisk.addictionRiskScore, category: baseRisk.finalRiskCategory },
            after: { score: afterRisk.addictionRiskScore, category: afterRisk.finalRiskCategory },
            delta,
            changes,
            factorDeltas
          }
        }
      );
    }

    // ------------------------------------------------------------- actions (executed by the browser)
    case "navigate":
      return ok({ ok: true, path: input.path }, `Opening ${input.path}`, {
        action: { type: "navigate", path: input.path as string },
        actionLabel: `Open ${String(input.path)}`
      });
    case "start_breathing_break":
      return ok({ ok: true, seconds: input.seconds, note: "The break starts on the user's screen if a feed session is live." }, `${input.seconds}s breathing break`, {
        action: { type: "start_breathing_break", seconds: input.seconds as number },
        actionLabel: `${input.seconds}-second breathing break`
      });
    case "set_daily_limit":
      return ok({ ok: true, minutes: input.minutes }, `Daily limit ${input.minutes} min`, {
        action: { type: "set_daily_limit", minutes: input.minutes as number },
        actionLabel: `Set daily limit to ${input.minutes} min`
      });
    case "start_intent_feed":
      return ok({ ok: true }, "Intent feed ready", {
        action: { type: "start_intent_feed", goal: input.goal as string, minutes: input.minutes as number },
        actionLabel: `Start a ${input.minutes}-min feed: “${String(input.goal).slice(0, 48)}”`
      });
    case "launch_cognitive_test":
      return ok({ ok: true, test: input.test }, `Launching ${input.test} test`, {
        action: { type: "launch_cognitive_test", test: input.test as "reaction" | "memory" | "stroop" },
        actionLabel: `Take the ${String(input.test)} test`
      });
    case "save_commitment":
      return ok({ ok: true }, "Commitment saved", {
        action: { type: "save_commitment", text: input.text as string },
        actionLabel: `Commit: “${String(input.text).slice(0, 56)}”`
      });
    default:
      return fail("Unsupported tool.");
  }
}
