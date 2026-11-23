# ScrollSense AI

**An agentic AI that watches how you scroll, explains what it sees with real numbers, and helps you take back control.**

ScrollSense AI is a college major project: a Next.js web app (installable as a PWA) that studies short-video habits in students. Instead of guessing from a questionnaire, it runs a full-screen, Reels-style Shorts feed, measures real behaviour (hold time, quick skips, swipe speed, rewatches), and puts four Claude-powered agents around it.

> Educational tool, not a medical device. It estimates risk from self-report, in-app behaviour and cognitive mini-tests; it does not read private phone data.

## What makes it different

| Feature | What it does |
| --- | --- |
| **Reels-grade Shorts feed** | Full-screen vertical YouTube Shorts, one per swipe/scroll/arrow key, scroll-snap, next video pre-buffered, only 3 players mounted at a time. Double-tap likes, hold pauses. Desktop shows a phone-shaped column with colour-bleed glow and a live side panel. |
| **Live Guardian (agent)** | A deterministic *Compulsion Index* (swipe speed, skip streak, attention decay, plan overrun, late night, mood) decides **when** to intervene; a Claude agent decides **how**: a personalised, evidence-citing nudge that can pause the feed, start a breathing break, retune the upcoming videos or end the session. The user always has the last word. |
| **Sense Coach (agentic chatbot)** | Claude with 13 tools. It *reads* your sessions/scores, *simulates* what-ifs by re-running the app's real scoring model, and *acts* (open pages, breathing break, daily limit, intent feed, brain tests, commitments). Streams live, shows every tool call and an agent trace, renders generative cards, and every state change has an **Undo**. |
| **Intent Studio** | Say what you want from the scroll ("exam tomorrow, calm down then learn something"); an AI planner turns it into search queries, a time budget, guardrails and a mantra. |
| **Session Autopsy** | After each session: a per-reel attention timeline plus a Claude analysis. Every number in it is checked against your data by a **grounding guard**; invented figures are dropped. |
| **Honest scoring engine (v2)** | 17-factor transparent weighted model. Unmeasured inputs are *excluded* (never assumed), a confidence value is reported, each factor's exact point contribution is shown, and recency-weighted multi-session trends are detected. |
| **Offline fallbacks** | Every AI feature has a deterministic offline twin built on the same tools and telemetry, so the demo works with no network or API credit. |

## Quick start

```powershell
npm install
copy .env.example .env.local   # then fill in the keys
npm run dev                    # http://localhost:3000
```

`.env.local`:

| Variable | Purpose | Without it |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | YouTube Data API v3 (server-side only) | Feed uses the bundled, pre-verified offline Shorts pool |
| `ANTHROPIC_API_KEY` | Claude Messages API (server-side only) | AI features run in scripted offline mode (badge shows "Offline") |
| `ANTHROPIC_MODEL` | Model for Coach and Autopsy (default `claude-opus-5-5`) | default |
| `ANTHROPIC_FAST_MODEL` | Model for Guardian and Intent (default = `ANTHROPIC_MODEL`) | default |

Cheaper/faster alternatives: set `ANTHROPIC_MODEL=claude-sonnet-5-5` and `ANTHROPIC_FAST_MODEL=claude-haiku-5-5`.

**Best demo flow:** Settings → *Load demo persona* (14 days of generated history) → Dashboard → Coach → Feed.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop / production build / serve |
| `npm run typecheck` · `npm run lint` · `npm test` | Quality gates (all must pass) |
| `npm run seed:shorts` | Re-snapshot a verified offline Shorts pool into `src/data/shorts-seed.json` (uses ≈1,000 YouTube quota units) |

## Architecture

```
Browser (all personal data in localStorage)
 ├─ Reels feed ──► ReelTracker ──► Compulsion Index ──► Guardian policy
 ├─ zustand stores (app data v2, coach chat)
 └─ POST compact data snapshot ─────────────────────────────┐
                                                            ▼
Next.js server routes                                 ┌─────────────┐
 /api/shorts      YouTube search → verify Shorts       │ Claude API  │
                  (duration ≤ 60 s, embeddable,        │ (Messages)  │
                  HEAD /shorts/{id}) → cache → rate    └──────▲──────┘
                  limit → seeded offline fallback             │
 /api/ai/coach    SSE: agent loop ── tools ───────────────────┤  read + simulate tools run
 /api/ai/guardian structured JSON (zod) + grounding guard ────┤  server-side on the snapshot;
 /api/ai/intent   structured JSON (zod)                       │  action tools stream to the
 /api/ai/autopsy  structured JSON (zod) + grounding guard ────┘  browser, which executes them
```

Key design decisions (details in [VIVA.md](VIVA.md)):

- **Server-side agent loop, snapshot from the client.** No database; the API key never reaches the browser; thinking blocks are replayed unchanged inside the tool loop.
- **Deterministic core, LLM on top.** The risk model, compulsion index and what-if simulator are plain, unit-tested TypeScript. Claude explains and acts on them; it never invents data (numeric grounding guard) and never decides *when* to interrupt.
- **Defence in depth.** zod validation and size caps on every route, per-IP rate limiting, tool inputs validated before execution, user text passed as tagged data, action tools whitelisted and undoable.
- **Graceful degradation.** Missing key, quota exhaustion, timeouts, refusals and offline all fall back to deterministic behaviour instead of errors.

### Project layout

```
src/app/            pages + API routes (feed, coach, dashboard, tests, report, settings, api/shorts, api/ai/*)
src/components/     feed/ (reels, guardian, intent, autopsy)  coach/  ui/  layout/  charts/
src/lib/            risk-engine.ts  risk-input.ts  telemetry/  shorts/  ai/ (agent loop, tools, prompts, fallbacks)
src/store/          app-store.ts (data, v1→v2 migration)  coach-store.ts
src/data/           shorts-seed.json  demo-persona.ts
```

## Quality

- TypeScript strict, ESLint (Next + React Hooks rules) clean, 60+ unit tests: risk model, aggregation and trends, telemetry, compulsion index, guardian policy, storage migration, tool executors, structured agents with a mocked Claude client, the streaming agent loop (tool round-trips, thinking replay, iteration cap, refusal), grounding guard, demo persona.
- Accessibility: skip link, labelled controls, 48 px targets, `aria-live` chat log, keyboard-operable feed (↑ ↓ J K Space M L), reduced-motion support, WCAG AA contrast gate (`scripts/contrast-check.mjs`).
- Performance: only the active reel plus its neighbours mount a player; transform/opacity-only animation; imperative progress bar (no per-frame React renders); lazy-loaded motion and chart bundles.

## Privacy and limits

- Personal data stays in your browser. When you use an AI feature, a compact snapshot is sent through this app's server to Claude to produce the reply; nothing is stored server-side. The Coach's `get_profile` tool deliberately omits your name.
- Behavioural signals come only from this app's own feed, not from other apps or the phone.
- Scoring weights are hand-set and not clinically validated; LLM output can be wrong (the grounding guard and offline fallbacks reduce, not eliminate, that).
- Embedded videos use `youtube-nocookie.com` and are neither downloaded nor redistributed.

## Deployment

Any Node host (for example Vercel): set the environment variables above and run `npm run build && npm start`. The service worker registers in production only. The in-memory rate limiter is per instance; swap it for a shared store (Redis/Upstash) if you scale out.
