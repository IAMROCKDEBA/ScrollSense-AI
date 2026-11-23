import { fallbackIntent, type IntentPlan } from "@/lib/intent";
import { predictRisk } from "@/lib/risk-engine";
import { round } from "@/lib/utils";
import type { CoachEvent } from "./events";
import type { AutopsyOutput, AutopsyRequest, GuardianContext, GuardianOutput, IntentRequestBody, Snapshot } from "./schemas";
import { inputFromSnapshot } from "./snapshot";
import { runTool, type ToolOutcome } from "./tool-executors";

/**
 * Deterministic "offline" versions of every agent. They use the same tools, scoring model and telemetry as the live
 * agents, so a demo without network or API credit still shows real, data-grounded behaviour (clearly labelled offline).
 */

// ------------------------------------------------------------------------------------ coach
let toolCounter = 0;
function nextId() {
  toolCounter += 1;
  return `offline_${toolCounter}`;
}

function step(name: string, input: unknown, snapshot: Snapshot, events: CoachEvent[]): ToolOutcome {
  const id = nextId();
  events.push({ type: "tool_start", id, name });
  const outcome = runTool(name, input, snapshot);
  events.push({ type: "tool_result", id, name, summary: outcome.summary, ms: 4, card: outcome.card, error: outcome.isError });
  if (outcome.action) events.push({ type: "action", id, label: outcome.actionLabel ?? name, action: outcome.action });
  return outcome;
}

function textEvents(text: string): CoachEvent[] {
  const words = text.split(/(\s+)/);
  const events: CoachEvent[] = [];
  for (let i = 0; i < words.length; i += 4) events.push({ type: "text", delta: words.slice(i, i + 4).join("") });
  return events;
}

function firstNumber(text: string): number | undefined {
  const match = /(\d+(?:\.\d+)?)/.exec(text);
  return match ? Number(match[1]) : undefined;
}

