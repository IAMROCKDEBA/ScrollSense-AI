import Anthropic from "@anthropic-ai/sdk";
import type { CoachEvent } from "./events";
import { toolLabels } from "./events";
import { describeAiError } from "./errors";
import { COACH_SYSTEM } from "./prompts";
import type { Snapshot } from "./schemas";
import { runTool } from "./tool-executors";
import { coachTools } from "./tools";

export interface CoachLoopArgs {
  client: Anthropic;
  model: string;
  history: { role: "user" | "assistant"; content: string }[];
  snapshot: Snapshot;
  emit: (event: CoachEvent) => void;
  signal?: AbortSignal;
  maxIterations?: number;
}

const MAX_TOKENS = 8000;

/** Describe what the agent can see without leaking raw data into the prompt (it fetches details through tools). */
export function appStateBlock(snapshot: Snapshot) {
  const completed = snapshot.sessions.filter((session) => session.completed !== false).length;
  const state = {
    profileSaved: snapshot.profile !== null,
    completedSessions: completed,
    moodCheckIns: snapshot.moodLogs.length,
    brainTestsTaken: snapshot.cognitive !== null,
    dailyLimitMinutes: snapshot.dailyLimitMinutes,
    commitments: snapshot.commitments.map((item) => ({ text: item.text, done: item.done })),
    usingDemoPersonaData: snapshot.demoPersona
  };
  return `<app_state>\n${JSON.stringify(state)}\n</app_state>`;
}

function toParams(args: CoachLoopArgs): Anthropic.MessageParam[] {
  const params: Anthropic.MessageParam[] = args.history.map((message) => ({ role: message.role, content: message.content }));
  // Attach the app-state summary to the last user turn only (keeps earlier turns byte-stable for caching).
  const last = params.at(-1);
  if (last && last.role === "user" && typeof last.content === "string") {
    last.content = [
      { type: "text", text: appStateBlock(args.snapshot) },
      { type: "text", text: last.content }
    ];
  }
  return params;
}

/**
 * Streaming manual tool loop. Read / simulate tools run server-side against the snapshot; action tools are
 * acknowledged to the model and forwarded to the browser as `action` events. Thinking blocks are replayed unchanged.
 */
export async function runCoachLoop(args: CoachLoopArgs): Promise<void> {
  const { client, model, emit, signal } = args;
  const maxIterations = args.maxIterations ?? 6;
  const started = Date.now();
  const messages = toParams(args);
  const totals = { input: 0, output: 0, cacheRead: 0 };
  let iterations = 0;
  let stopReason = "end_turn";
  let parseRetries = 0;

  try {
    while (iterations < maxIterations) {
      iterations += 1;
      const stream = client.messages.stream(
        {
          model,
          max_tokens: MAX_TOKENS,
          system: [{ type: "text", text: COACH_SYSTEM, cache_control: { type: "ephemeral" } }],
          tools: coachTools,
          messages,
          thinking: { type: "adaptive", display: "summarized" },
          output_config: { effort: "medium" }
        },
        { signal }
      );

      stream.on("text", (delta) => emit({ type: "text", delta }));
      stream.on("thinking", (delta) => emit({ type: "thinking", delta }));
      stream.on("streamEvent", (event) => {
        if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
          emit({ type: "tool_start", id: event.content_block.id, name: event.content_block.name });
        }
      });

      let message: Anthropic.Message;
      try {
        message = await stream.finalMessage();
        parseRetries = 0;
      } catch (error) {
        // An unparseable tool input or a dropped connection is retried; API errors are not.
        if (error instanceof Anthropic.APIError || signal?.aborted || parseRetries++ >= 2) throw error;
        iterations -= 1;
        continue;
      }

      totals.input += message.usage.input_tokens;
      totals.output += message.usage.output_tokens;
      totals.cacheRead += message.usage.cache_read_input_tokens ?? 0;
      stopReason = message.stop_reason ?? "end_turn";

      if (message.stop_reason === "refusal") {
        emit({ type: "error", code: "refused", message: "The AI declined to answer that. Try rephrasing your question." });
        break;
      }

      const toolUses = message.content.filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
      if (toolUses.length === 0 || message.stop_reason === "end_turn") break;
      if (message.stop_reason === "max_tokens") {
        emit({ type: "error", code: "invalid", message: "The answer was cut off. Ask a narrower question." });
        break;
      }

      // Replay the assistant turn unchanged (thinking blocks included), then answer every tool_use in ONE user message.
      messages.push({ role: "assistant", content: message.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const t0 = Date.now();
        const outcome = runTool(toolUse.name, toolUse.input, args.snapshot);
        emit({
          type: "tool_result",
          id: toolUse.id,
          name: toolUse.name,
          summary: outcome.summary,
          ms: Date.now() - t0,
          card: outcome.card,
          error: outcome.isError
        });
        if (outcome.action) {
          emit({ type: "action", id: toolUse.id, label: outcome.actionLabel ?? toolLabels[toolUse.name] ?? toolUse.name, action: outcome.action });
        }
        results.push({ type: "tool_result", tool_use_id: toolUse.id, content: outcome.content, is_error: outcome.isError });
      }
      messages.push({ role: "user", content: results });

      if (iterations >= maxIterations) {
        stopReason = "max_iterations";
      }
    }

    emit({ type: "usage", inputTokens: totals.input, outputTokens: totals.output, cacheReadTokens: totals.cacheRead });
    emit({ type: "done", stopReason, iterations, ms: Date.now() - started, model, source: "ai" });
  } catch (error) {
    if (signal?.aborted) return;
    emit(describeAiError(error));
  }
}
