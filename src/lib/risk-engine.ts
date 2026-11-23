import type { Recommendation, RiskCategory, RiskFactor, RiskFactorGroup, RiskInput, RiskScore } from "../types";
import { clamp, round } from "./utils";

/**
 * ScrollSense risk model v2: a transparent, weighted behavioural model.
 *
 * - Every factor is normalised to 0-100 risk and carries a fixed weight.
 * - A factor that was not measured is EXCLUDED and the remaining weights are renormalised,
 *   instead of being silently replaced by an assumed value (v1 behaviour).
 * - `confidence` reports how much of the model's weight is backed by real measurements.
 * - `breakdown` exposes each factor's exact contribution, which is what the dashboard,
 *   the AI Coach and the Session Autopsy cite when they explain a score.
 */

export function scoreDailyUsage(minutes: number) {
  if (minutes > 180) return 90;
  if (minutes > 120) return 75;
  if (minutes > 60) return 55;
  if (minutes > 30) return 30;
  return 10;
}

export function scoreSleep(hours: number) {
  if (hours < 5) return 85;
  if (hours < 6) return 65;
  if (hours < 7) return 35;
  return 10;
}

export function scoreStudy(hours: number) {
  if (hours < 1) return 80;
  if (hours < 2) return 55;
  if (hours < 3) return 35;
  return 10;
}

export function scoreReactionTime(ms: number) {
  if (ms <= 0) return 35;
  if (ms > 700) return 85;
  if (ms > 500) return 65;
  if (ms > 350) return 40;
  return 15;
}

export function categoryForRisk(score: number): RiskCategory {
  if (score <= 25) return "Low";
  if (score <= 50) return "Moderate";
  if (score <= 75) return "High";
  return "Critical";
}

interface FactorSpec {
  key: string;
  label: string;
  riskLabel: string;
  group: RiskFactorGroup;
  weight: number;
  /** Risk label is surfaced when the normalised score reaches this threshold. */
  threshold: number;
  value: number | undefined;
  toScore: (value: number) => number;
  detail: (value: number, score: number) => string;
}