export function offlineCoachScript(history: { role: "user" | "assistant"; content: string }[], snapshot: Snapshot): CoachEvent[] {
  const question = [...history].reverse().find((message) => message.role === "user")?.content ?? "";
  const q = question.toLowerCase();
  const events: CoachEvent[] = [];
  const risk = predictRisk(inputFromSnapshot(snapshot));
  let reply: string;

  if (/(hurt myself|suicid|self.?harm|kill myself|end it all)/.test(q)) {
    reply =
      "I'm really glad you told me. I can't help with this the way a person can, so please reach out to someone you trust right now, or contact a local emergency number or a crisis helpline in your country. You deserve real support, and you don't have to carry this alone.";
  } else if (/what if|if i |would |simulate|what happens/.test(q)) {
    const mentionsSleep = /sleep|slept/.test(q);
    const sleep = mentionsSleep ? firstNumber(q) : undefined;
    const minutesLess = /(\d+)\s*(min|minutes)/.exec(q)?.[1];
    const patch: Record<string, number | string> = {};
    if (sleep !== undefined && sleep >= 3 && sleep <= 12) patch.sleepHours = sleep;
    else if (mentionsSleep) patch.sleepHours = Math.min(9, (snapshot.profile?.sleepHours ?? 6) + 1.5);
    if (minutesLess && snapshot.profile) patch.dailyUsageMinutes = Math.max(0, snapshot.profile.dailyUsageMinutes - Number(minutesLess));
    if (/late.?night|night/.test(q)) patch.lateNightUsage = "Rarely";
    if (Object.keys(patch).length === 0) {
      patch.sleepHours = Math.min(9, (snapshot.profile?.sleepHours ?? 6) + 1);
      if (snapshot.profile) patch.dailyUsageMinutes = Math.max(0, snapshot.profile.dailyUsageMinutes - 30);
    }
    const outcome = step("simulate_what_if", patch, snapshot, events);
    if (outcome.isError) reply = "I can only simulate once there is some data. Fill in your profile or run a feed session first, then ask me again.";
    else {
      const data = JSON.parse(outcome.content) as { before: { score: number }; after: { score: number }; scoreChange: number };
      const direction = data.scoreChange < 0 ? "lower" : data.scoreChange > 0 ? "higher" : "unchanged";
      reply = `Running your real scoring model on that change moves the risk score from **${data.before.score}** to **${data.after.score}** (${direction}${data.scoreChange === 0 ? "" : ` by ${Math.abs(data.scoreChange)}`}). It's a hypothetical estimate, not a prediction, but it shows which habit gives you the most for the least effort.`;
    }
  } else if (/break|breath|pause|calm|stress|anxious|overwhelm/.test(q)) {
    step("start_breathing_break", { seconds: 30 }, snapshot, events);
    reply = "Let's slow things down. I've queued a 30-second breathing break for you: in for four, out for six. When it ends, decide what you actually want next.";
  } else if (/session|last time|recent|history|yesterday/.test(q)) {
    const outcome = step("get_recent_sessions", { limit: 5 }, snapshot, events);
    const data = JSON.parse(outcome.content) as { count: number };
    reply =
      data.count === 0
        ? "You haven't completed a feed session yet. Start one from the Feed page and I'll have real swipe, skip and attention data to analyse."
        : `Here are your last ${data.count} completed sessions. Look at the skip percentage and peak compulsion: those two numbers show best whether you were choosing videos or just swiping.`;
  } else if (/test|brain|focus|memory|reaction|stroop/.test(q)) {
    const outcome = step("get_cognitive_results", {}, snapshot, events);
    const data = JSON.parse(outcome.content) as { taken?: boolean };
    if (data.taken === false) {
      step("launch_cognitive_test", { test: "reaction" }, snapshot, events);
      reply = "You haven't taken the brain tests yet, so focus and memory can't be scored honestly. I've lined up the 1-minute reaction test to start with.";
    } else reply = "These are your latest brain-test results. Retake them after a long session to see how scrolling affects your focus.";
  } else if (/limit/.test(q)) {
    const minutes = firstNumber(q);
    if (minutes && minutes >= 5 && minutes <= 240) {
      step("set_daily_limit", { minutes: Math.round(minutes) }, snapshot, events);
      reply = `Done. Your soft daily limit is now **${Math.round(minutes)} minutes**. I'll flag it when a session pushes past it.`;
    } else reply = "What daily limit feels realistic? Tell me a number of minutes (for example 45) and I'll set it.";
  } else if (/commit|promise|pledge/.test(q)) {
    step("save_commitment", { text: question.slice(0, 120) }, snapshot, events);
    reply = "Saved. A specific commitment beats a vague intention. I'll keep it in view on your dashboard.";
  } else if (/learn|study|relax|unwind|feed|laugh|motivat/.test(q)) {
    const plan = fallbackIntent(question, 10, "Neutral");
    step("start_intent_feed", { goal: question.slice(0, 190), minutes: plan.plannedMinutes }, snapshot, events);
    reply = `Good idea: choose first, scroll second. I've prepared a ${plan.plannedMinutes}-minute feed around "${question.slice(0, 60)}" with a stop point built in.`;
  } else {
    const outcome = step("get_risk_breakdown", {}, snapshot, events);
    if (risk.confidence === 0) {
      reply = "I don't have any of your data yet. Complete the short profile and a feed session, and I can explain your score, run what-if scenarios and coach you with real numbers.";
    } else {
      const top = risk.recommendations[0];
      reply = `Your current risk estimate is **${risk.addictionRiskScore}/100 (${risk.finalRiskCategory})**, with ${risk.confidence}% of the model backed by real measurements. ${risk.topRiskFactors[0] ? `The strongest driver is: ${risk.topRiskFactors[0].toLowerCase()}. ` : ""}${top ? `A good next step: **${top.title}**.` : ""}`;
    }
    void outcome;
  }

  events.push(...textEvents(reply));
  events.push({ type: "usage", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 });
  events.push({ type: "done", stopReason: "end_turn", iterations: 1, ms: 40, model: "offline-coach", source: "offline" });
  return events;
}

