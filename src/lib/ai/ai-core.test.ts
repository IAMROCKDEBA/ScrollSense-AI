import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { runAutopsy, runGuardian, runIntent } from "./agents";
import { runCoachLoop } from "./agent-loop";
import type { CoachEvent } from "./events";
import { offlineAutopsy, offlineCoachScript, offlineGuardian } from "./fallback";
import { makeSnapshot } from "./fixtures";
import { checkGrounding, extractNumbers } from "./grounding";
import type { AutopsyRequest, GuardianContext } from "./schemas";
import { CoachRequestSchema, SnapshotSchema } from "./schemas";
import { runTool } from "./tool-executors";

describe("grounding guard", () => {
  it("extracts numbers and accepts rounded, scaled and unit-converted figures", () => {
    expect(extractNumbers("3.2s and 45%")).toEqual([3.2, 45]);
    expect(checkGrounding("Held for 3.2 seconds", { dwell: 3.24 }).grounded).toBe(true);
    expect(checkGrounding("45% of reels were skipped", { skipRate: 0.45 }).grounded).toBe(true);
  });

  it("rejects invented figures", () => {
    const result = checkGrounding("You watched 97 reels", { videos: 12 });
    expect(result.grounded).toBe(false);
    expect(result.ungrounded).toEqual([97]);
  });
});

describe("tool executors", () => {
  const snapshot = makeSnapshot();

  it("what-if with more sleep lowers the risk using the real model", () => {
    const outcome = runTool("simulate_what_if", { sleepHours: 8 }, snapshot);
    expect(outcome.isError).toBeFalsy();
    const data = JSON.parse(outcome.content) as { scoreChange: number };
    expect(data.scoreChange).toBeLessThan(0);
    expect(outcome.card?.type).toBe("what_if");
  });

  it("what-if without data or without changes is a graceful tool error", () => {
    expect(runTool("simulate_what_if", { sleepHours: 8 }, makeSnapshot({ profile: null, sessions: [], cognitive: null })).isError).toBe(true);
    expect(runTool("simulate_what_if", {}, snapshot).isError).toBe(true);
  });

  it("validates tool input and rejects unknown tools", () => {
    expect(runTool("set_daily_limit", { minutes: 9999 }, snapshot).isError).toBe(true);
    expect(runTool("navigate", { path: "/etc/passwd" }, snapshot).isError).toBe(true);
    expect(runTool("rm_rf", {}, snapshot).isError).toBe(true);
  });

  it("action tools return an action for the browser and an acknowledgement for the model", () => {
    const outcome = runTool("set_daily_limit", { minutes: 45 }, snapshot);
    expect(outcome.action).toEqual({ type: "set_daily_limit", minutes: 45 });
    expect(JSON.parse(outcome.content)).toMatchObject({ ok: true });
  });

  it("risk breakdown card carries the real score and never leaks the user's name to the model", () => {
    const risk = runTool("get_risk_breakdown", {}, snapshot);
    expect(risk.card?.type).toBe("risk");
    const profile = runTool("get_profile", {}, snapshot);
    expect(profile.content).not.toContain("Asha");
  });
});

describe("request schemas", () => {
  it("rejects oversized or malformed coach requests", () => {
    expect(CoachRequestSchema.safeParse({ messages: [], snapshot: makeSnapshot() }).success).toBe(false);
    expect(CoachRequestSchema.safeParse({ messages: [{ role: "user", content: "x".repeat(5000) }], snapshot: makeSnapshot() }).success).toBe(false);
    expect(SnapshotSchema.safeParse({ ...makeSnapshot(), sessions: Array(40).fill(makeSnapshot().sessions[0]) }).success).toBe(false);
  });

  it("accepts a valid request", () => {
    expect(CoachRequestSchema.safeParse({ messages: [{ role: "user", content: "hi" }], snapshot: makeSnapshot() }).success).toBe(true);
  });
});

// --------------------------------------------------------------------------- fake Anthropic
function parseClient(parsedOutput: unknown, stop = "end_turn"): Anthropic {
  return {
    messages: {
      parse: async () => ({ stop_reason: stop, parsed_output: parsedOutput, usage: { input_tokens: 10, output_tokens: 5 } })
    }
  } as unknown as Anthropic;
}

const guardianContext: GuardianContext = {
  compulsion: 68,
  level: "compulsive",
  evidence: ["Swipe speed: Last 6 reels held for 2.4s on average"],
  components: [{ label: "Swipe speed", contribution: 24, detail: "Last 6 reels held for 2.4s on average" }],
  elapsedSec: 700,
  plannedMinutes: 10,
  hour: 23,
  videosWatched: 31,
  recentDwellSec: [2, 3, 2, 2, 3, 2],
  previous: []
};