function specs(input: RiskInput): FactorSpec[] {
  return [
    {
      key: "dailyUsage",
      label: "Daily short-video time",
      riskLabel: "Heavy daily short-video usage",
      group: "self-report",
      weight: 0.14,
      threshold: 55,
      value: input.dailyUsageMinutes,
      toScore: scoreDailyUsage,
      detail: (v) => `${round(v)} min per day`
    },
    {
      key: "lateNight",
      label: "Late-night use",
      riskLabel: "Frequent late-night short-video use",
      group: "self-report",
      weight: 0.09,
      threshold: 60,
      value: input.lateNightUsageScore,
      toScore: (v) => clamp(v),
      detail: (v) => `self-reported frequency ${round(v)}/100`
    },
    {
      key: "lostTime",
      label: "Loses track of time",
      riskLabel: "Often loses track of time while scrolling",
      group: "self-report",
      weight: 0.1,
      threshold: 60,
      value: input.losesTrackOfTimeScore,
      toScore: (v) => clamp(v),
      detail: (v) => `self-reported frequency ${round(v)}/100`
    },
    {
      key: "unintentional",
      label: "Opens without intending to",
      riskLabel: "Frequent unintentional opening",
      group: "self-report",
      weight: 0.1,
      threshold: 60,
      value: input.unintentionalOpeningScore,
      toScore: (v) => clamp(v),
      detail: (v) => `self-reported frequency ${round(v)}/100`
    },
    {
      key: "plannedGap",
      label: "Overrunning the plan",
      riskLabel: "Actual usage exceeded planned usage",
      group: "behaviour",
      weight: 0.08,
      threshold: 35,
      value: input.plannedVsActualGap,
      toScore: (v) => clamp(v * 5),
      detail: (v) => `${round(v, 1)} min over plan on average`
    },
    {
      key: "sessionLength",
      label: "Session length",
      riskLabel: "Short-video sessions run long",
      group: "behaviour",
      weight: 0.08,
      threshold: 55,
      // v1 fed seconds into a minutes formula (a 15-minute session scored 10/100); 45 minutes now means 100.
      value: input.sessionDuration,
      toScore: (seconds) => clamp((seconds / 60 / 45) * 100),
      detail: (seconds) => `${round(seconds / 60, 1)} min per session on average`
    },
    {
      key: "swipeSpeed",
      label: "Swipe speed",
      riskLabel: "Rapid-fire swiping through videos",
      group: "behaviour",
      weight: 0.06,
      threshold: 55,
      value: input.videosPerMinute,
      toScore: (vpm) => clamp((vpm / 6) * 100),
      detail: (vpm) => `${round(vpm, 1)} reels per minute`
    },
    {
      key: "skipRate",
      label: "Quick skips",
      riskLabel: "Most videos are skipped within seconds",
      group: "behaviour",
      weight: 0.04,
      threshold: 55,
      value: input.skipRate,
      toScore: (v) => clamp(v * 100),
      detail: (v) => `${round(v * 100)}% of reels left within 3 s`
    },
    {
      key: "peakCompulsion",
      label: "Peak compulsion",
      riskLabel: "Live compulsion index regularly spikes",
      group: "behaviour",
      weight: 0.06,
      threshold: 55,
      value: input.peakCompulsion,
      toScore: (v) => clamp(v),
      detail: (v) => `average session peak ${round(v)}/100`
    },
    {
      key: "warningIgnored",
      label: "Ignoring Guardian warnings",
      riskLabel: "Keeps scrolling after the Guardian steps in",
      group: "behaviour",
      weight: 0.01,
      threshold: 50,
      value: input.warningIgnoredRate,
      toScore: (v) => clamp(v * 65),
      detail: (v) => `${round(v * 100)}% of warnings dismissed`
    },
    {
      key: "urge",
      label: "Urge to continue",
      riskLabel: "High urge to continue after a session",
      group: "self-report",
      weight: 0.12,
      threshold: 60,
      value: input.urgeToContinueScore,
      toScore: (v) => clamp(v * 10),
      detail: (v) => `${round(v, 1)}/10 after sessions`
    },
    {
      key: "moodDrop",
      label: "Mood after scrolling",
      riskLabel: "Mood worsened after watching",
      group: "self-report",
      weight: 0.07,
      threshold: 55,
      value: input.moodDropScore,
      toScore: (v) => clamp(v * 35),
      detail: (v) => `average mood drop of ${round(v, 1)} step${v === 1 ? "" : "s"}`
    },
    {
      key: "sleep",
      label: "Sleep",
      riskLabel: "Sleep duration is below the healthy target",
      group: "lifestyle",
      weight: 0.05,
      threshold: 60,
      value: input.sleepHours,
      toScore: scoreSleep,
      detail: (v) => `${round(v, 1)} h per night`
    },
    {
      key: "study",
      label: "Study time",
      riskLabel: "Very little protected study time",
      group: "lifestyle",
      weight: 0.03,
      threshold: 60,
      value: input.studyHours,
      toScore: scoreStudy,
      detail: (v) => `${round(v, 1)} h per day`
    },
    {
      key: "reaction",
      label: "Reaction time",
      riskLabel: "Slow reaction time in the brain test",
      group: "cognitive",
      weight: 0.02,
      threshold: 60,
      value: input.reactionTime,
      toScore: scoreReactionTime,
      detail: (v) => `${round(v)} ms average`
    },
    {
      key: "memory",
      label: "Memory recall",
      riskLabel: "Weak memory recall in the brain test",
      group: "cognitive",
      weight: 0.01,
      threshold: 60,
      value: input.memoryScore,
      toScore: (v) => clamp(100 - v),
      detail: (v) => `${round(v)}/100 recalled`
    },
    {
      key: "stroop",
      label: "Stroop (impulse) test",
      riskLabel: "Low Stroop score under interference",
      group: "cognitive",
      weight: 0.02,
      threshold: 60,
      value: input.stroopScore,
      toScore: (v) => clamp(100 - v),
      detail: (v) => `${round(v)}/100 score`
    }
  ];
}

/** Weighted mean over the parts that were measured; null when none were. */
function blend(parts: [number | null | undefined, number][]): number | null {
  let weight = 0;
  let sum = 0;
  for (const [value, w] of parts) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    sum += value * w;
    weight += w;
  }
  return weight === 0 ? null : sum / weight;
}