// ---------------------------------------------------------------------------------- guardian
export function offlineGuardian(context: GuardianContext): GuardianOutput {
  const recentAvg = context.recentDwellSec.length
    ? context.recentDwellSec.reduce((sum, value) => sum + value, 0) / context.recentDwellSec.length
    : 0;
  const dismissals = context.previous.filter((item) => item.response === "dismissed").length;
  const overPlan = context.elapsedSec > context.plannedMinutes * 60 * 1.3;
  const first = context.evidence[0];

  if ((context.level === "compulsive" && overPlan) || dismissals >= 2) {
    return {
      severity: "urgent",
      headline: "Time to call it a session",
      message: `You planned ${context.plannedMinutes} minutes and you're ${Math.round(context.elapsedSec / 60)} minutes in. ${first ?? "Your scrolling has turned automatic."} A clean stop now will feel better than another ten reels.`,
      action: "end_session"
    };
  }
  if (recentAvg > 0 && recentAvg < 4) {
    return {
      severity: context.level === "compulsive" ? "firm" : "gentle",
      headline: "You're swiping on autopilot",
      message: `Your last ${context.recentDwellSec.length} reels held you for about ${round(recentAvg, 1)} seconds each. Take 30 seconds, breathe, and choose what you actually want next.`,
      action: "breathing_break"
    };
  }
  if (context.goal && context.level !== "calm") {
    return {
      severity: "gentle",
      headline: "Let's get back on goal",
      message: `Your goal was "${context.goal.slice(0, 80)}". The feed has drifted from it, so I'm swapping the upcoming videos for ones that fit.`,
      action: "retune_feed",
      retuneIntent: "calm nature"
    };
  }
  return {
    severity: "gentle",
    headline: "Quick check-in",
    message: first ? `${first}. Still choosing what you watch?` : "You're doing fine. Keep an eye on the clock and stop when you planned to.",
    action: "continue_calm_feed"
  };
}

// ------------------------------------------------------------------------------------ intent
export function offlineIntent(request: IntentRequestBody): IntentPlan {
  const plan = fallbackIntent(request.goal, request.plannedMinutes, request.moodBefore);
  // Late night or high strain: shorten the budget, the same rule the live planner is instructed to apply.
  if ((request.hour >= 23 || request.hour < 4) && plan.plannedMinutes > 5) {
    const minutes = Math.max(3, Math.round(plan.plannedMinutes / 2));
    return {
      ...plan,
      plannedMinutes: minutes,
      guardrails: ["It's late. A shorter session protects your sleep.", `Stop at ${minutes} minutes — set a timer you can see.`, plan.guardrails[1]]
    };
  }
  return plan;
}