describe("agents with structured outputs", () => {
  it("guardian uses the model output when its numbers are grounded", async () => {
    const client = parseClient({ severity: "firm", headline: "You are on autopilot", message: "Your last reels held you for about 2.4 seconds each. Take a breath.", action: "breathing_break" });
    const result = await runGuardian(guardianContext, { client, model: "m" });
    expect(result.source).toBe("ai");
    expect(result.action).toBe("breathing_break");
    expect(result.evidence).toEqual(guardianContext.evidence);
  });

  it("guardian discards invented numbers and falls back to the deterministic agent", async () => {
    const client = parseClient({ severity: "firm", headline: "Slow down", message: "You have watched 412 reels in 9 minutes.", action: "end_session" });
    const result = await runGuardian(guardianContext, { client, model: "m" });
    expect(result.source).toBe("offline");
  });

  it("falls back when there is no key or the call throws", async () => {
    expect((await runGuardian(guardianContext, { client: null })).source).toBe("offline");
    const broken = { messages: { parse: async () => { throw new Error("boom"); } } } as unknown as Anthropic;
    expect((await runGuardian(guardianContext, { client: broken, model: "m" })).source).toBe("offline");
  });

  it("intent sanitises queries and never exceeds the requested minutes", async () => {
    const client = parseClient({ queries: ["calm nature <script>", "x", "explained simply"], plannedMinutes: 90, tone: "calm", guardrails: ["a", "b", "c", "d"], mantra: "Slow is the point." });
    const plan = await runIntent({ goal: "relax", plannedMinutes: 10, moodBefore: "Stressed", reason: "Stress relief", hour: 14 }, { client, model: "m" });
    expect(plan.source).toBe("ai");
    expect(plan.queries).toEqual(["calm nature script", "explained simply"]);
    expect(plan.plannedMinutes).toBe(10);
    expect(plan.guardrails).toHaveLength(3);
  });

  it("autopsy drops patterns whose evidence is not in the data", async () => {
    const request: AutopsyRequest = {
      session: makeSnapshot().sessions[0],
      views: Array.from({ length: 10 }, (_, i) => ({ index: i, title: `t${i}`, dwellSec: i < 5 ? 12 : 3, watchedSec: 3, completion: 0.2, loops: 0, skippedEarly: i >= 5, liked: false }))
    };
    const client = parseClient({
      headline: "Attention faded",
      summary: "You watched 10 reels in 25 minutes.",
      patterns: [
        { title: "Fade", evidence: "Hold time fell from 12 to 3 seconds.", severity: "concern" },
        { title: "Invented", evidence: "You skipped 777 reels.", severity: "concern" },
        { title: "Streak", evidence: "5 quick skips in a row.", severity: "watch" }
      ],
      experimentForTomorrow: "Stop when hold time drops.",
      scoreNote: "This session is part of your estimate."
    });
    const result = await runAutopsy(request, { client, model: "m" });
    expect(result.source).toBe("ai");
    expect(result.patterns.map((pattern) => pattern.title)).toEqual(["Fade", "Streak"]);
  });
});

describe("offline agents", () => {
  const snapshot = makeSnapshot();

  it("offline coach answers a what-if with a real simulation card and a done event", () => {
    const events = offlineCoachScript([{ role: "user", content: "What if I slept 8 hours?" }], snapshot);
    expect(events.some((event) => event.type === "tool_result" && event.card?.type === "what_if")).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: "done", source: "offline" });
    expect(events.filter((event) => event.type === "text").map((event) => (event as { delta: string }).delta).join("")).toMatch(/risk score/i);
  });

  it("offline coach handles a crisis message without using tools", () => {
    const events = offlineCoachScript([{ role: "user", content: "I want to hurt myself" }], snapshot);
    expect(events.some((event) => event.type === "tool_start")).toBe(false);
    expect(events.filter((event) => event.type === "text").map((event) => (event as { delta: string }).delta).join("")).toMatch(/trust/i);
  });

  it("offline guardian escalates after repeated dismissals", () => {
    const result = offlineGuardian({ ...guardianContext, previous: [{ headline: "a", action: "continue_calm_feed", response: "dismissed" }, { headline: "b", action: "breathing_break", response: "dismissed" }] });
    expect(result.action).toBe("end_session");
    expect(result.severity).toBe("urgent");
  });

  it("offline autopsy reports the real numbers", () => {
    const views = Array.from({ length: 12 }, (_, i) => ({ index: i, title: `t${i}`, dwellSec: i < 6 ? 14 : 2, watchedSec: 2, completion: 0.1, loops: 0, skippedEarly: i >= 6, liked: false }));
    const result = offlineAutopsy({ session: makeSnapshot().sessions[0], views });
    expect(result.patterns[0].severity).toBe("concern");
    expect(result.patterns.map((pattern) => pattern.evidence).join(" ")).toMatch(/14/);
  });
});