interface Derived {
  addiction: number;
  focus: number | null;
  memory: number | null;
  impulse: number;
  mood: number;
  wellbeing: number;
}

function buildRecommendations(input: RiskInput, derived: Derived): Recommendation[] {
  const items: Recommendation[] = [];

  if ((input.lateNightUsageScore ?? 0) >= 60 || (input.sleepHours ?? 8) < 6) {
    items.push({
      id: "late-night",
      category: "Immediate",
      title: "Protect the last 45 minutes before sleep",
      detail: "Avoid short videos before bed and use a quiet offline routine instead.",
      priority: "high"
    });
  }

  if ((input.urgeToContinueScore ?? 0) >= 7 || derived.impulse < 55) {
    items.push({
      id: "pause",
      category: "Immediate",
      title: "Use a 30-second pause before continuing",
      detail: "When the urge is high, pause, name your intention, then choose whether to continue.",
      priority: "high"
    });
  }

  if ((input.videosPerMinute ?? 0) >= 4 || (input.skipRate ?? 0) >= 0.6) {
    items.push({
      id: "slow-down",
      category: "Immediate",
      title: "Watch fewer videos all the way through",
      detail: "Your swiping is rapid. Pick one video, watch it to the end, then decide whether to continue.",
      priority: "high"
    });
  }

  if (derived.focus !== null && derived.focus < 60) {
    items.push({
      id: "study-first",
      category: "Study routine",
      title: "Keep short videos away from study starts",
      detail: "Begin study blocks before opening short-video apps so attention is not fragmented.",
      priority: "medium"
    });
  }

  if (derived.mood > 55) {
    items.push({
      id: "mood-trigger",
      category: "Reflection",
      title: "Track the emotion that triggers scrolling",
      detail: "Replace boredom or stress scrolling with a 5-minute offline reset activity.",
      priority: "medium"
    });
  }

  if ((input.plannedVsActualGap ?? 0) > 5) {
    items.push({
      id: "viewing-intention",
      category: "7-day plan",
      title: "Set a clear viewing intention",
      detail: "Choose a planned duration before watching and stop when the planned time ends.",
      priority: "medium"
    });
  }

  items.push({
    id: "weekly-review",
    category: "7-day plan",
    title: "Review your pattern for seven days",
    detail: "Repeat mood check-ins and cognitive tests to compare how scrolling affects focus.",
    priority: "low"
  });

  return items;
}

function buildExplanation(
  breakdown: RiskFactor[],
  confidence: number,
  missing: string[],
  input: RiskInput,
  category: RiskCategory
) {
  const measured = breakdown.filter((factor) => factor.score !== null);
  if (measured.length === 0) {
    return "No signals have been measured yet. Complete the profile, watch a feed session and take the brain tests to produce a score.";
  }
  const top = [...measured].sort((a, b) => b.contribution - a.contribution).slice(0, 3);
  const parts = [
    `${category} risk, computed from ${measured.length} of ${breakdown.length} signals (${confidence}% of the model's weight is backed by real measurements).`,
    `Biggest contributors: ${top.map((factor) => `${factor.label.toLowerCase()} (+${round(factor.contribution, 1)} pts, ${factor.detail})`).join("; ")}.`
  ];
  if (input.trend) {
    const direction = input.trend.direction;
    parts.push(
      direction === "stable"
        ? `Across your last ${input.trend.sessions} sessions your intensity is stable.`
        : `Across your last ${input.trend.sessions} sessions your intensity is ${direction} (${input.trend.delta > 0 ? "+" : ""}${input.trend.delta} pts).`
    );
  }
  if (missing.length) parts.push(`Missing evidence: ${missing.join(", ").toLowerCase()}. Adding it makes the estimate more reliable.`);
  return parts.join(" ");
}

