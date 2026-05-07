import { describe, expect, it } from "vitest";
import { predictRisk } from "./risk-engine";
import type { RiskInput } from "../types";

const lowRisk: RiskInput = {
  dailyUsageMinutes: 20,
  lateNightUsageScore: 0,
  losesTrackOfTimeScore: 0,
  unintentionalOpeningScore: 0,
  plannedVsActualGap: 0,
  sessionDuration: 120,
  videosWatched: 2,
  urgeToContinueScore: 1,
  moodDropScore: 0,
  studyHours: 4,
  sleepHours: 8,
  reactionTime: 280,
  memoryScore: 90,
  stroopScore: 92
};

describe("predictRisk", () => {
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
      urgeToContinueScore: 5
    });
    expect(result.finalRiskCategory).toBe("Moderate");
  });

  it("classifies high risk input", () => {
    const result = predictRisk({
      dailyUsageMinutes: 160,
      lateNightUsageScore: 75,
      losesTrackOfTimeScore: 75,
      unintentionalOpeningScore: 75,
      plannedVsActualGap: 10,
      sessionDuration: 900,
      videosWatched: 12,
      skipRate: 0.5,
      urgeToContinueScore: 8,
      moodDropScore: 2,
      studyHours: 1,
      sleepHours: 5.5,
      reactionTime: 620,
      memoryScore: 55,
      stroopScore: 58,
      continuedAfterWarning: true
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
      sessionDuration: 2400,
      videosWatched: 30,
      skipRate: 0.8,
      urgeToContinueScore: 10,
      moodDropScore: 4,
      studyHours: 0.5,
      sleepHours: 4.5,
      reactionTime: 850,
      memoryScore: 30,
      stroopScore: 35,
      continuedAfterWarning: true
    });
    expect(result.finalRiskCategory).toBe("Critical");
  });

  it("handles missing values without crashing", () => {
    const result = predictRisk({});
    expect(result.addictionRiskScore).toBeGreaterThanOrEqual(0);
    expect(result.digitalWellbeingScore).toBeLessThanOrEqual(100);
    expect(result.topRiskFactors.length).toBe(3);
  });
});