// ------------------------------------------------------------------------------ agent loop
interface FakeMessage {
  content: unknown[];
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };
}

function fakeStreamClient(turns: FakeMessage[]) {
  const requests: { messages: unknown[] }[] = [];
  let call = 0;
  const client = {
    messages: {
      stream: (params: { messages: unknown[] }) => {
        requests.push({ messages: structuredClone(params.messages) });
        const turn = turns[call++];
        const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
        return {
          on(event: string, handler: (...args: unknown[]) => void) {
            (handlers[event] ??= []).push(handler);
            return this;
          },
          async finalMessage() {
            for (const block of turn.content as { type: string; text?: string; id?: string; name?: string }[]) {
              if (block.type === "tool_use") handlers.streamEvent?.forEach((h) => h({ type: "content_block_start", content_block: block }));
              if (block.type === "text") handlers.text?.forEach((h) => h(block.text));
            }
            return turn;
          }
        };
      }
    }
  } as unknown as Anthropic;
  return { client, requests };
}

describe("coach agent loop", () => {
  it("runs a tool, replays thinking unchanged, answers all tool_use blocks in one user message, then finishes", async () => {
    const thinking = { type: "thinking", thinking: "", signature: "sig123" };
    const { client, requests } = fakeStreamClient([
      {
        content: [thinking, { type: "tool_use", id: "tu1", name: "get_risk_breakdown", input: {} }, { type: "tool_use", id: "tu2", name: "get_mood_trend", input: {} }],
        stop_reason: "tool_use",
        usage: { input_tokens: 100, output_tokens: 20 }
      },
      { content: [{ type: "text", text: "Your risk is moderate." }], stop_reason: "end_turn", usage: { input_tokens: 150, output_tokens: 30, cache_read_input_tokens: 90 } }
    ]);

    const events: CoachEvent[] = [];
    await runCoachLoop({ client, model: "claude-opus-5-5", history: [{ role: "user", content: "Why is my score high?" }], snapshot: makeSnapshot(), emit: (event) => events.push(event) });

    expect(events.map((event) => event.type)).toEqual(["tool_start", "tool_start", "tool_result", "tool_result", "text", "usage", "done"]);
    const second = requests[1].messages as { role: string; content: { type: string }[] }[];
    expect(second.at(-2)?.role).toBe("assistant");
    expect(second.at(-2)?.content[0]).toEqual(thinking);
    expect(second.at(-1)?.role).toBe("user");
    expect(second.at(-1)?.content.map((block) => block.type)).toEqual(["tool_result", "tool_result"]);
    expect(events.at(-2)).toMatchObject({ type: "usage", inputTokens: 250, outputTokens: 50, cacheReadTokens: 90 });
    expect(events.at(-1)).toMatchObject({ type: "done", iterations: 2, source: "ai" });
  });

  it("stops at the iteration cap instead of looping forever", async () => {
    const turn = (): FakeMessage => ({ content: [{ type: "tool_use", id: "t", name: "get_profile", input: {} }], stop_reason: "tool_use", usage: { input_tokens: 1, output_tokens: 1 } });
    const { client } = fakeStreamClient([turn(), turn(), turn()]);
    const events: CoachEvent[] = [];
    await runCoachLoop({ client, model: "m", history: [{ role: "user", content: "x" }], snapshot: makeSnapshot(), emit: (event) => events.push(event), maxIterations: 3 });
    expect(events.at(-1)).toMatchObject({ type: "done", stopReason: "max_iterations", iterations: 3 });
  });

  it("reports a refusal instead of running tools", async () => {
    const { client } = fakeStreamClient([{ content: [{ type: "tool_use", id: "t", name: "navigate", input: { path: "/feed" } }], stop_reason: "refusal", usage: { input_tokens: 1, output_tokens: 1 } }]);
    const events: CoachEvent[] = [];
    await runCoachLoop({ client, model: "m", history: [{ role: "user", content: "x" }], snapshot: makeSnapshot(), emit: (event) => events.push(event) });
    expect(events.some((event) => event.type === "tool_result")).toBe(false);
    expect(events.find((event) => event.type === "error")).toMatchObject({ code: "refused" });
  });
});
