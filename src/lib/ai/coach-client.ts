import type { CoachEvent } from "./events";
import type { Snapshot } from "./schemas";

export interface CoachTurn {
  role: "user" | "assistant";
  content: string;
}

/** Parse a text/event-stream body into CoachEvents. Resolves when the stream ends. */
export async function streamCoach(
  messages: CoachTurn[],
  snapshot: Snapshot,
  onEvent: (event: CoachEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch("/api/ai/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, snapshot }),
    signal
  });

  if (!response.ok || !response.body) {
    const retry = response.headers.get("Retry-After");
    throw new Error(
      response.status === 429
        ? `You're sending messages quickly. Try again in ${retry ?? "a few"} seconds.`
        : "The coach could not be reached. Please try again."
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
      if (dataLine) {
        try {
          onEvent(JSON.parse(dataLine.slice(6)) as CoachEvent);
        } catch {
          /* ignore a malformed frame */
        }
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
}
