import type { Recommendation, RiskCategory, RiskInput, RiskScore } from "../types";
import { clamp, round } from "./utils";

function scoreDailyUsage(minutes = 0) {
  if (minutes > 180) return 90;
  if (minutes > 120) return 75;
  if (minutes > 60) return 55;
  if (minutes > 30) return 30;
  return 10;
}

function scoreSleep(hours = 8) {
  if (hours < 5) return 85;
  if (hours < 6) return 65;
  if (hours < 7) return 35;
  return 10;
}

function scoreStudy(hours = 3) {
  if (hours < 1) return 80;
  if (hours < 2) return 55;
  if (hours < 3) return 35;
  return 10;
}

function scoreReactionTime(ms = 350) {
  if (ms <= 0) return 35;
  if (ms > 700) return 85;
  if (ms > 500) return 65;
  if (ms > 350) return 40;
  return 15;
}

function categoryForRisk(score: number): RiskCategory {
  if (score <= 25) return "Low";
  if (score <= 50) return "Moderate";
  if (score <= 75) return "High";
  return "Critical";
}

function factor(label: string, value: number, threshold: number) {
  return value >= threshold ? { label, value } : null;
}

function buildRecommendations(input: RiskInput, score: RiskScoreCore): Recommendation[] {
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

  if ((input.urgeToContinueScore ?? 0) >= 7 || score.impulseControlScore < 55) {
    items.push({
      id: "pause",
      category: "Immediate",
      title: "Use a 30-second pause before continuing",
      detail: "When the urge is high, pause, name your intention, then choose whether to continue.",
      priority: "high"
    });
  }

  if (score.focusScore < 60) {
    items.push({
      id: "study-first",
      category: "Study routine",
      title: "Keep short videos away from study starts",
      detail: "Begin study blocks before opening short-video apps so attention is not fragmented.",
      priority: "medium"
    });
  }

  if (score.moodDependencyScore > 55) {
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

interface RiskScoreCore {
  addictionRiskScore: number;
  focusScore: number;
  memoryScore: number;
  impulseControlScore: number;
  moodDependencyScore: number;
  digitalWellbeingScore: number;
}

export function predictRisk(input: RiskInput = {}): RiskScore {
  const dailyUsageRisk = scoreDailyUsage(input.dailyUsageMinutes);
  const lateNightRisk = input.lateNightUsageScore ?? 0;
  const lostTimeRisk = input.losesTrackOfTimeScore ?? 0;
  const unintentionalRisk = input.unintentionalOpeningScore ?? 0;
  const plannedGapRisk = clamp((input.plannedVsActualGap ?? 0) * 5);
  const sessionRisk = clamp((input.sessionDuration ?? 0) / 90);
  const videosRisk = clamp((input.videosWatched ?? 0) * 8);
  const skipRisk = clamp((input.skipRate ?? 0) * 100);
  const urgeRisk = clamp((input.urgeToContinueScore ?? 0) * 10);
  const moodRisk = clamp((input.moodDropScore ?? 0) * 35);
  const sleepRisk = scoreSleep(input.sleepHours);
  const studyRisk = scoreStudy(input.studyHours);
  const reactionRisk = scoreReactionTime(input.reactionTime);
  const memoryRisk = clamp(100 - (input.memoryScore ?? 75));
  const stroopRisk = clamp(100 - (input.stroopScore ?? 75));
  const warningRisk = input.continuedAfterWarning ? 65 : 0;

  const addictionRiskScore = clamp(
    dailyUsageRisk * 0.14 +
      lateNightRisk * 0.09 +
      lostTimeRisk * 0.1 +
      unintentionalRisk * 0.1 +
      plannedGapRisk * 0.08 +
      sessionRisk * 0.08 +
      videosRisk * 0.06 +
      skipRisk * 0.04 +
      urgeRisk * 0.12 +
      moodRisk * 0.07 +
      sleepRisk * 0.05 +
      studyRisk * 0.03 +
      reactionRisk * 0.02 +
      memoryRisk * 0.01 +
      stroopRisk * 0.02 +
      warningRisk * 0.01
  );

  const focusScore = clamp(
    100 - (reactionRisk * 0.45 + stroopRisk * 0.45 + sleepRisk * 0.1)
  );

  const memoryScore = clamp(input.memoryScore ?? 75);

  const impulseControlScore = clamp(
    100 - (plannedGapRisk * 0.28 + urgeRisk * 0.3 + unintentionalRisk * 0.24 + warningRisk * 0.18)
  );

  const moodDependencyScore = clamp(
    moodRisk * 0.35 + urgeRisk * 0.25 + (input.lateNightUsageScore ?? 0) * 0.15 + dailyUsageRisk * 0.25
  );

  const digitalWellbeingScore = clamp(
    100 -
      (addictionRiskScore * 0.42 +
        sleepRisk * 0.18 +
        studyRisk * 0.13 +
        moodDependencyScore * 0.14 +
        (100 - focusScore) * 0.08 +
        (100 - memoryScore) * 0.05)
  );

  const core: RiskScoreCore = {
    addictionRiskScore: round(addictionRiskScore),
    focusScore: round(focusScore),
    memoryScore: round(memoryScore),
    impulseControlScore: round(impulseControlScore),
    moodDependencyScore: round(moodDependencyScore),
    digitalWellbeingScore: round(digitalWellbeingScore)
  };

  const topRiskFactors = [
    factor("High urge to continue after session", urgeRisk, 60),
    factor("Frequent late-night short-video use", lateNightRisk, 60),
    factor("Actual usage exceeded planned usage", plannedGapRisk, 35),
    factor("Frequent unintentional opening", unintentionalRisk, 60),
    factor("Often loses track of time while scrolling", lostTimeRisk, 60),
    factor("Low cognitive test performance after video session", Math.max(reactionRisk, stroopRisk, memoryRisk), 60),
    factor("Sleep duration is below the healthy target", sleepRisk, 60),
    factor("Short-video session was long or highly repetitive", Math.max(sessionRisk, videosRisk), 55),
    factor("Mood worsened after watching", moodRisk, 55)
  ]
    .filter((item): item is { label: string; value: number } => Boolean(item))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => item.label);

  const score: RiskScore = {
    ...core,
    finalRiskCategory: categoryForRisk(core.addictionRiskScore),
    topRiskFactors:
      topRiskFactors.length > 0
        ? topRiskFactors
        : ["No major risk factor dominates yet", "More session data will improve the estimate", "Repeat cognitive tests for a clearer pattern"],
    recommendations: [],
    explanation:
      "This version uses an explainable scoring model inspired by machine-learning classification. The code is structured so a trained Logistic Regression, Random Forest, or TensorFlow.js model can replace the scoring function later.",
    updatedAt: new Date().toISOString()
  };

  return {
    ...score,
    recommendations: buildRecommendations(input, core)
  };
}
