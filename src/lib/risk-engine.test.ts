import { describe, expect, it } from "vitest";
import { predictRisk } from "./risk-engine";
import type { RiskInput } from "../types";

const lowRisk: RiskInput = {
  dailyUsageMinutes: 20,
  lateNightUsageScore: 0,
  losesTrackOfTimeScore: 0,
  unintentionalOpeningScore: 0,
  plannedVsActualGap: 0,
  sessionDuration: 360,
  videosPerMinute: 1,
  skipRate: 0.1,
  peakCompulsion: 10,
  urgeToContinueScore: 1,
  moodDropScore: 0,
  studyHours: 4,
  sleepHours: 8,
  reactionTime: 280,
  memoryScore: 90,
  stroopScore: 92
};

describe("predictRisk categories", () => {
  it("classifies low risk input", () => {
    const result = predictRisk(lowRisk);
    expect(result.finalRiskCategory).toBe("Low");
    expect(result.addictionRiskScore).toBeLessThanOrEqual(25);
  });

  it("classifies moderate risk input", () => {
    const result = predictRisk({
      ...lowRisk,
      dailyUsageMinutes: 90,
      lateNightUsageScore: 50,
      losesTrackOfTimeScore: 50,
      unintentionalOpeningScore: 50,
      urgeToContinueScore: 5,
      sessionDuration: 900
    });
    expect(result.finalRiskCategory).toBe("Moderate");
  });

  it("classifies high risk input", () => {
    const result = predictRisk({
      dailyUsageMinutes: 160,
      lateNightUsageScore: 75,
      losesTrackOfTimeScore: 75,
      unintentionalOpeningScore: 75,
      plannedVsActualGap: 8,
      sessionDuration: 1500,
      videosPerMinute: 4,
      skipRate: 0.5,
      peakCompulsion: 65,
      warningIgnoredRate: 0.5,
      urgeToContinueScore: 8,
      moodDropScore: 2,
      studyHours: 1,
      sleepHours: 5.5,
      reactionTime: 620,
      memoryScore: 55,
      stroopScore: 58
    });
    expect(result.finalRiskCategory).toBe("High");
  });

  it("classifies critical risk input", () => {
    const result = predictRisk({
      dailyUsageMinutes: 240,
      lateNightUsageScore: 100,
      losesTrackOfTimeScore: 100,
      unintentionalOpeningScore: 100,
      plannedVsActualGap: 25,
      sessionDuration: 3000,
      videosPerMinute: 6,
      skipRate: 0.8,
      peakCompulsion: 95,
      warningIgnoredRate: 1,
      urgeToContinueScore: 10,
      moodDropScore: 4,
      studyHours: 0.5,
      sleepHours: 4.5,
      reactionTime: 850,
      memoryScore: 30,
      stroopScore: 35
    });
    expect(result.finalRiskCategory).toBe("Critical");
  });
});

describe("missing data is excluded, not invented", () => {
  it("handles an empty input without crashing and reports zero confidence", () => {
    const result = predictRisk({});
    expect(result.addictionRiskScore).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.topRiskFactors.length).toBe(3);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.explanation).toMatch(/No signals/);
  });

  it("does not fabricate focus or memory scores without cognitive tests", () => {
    const result = predictRisk({ dailyUsageMinutes: 120, sleepHours: 7 });
    expect(result.focusScore).toBeNull();
    expect(result.memoryScore).toBeNull();
    expect(result.missing).toContain("Cognitive tests");
  });

  it("renormalises weights so one measured factor is not diluted by unmeasured ones", () => {
    const result = predictRisk({ dailyUsageMinutes: 240 });
    // Only daily usage was measured (risk 90) -> the score is 90, not 90 * its raw 14% weight.
    expect(result.addictionRiskScore).toBe(90);
    expect(result.breakdown.find((factor) => factor.key === "dailyUsage")?.weightPct).toBe(100);
  });

  it("confidence grows as more evidence is supplied", () => {
    const partial = predictRisk({ dailyUsageMinutes: 90 }).confidence;
    const full = predictRisk(lowRisk).confidence;
    expect(full).toBeGreaterThan(partial);
    expect(full).toBeGreaterThanOrEqual(90);
  });
});

describe("model behaviour", () => {
  it("regression: session length is measured in seconds and genuinely moves the score", () => {
    const short = predictRisk({ ...lowRisk, sessionDuration: 300 });
    const long = predictRisk({ ...lowRisk, sessionDuration: 3600 });
    expect(long.addictionRiskScore).toBeGreaterThan(short.addictionRiskScore + 3);
    expect(long.breakdown.find((factor) => factor.key === "sessionLength")?.score).toBeGreaterThan(80);
  });

  it("is monotonic in swipe speed and urge", () => {
    const calm = predictRisk({ ...lowRisk, videosPerMinute: 1, urgeToContinueScore: 2 });
    const frantic = predictRisk({ ...lowRisk, videosPerMinute: 6, urgeToContinueScore: 9 });
    expect(frantic.addictionRiskScore).toBeGreaterThan(calm.addictionRiskScore);
  });

  it("factor contributions add up to the final score", () => {
    const result = predictRisk(lowRisk);
    const sum = result.breakdown.reduce((total, factor) => total + factor.contribution, 0);
    expect(Math.abs(sum - result.addictionRiskScore)).toBeLessThan(0.6);
  });

  it("keeps all scores within 0-100", () => {
    const result = predictRisk({ ...lowRisk, dailyUsageMinutes: 9999, sessionDuration: 99999, videosPerMinute: 99 });
    for (const value of [result.addictionRiskScore, result.impulseControlScore, result.moodDependencyScore, result.digitalWellbeingScore]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it("derives the explanation from real inputs", () => {
    const result = predictRisk({ ...lowRisk, dailyUsageMinutes: 200, trend: { direction: "worsening", delta: 12, sessions: 5 } });
    expect(result.explanation).toMatch(/daily short-video time/i);
    expect(result.explanation).toMatch(/worsening/);
  });
});
