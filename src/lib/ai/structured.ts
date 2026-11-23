import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export interface StructuredArgs<S extends z.ZodType> {
  client: Anthropic;
  model: string;
  system: string;
  /** Volatile data for this call (already wrapped in data tags). */
  user: string;
  schema: S;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface StructuredResult<T> {
  data: T;
  usage: { inputTokens: number; outputTokens: number };
  ms: number;
}

/**
 * One Claude call that must return JSON matching a zod schema (structured outputs). Throws on refusal, truncation or
 * schema mismatch so callers can fall back to their deterministic path.
 */
export async function callStructured<S extends z.ZodType>(args: StructuredArgs<S>): Promise<StructuredResult<z.infer<S>>> {
  const started = Date.now();
  const timeout = AbortSignal.timeout(args.timeoutMs ?? 20_000);
  const signal = args.signal ? AbortSignal.any([args.signal, timeout]) : timeout;

  const message = await args.client.messages.parse(
    {
      model: args.model,
      max_tokens: args.maxTokens ?? 2000,
      system: [{ type: "text", text: args.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: args.user }],
      output_config: { effort: args.effort ?? "low", format: zodOutputFormat(args.schema) }
    },
    { signal }
  );

  if (message.stop_reason === "refusal") throw new Error("model refused");
  if (message.stop_reason === "max_tokens") throw new Error("response truncated");
  if (message.parsed_output === null || message.parsed_output === undefined) throw new Error("no structured output");

  return {
    data: message.parsed_output as z.infer<S>,
    usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
    ms: Date.now() - started
  };
}
