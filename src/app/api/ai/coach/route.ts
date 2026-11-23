import { runCoachLoop } from "@/lib/ai/agent-loop";
import { aiConfig, getAnthropic } from "@/lib/ai/config";
import type { CoachEvent } from "@/lib/ai/events";
import { offlineCoachScript } from "@/lib/ai/fallback";
import { guardRequest, sseFrame, sseHeaders } from "@/lib/ai/http";
import { CoachRequestSchema } from "@/lib/ai/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  const guard = await guardRequest(request, "coach", 20, CoachRequestSchema);
  if (!guard.ok) return guard.response;
  const { messages, snapshot } = guard.data;

  const client = getAnthropic();
  const config = aiConfig();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const abort = new AbortController();
      request.signal.addEventListener("abort", () => abort.abort(), { once: true });
      let closed = false;
      let sawOutput = false;

      const send = (event: CoachEvent) => {
        if (closed || abort.signal.aborted) return;
        if (event.type === "text" || event.type === "tool_start") sawOutput = true;
        try {
          controller.enqueue(sseFrame(event.type, event));
        } catch {
          closed = true;
        }
      };

      const playOffline = async (reason?: string) => {
        if (reason) send({ type: "error", code: "no_key", message: reason });
        for (const event of offlineCoachScript(messages, snapshot)) {
          if (abort.signal.aborted) return;
          send(event);
          await sleep(event.type === "text" ? 22 : event.type === "tool_start" ? 320 : 60);
        }
      };

      try {
        if (!client) {
          await playOffline();
        } else {
          let failure: Extract<CoachEvent, { type: "error" }> | null = null;
          await runCoachLoop({
            client,
            model: config.model,
            history: messages,
            snapshot,
            signal: abort.signal,
            emit: (event) => {
              // Hold back a failure so we can fall back to the offline coach when nothing was shown yet.
              if (event.type === "error" && event.code !== "refused" && !sawOutput) failure = event;
              else send(event);
            }
          });
          if (failure) await playOffline(`${(failure as { message: string }).message} Switching to the offline coach.`);
        }
      } catch {
        send({ type: "error", code: "unknown", message: "Something went wrong while talking to the AI." });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed by the client */
        }
      }
    },
    cancel() {
      /* the abort listener on request.signal stops the upstream call */
    }
  });

  return new Response(stream, { headers: sseHeaders });
}
