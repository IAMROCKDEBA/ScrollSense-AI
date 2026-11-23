# ScrollSense AI: Viva & Demo Guide

A 10-minute story, the architecture in one page, and straight answers to the questions examiners are likely to ask.

## 1. Demo script (≈ 8 minutes)

1. **Open Settings → Load demo persona.** (Explain: 14 days of generated history so every screen is rich. It is clearly labelled and removable.)
2. **Dashboard.** Point at the risk score, the **confidence** figure, and *How your score was calculated*: every point traced to a measured factor, unmeasured inputs excluded, not assumed. Show the improving **trend** badge.
3. **Coach.** Ask *"Why is my risk score what it is?"* → watch the tool steps ("Analysing your risk score…"), the card, the streamed answer. Then *"What if I slept 8 hours and cut 30 minutes a day?"* → a what-if card computed by the **real** scoring model, not guessed. Ask *"Set a 45 minute daily limit"* → an action chip with **Undo**. Open the **Agent trace** (model, tool calls, tokens, cache reads).
4. **Feed.** Type a goal in the Intent Studio ("exam tomorrow, calm down then learn something"). Show the plan (queries, guardrails, mantra) and the Reels feed: one video per swipe, arrow keys, double-tap to like. Watch the **Attention Pulse** react as you swipe fast. When the **Live Guardian** appears, read its evidence lines (those are the measured facts it was given) and pick an action.
5. **End session → Session Autopsy.** Show the per-reel attention timeline, the patterns (each quoting real numbers), and the experiment for tomorrow. Mention the grounding guard.
6. **Close:** limitations slide (below), then offer to kill the network to show the offline agents.

## 2. Architecture in one minute

- **Deterministic core:** `risk-engine.ts` (17 weighted factors), `compulsion.ts` (6-signal live index), `guardian-policy.ts` (when to intervene), `ReelTracker` (per-video telemetry). Plain, unit-tested TypeScript.
- **Agent layer (Claude):**
  - *Sense Coach*: tool-using agent. Streaming manual loop (`agent-loop.ts`): up to 6 iterations, `tool_use` → execute → one `tool_result` message → continue. Thinking blocks replayed unchanged.
  - *Guardian, Intent Planner, Autopsy*: single structured-output calls (JSON schema from zod), validated again server-side.
- **Where tools run:** read and what-if tools execute **server-side** against a compact snapshot the browser sends; **action** tools are acknowledged to the model and streamed to the browser, which executes them and offers Undo. This keeps the API key server-side, needs no database, and avoids round-tripping model reasoning through the client.
- **Safety nets:** zod validation + size caps + rate limit on every route; tool inputs validated before running; user text passed as tagged data; grounding guard; refusal / truncation / timeout handling; deterministic offline fallback for every agent.

## 3. Likely questions

**Is this machine learning?**
The scoring model is a transparent, weighted rule model, deliberately: it is explainable (each factor's contribution is shown) and honest for a project with no labelled clinical dataset. The AI is the **LLM agent layer** (Claude) on top, plus a live behavioural index. Future work is to validate the weights against a clinical scale and fit a supervised model on consented data.

**How do you stop the LLM from making up numbers?**
Three layers: (1) the agent gets numbers only through tools or structured telemetry; (2) prompts forbid inventing figures; (3) a **numeric grounding guard** extracts every number from Guardian/Autopsy text and verifies it against the source data (rounding, percent↔fraction and seconds↔minutes allowed). Ungrounded claims are dropped, or the whole answer is replaced by the deterministic offline analyst. This is unit-tested with a mocked model that tries to invent "777 reels".

**What makes this "agentic" rather than a chatbot?**
The Coach decides which tools to call, in what order, observes results and iterates (a real tool loop); it can change application state (limits, commitments, navigation, breaks); and the Guardian acts autonomously during a live session, escalating on dismissals with a cooldown and an intervention cap.

**Does it track my phone?**
No. Behaviour is measured only inside this app's feed (a deliberate boundary). Phone-wide measurement would need an Android Usage Access integration (listed as future work).

**Privacy?**
Data lives in the browser. For an AI request a compact snapshot goes to the server and on to Claude; nothing is stored server-side. The Coach's profile tool omits the name. Keys are server-only.

**What if the API fails or there is no internet during the viva?**
Every agent has an offline twin using the same tools and telemetry; the UI shows an "Offline" badge instead of an error. The Shorts feed has a pre-verified offline pool.

**Why a server-side loop instead of calling the API from the browser?**
The key must never reach the browser, and thinking blocks must be replayed unchanged within a tool loop, which is simplest where the loop runs. The server is stateless.

**What are the limitations you know about?** (say these first)
- Weights are hand-set, not clinically validated. Confidence is reported to be honest about that.
- Signals come only from the in-app feed, not other apps.
- LLM answers can still be wrong; grounding reduces but cannot remove that.
- In-memory rate limiter is per instance; localStorage only (no cross-device sync).
- Demo persona data is generated, and labelled as such.

**How did you test it?**
60+ automated tests (risk model, aggregation/trend, telemetry, compulsion, guardian policy, storage migration, tool executors, mocked-Claude agents and agent loop, grounding, persona) plus type-check and lint gates, plus manual visual QA on desktop/tablet/phone in light and dark themes.

## 4. Where to find things

| Topic | File |
| --- | --- |
| Reels scroller, gestures, telemetry hooks | `src/components/feed/reels-feed.tsx`, `reel-player.tsx` |
| Shorts API (verification, cache, rate limit) | `src/app/api/shorts/route.ts`, `src/lib/shorts/` |
| Compulsion index / Guardian policy | `src/lib/telemetry/compulsion.ts`, `guardian-policy.ts` |
| Risk model v2 | `src/lib/risk-engine.ts`, `risk-input.ts` |
| Agent loop, tools, prompts | `src/lib/ai/agent-loop.ts`, `tools.ts`, `tool-executors.ts`, `prompts.ts` |
| Structured agents + grounding | `src/lib/ai/agents.ts`, `structured.ts`, `grounding.ts` |
| Offline agents | `src/lib/ai/fallback.ts` |
| Coach UI / chat state | `src/components/coach/`, `src/store/coach-store.ts` |