export function predictRisk(input: RiskInput = {}): RiskScore {
  const factorSpecs = specs(input);
  const totalWeight = factorSpecs.reduce((sum, spec) => sum + spec.weight, 0);
  const availableWeight = factorSpecs.reduce(
    (sum, spec) => (typeof spec.value === "number" && Number.isFinite(spec.value) ? sum + spec.weight : sum),
    0
  );

  const breakdown: RiskFactor[] = factorSpecs.map((spec) => {
    const available = typeof spec.value === "number" && Number.isFinite(spec.value);
    const score = available ? round(spec.toScore(spec.value as number), 1) : null;
    const weightPct = available && availableWeight > 0 ? (spec.weight / availableWeight) * 100 : 0;
    return {
      key: spec.key,
      label: spec.label,
      group: spec.group,
      score,
      weightPct: round(weightPct, 1),
      contribution: score === null ? 0 : round((score * spec.weight) / availableWeight, 2),
      detail: available ? spec.detail(spec.value as number, score as number) : "not measured yet"
    };
  });

  const byKey = new Map(breakdown.map((factor) => [factor.key, factor.score]));
  const s = (key: string) => byKey.get(key) ?? null;

  const addiction = availableWeight > 0 ? clamp(breakdown.reduce((sum, factor) => sum + factor.contribution, 0)) : 0;
  const focusRisk = blend([[s("reaction"), 0.45], [s("stroop"), 0.45]]);
  const focus = focusRisk === null ? null : clamp(100 - (focusRisk * 0.9 + (s("sleep") ?? focusRisk) * 0.1));
  const memory = typeof input.memoryScore === "number" ? clamp(input.memoryScore) : null;
  const impulseRisk = blend([[s("plannedGap"), 0.28], [s("urge"), 0.3], [s("unintentional"), 0.24], [s("warningIgnored"), 0.18]]);
  const impulse = impulseRisk === null ? 100 : clamp(100 - impulseRisk);
  const mood = clamp(blend([[s("moodDrop"), 0.35], [s("urge"), 0.25], [s("lateNight"), 0.15], [s("dailyUsage"), 0.25]]) ?? 0);
  const wellbeingRisk = blend([
    [addiction, 0.42],
    [s("sleep"), 0.18],
    [s("study"), 0.13],
    [mood, 0.14],
    [focus === null ? null : 100 - focus, 0.08],
    [memory === null ? null : 100 - memory, 0.05]
  ]);
  const wellbeing = clamp(100 - (wellbeingRisk ?? 0));

  const derived: Derived = { addiction, focus, memory, impulse, mood, wellbeing };
  const category = categoryForRisk(round(addiction));
  const confidence = round((availableWeight / totalWeight) * 100);

  const missing: string[] = [];
  if (["dailyUsage", "lateNight", "lostTime", "unintentional"].every((key) => s(key) === null)) missing.push("Profile questionnaire");
  if (["plannedGap", "sessionLength", "swipeSpeed", "skipRate"].every((key) => s(key) === null)) missing.push("Feed session data");
  if (s("urge") === null) missing.push("Post-session reflection");
  if (["reaction", "memory", "stroop"].some((key) => s(key) === null)) missing.push("Cognitive tests");

  const topRiskFactors = factorSpecs
    .map((spec, index) => ({ spec, score: breakdown[index].score }))
    .filter((item): item is { spec: FactorSpec; score: number } => item.score !== null && item.score >= item.spec.threshold)
    .sort((a, b) => b.score * b.spec.weight - a.score * a.spec.weight)
    .slice(0, 3)
    .map((item) => item.spec.riskLabel);

  return {
    addictionRiskScore: round(addiction),
    focusScore: focus === null ? null : round(focus),
    memoryScore: memory === null ? null : round(memory),
    impulseControlScore: round(impulse),
    moodDependencyScore: round(mood),
    digitalWellbeingScore: round(wellbeing),
    finalRiskCategory: category,
    topRiskFactors:
      topRiskFactors.length > 0
        ? topRiskFactors
        : availableWeight > 0
          ? ["No single factor dominates", "Keep logging sessions to reveal patterns", "Repeat the brain tests for a clearer picture"]
          : ["Nothing measured yet", "Complete the profile questionnaire", "Run a feed session and the brain tests"],
    recommendations: buildRecommendations(input, derived),
    explanation: buildExplanation(breakdown, confidence, missing, input, category),
    confidence,
    breakdown,
    missing,
    trend: input.trend,
    sessionsUsed: input.sessionsUsed ?? 0,
    updatedAt: new Date().toISOString()
  };
}
