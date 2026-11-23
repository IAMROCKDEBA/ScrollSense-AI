import { describe, expect, it } from "vitest";
import { buildRiskInput } from "@/lib/risk-input";
import { predictRisk } from "@/lib/risk-engine";
import { generatePersona } from "./demo-persona";

describe("demo persona", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");
  const persona = generatePersona(now);

  it("is deterministic", () => {
    expect(JSON.stringify(generatePersona(now))).toBe(JSON.stringify(persona));
  });

  it("produces 12 completed sessions with real telemetry that never lie in the future", () => {
    expect(persona.sessions).toHaveLength(12);
    for (const session of persona.sessions) {
      expect(session.completed).toBe(true);
      expect(session.views?.length ?? 0).toBeGreaterThan(5);
      expect(Date.parse(session.startedAt)).toBeLessThanOrEqual(now.getTime());
      expect(session.videosWatched).toBe(session.views?.length);
    }
  });

  it("tells an improving story the risk model can detect", () => {
    const input = buildRiskInput(persona.profile, persona.sessions, persona.cognitiveResult, persona.moodLogs);
    const risk = predictRisk(input);
    expect(risk.trend?.direction).toBe("improving");
    expect(risk.confidence).toBeGreaterThan(90);
    expect(["Moderate", "High"]).toContain(risk.finalRiskCategory);
  });
});
