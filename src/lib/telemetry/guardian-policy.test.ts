import { describe, expect, it } from "vitest";
import type { CompulsionReading } from "./compulsion";
import { buildGuardianContext, COOLDOWN_MS, MAX_INTERVENTIONS, shouldIntervene, type TriggerInput } from "./guardian-policy";

const reading = (index: number): CompulsionReading => ({
  index,
  level: index >= 60 ? "compulsive" : index >= 35 ? "drifting" : "calm",
  components: [{ key: "cadence", label: "Swipe speed", value: 0.8, weight: 0.3, contribution: 24, detail: "Last 6 reels held for 2.4s on average" }],
  evidence: ["Swipe speed: Last 6 reels held for 2.4s on average"]
});

const base: TriggerInput = {
  reading: reading(30),
  viewCount: 12,
  elapsedSec: 200,
  plannedMinutes: 10,
  interventions: 0,
  lastInterventionAtMs: null,
  nowMs: 1_000_000,
  overrunHandled: false
};

describe("guardian policy", () => {
  it("stays quiet for calm scrolling", () => {
    expect(shouldIntervene(base)).toBeNull();
  });

  it("triggers on high compulsion and on the first plan overrun", () => {
    expect(shouldIntervene({ ...base, reading: reading(70) })).toBe("compulsion");
    expect(shouldIntervene({ ...base, elapsedSec: 601 })).toBe("overrun");
    expect(shouldIntervene({ ...base, elapsedSec: 601, overrunHandled: true })).toBeNull();
  });

  it("does not judge the warm-up, respects the cooldown, and caps interventions", () => {
    expect(shouldIntervene({ ...base, reading: reading(90), viewCount: 3 })).toBeNull();
    expect(shouldIntervene({ ...base, reading: reading(90), lastInterventionAtMs: base.nowMs - COOLDOWN_MS + 1000 })).toBeNull();
    expect(shouldIntervene({ ...base, reading: reading(90), lastInterventionAtMs: base.nowMs - COOLDOWN_MS - 1 })).toBe("compulsion");
    expect(shouldIntervene({ ...base, reading: reading(90), interventions: MAX_INTERVENTIONS })).toBeNull();
  });
});

describe("buildGuardianContext", () => {
  it("never includes video titles or the user's name unless provided, and caps recent history", () => {
    const views = Array.from({ length: 20 }, (_, i) => ({ videoId: `v${i}`, title: "secret title", index: i, startedAtMs: 0, dwellMs: 2500, watchedMs: 2000, durationSec: 20, completion: 0.1, loops: 0, skippedEarly: true, liked: false, soundOn: false }));
    const context = buildGuardianContext({ reading: reading(70), views, elapsedSec: 700.4, config: { plannedMinutes: 10, moodBefore: "Stressed", reason: "Habit", queries: [] }, hour: 23, events: [], dailyLimitMinutes: null });
    expect(JSON.stringify(context)).not.toContain("secret title");
    expect(context.recentDwellSec).toHaveLength(12);
    expect(context.elapsedSec).toBe(700);
  });
});