// ------------------------------------------------------------------------------------ autopsy
export function offlineAutopsy(request: AutopsyRequest): AutopsyOutput {
  const { session, views } = request;
  const n = views.length;
  const dwell = views.map((view) => view.dwellSec);
  const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  const half = Math.floor(n / 2);
  const firstHalf = mean(dwell.slice(0, Math.max(1, half)));
  const secondHalf = mean(dwell.slice(half));
  const skips = views.filter((view) => view.skippedEarly).length;
  let streak = 0;
  let longest = 0;
  for (const view of views) {
    streak = view.skippedEarly ? streak + 1 : 0;
    longest = Math.max(longest, streak);
  }
  const minutes = round(session.durationSeconds / 60, 1);
  const patterns: AutopsyOutput["patterns"] = [];

  if (n >= 8) {
    if (firstHalf < 4 && secondHalf < 4) {
      patterns.push({
        title: "You never settled on a video",
        evidence: `Hold time stayed under 4 seconds all session (${round(firstHalf, 1)}s early, ${round(secondHalf, 1)}s later).`,
        severity: "concern"
      });
    } else if (secondHalf < firstHalf * 0.75) {
      patterns.push({
        title: "Attention faded as you scrolled",
        evidence: `Hold time fell from ${round(firstHalf, 1)}s per reel in the first half to ${round(secondHalf, 1)}s in the second half.`,
        severity: secondHalf < firstHalf * 0.5 ? "concern" : "watch"
      });
    } else {
      patterns.push({
        title: "Your attention stayed steady",
        evidence: `You held reels for ${round(firstHalf, 1)}s early and ${round(secondHalf, 1)}s later, with no sign of fading.`,
        severity: "info"
      });
    }
  }
  if (longest >= 4) {
    patterns.push({
      title: "A rapid-fire stretch",
      evidence: `${longest} quick skips in a row; ${Math.round((skips / Math.max(1, n)) * 100)}% of all reels were left within 3 seconds.`,
      severity: longest >= 7 ? "concern" : "watch"
    });
  }
  if (session.durationSeconds / 60 > session.plannedMinutes * 1.2) {
    patterns.push({
      title: "You ran past your plan",
      evidence: `You planned ${session.plannedMinutes} minutes and scrolled ${minutes} minutes.`,
      severity: session.durationSeconds / 60 > session.plannedMinutes * 1.6 ? "concern" : "watch"
    });
  } else {
    patterns.push({
      title: "You respected your time budget",
      evidence: `You planned ${session.plannedMinutes} minutes and stopped at ${minutes} minutes.`,
      severity: "info"
    });
  }
  if (session.moodBefore && session.moodAfter && session.moodBefore !== session.moodAfter) {
    patterns.push({
      title: "Your mood shifted",
      evidence: `You started feeling ${session.moodBefore.toLowerCase()} and finished feeling ${session.moodAfter.toLowerCase()}.`,
      severity: "info"
    });
  }
  const liked = views.filter((view) => view.liked).length;
  if (liked > 0 && patterns.length < 4) {
    patterns.push({ title: "You engaged on purpose", evidence: `You liked ${liked} reel${liked === 1 ? "" : "s"}, a sign you were choosing, not just swiping.`, severity: "info" });
  }

  const order = { concern: 0, watch: 1, info: 2 } as const;
  const top = [...patterns].sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 4);
  const concerns = top.filter((pattern) => pattern.severity === "concern").length;
  const headline = concerns > 0 ? "Scrolling got away from you" : top.some((p) => p.severity === "watch") ? "Mostly in control, with a slip" : "A controlled, intentional session";

  const experiment =
    top[0]?.title === "Attention faded as you scrolled"
      ? `Set a ${Math.max(3, Math.round(minutes / 2))}-minute timer tomorrow and stop the moment you notice your hold time dropping.`
      : top[0]?.title === "A rapid-fire stretch"
        ? "Tomorrow, take the 30-second breathing break after three quick skips in a row."
        : top[0]?.title === "You ran past your plan"
          ? `Tomorrow, plan ${Math.max(3, Math.round(session.plannedMinutes * 0.8))} minutes and end on a video you enjoyed.`
          : "Repeat tomorrow: same goal, same time budget, and note how you feel afterwards.";

  return {
    headline,
    summary: `You watched ${n} reels in ${session.durationSeconds < 90 ? `${Math.round(session.durationSeconds)} seconds` : `${minutes} minutes`}, holding each for ${round(mean(dwell), 1)} seconds on average, and left ${Math.round((skips / Math.max(1, n)) * 100)}% of them within 3 seconds. ${session.goal ? `Your goal was "${session.goal.slice(0, 80)}".` : "You didn't set a goal for this session."}`,
    patterns: top,
    experimentForTomorrow: experiment,
    scoreNote: request.score
      ? `Your overall risk estimate is ${request.score.addictionRiskScore}/100 (${request.score.category}) at ${request.score.confidence}% confidence, and this session is now part of it.`
      : "This session is now part of your risk estimate."
  };
}
