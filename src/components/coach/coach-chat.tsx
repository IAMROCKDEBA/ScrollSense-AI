"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { ArrowUp, Check, ChevronRight, CircleAlert, Cpu, Loader2, RotateCcw, Sparkles, Square, Undo2, Wand2 } from "lucide-react";
import { Scrolly } from "@/components/ui/scrolly";
import { useAiStatus } from "@/hooks/use-ai-status";
import { toolLabels } from "@/lib/ai/events";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useCoachStore, type ChatMessage } from "@/store/coach-store";
import { CoachCardView } from "./cards";
import { Markdown } from "./markdown";

const suggestions = [
  "Why is my risk score what it is?",
  "What if I slept 8 hours and cut 30 minutes a day?",
  "How was my last session?",
  "I feel anxious. Help me reset.",
  "Plan a 10-minute feed to unwind, then learn something"
];

export function CoachChat({ className, compact = false }: { className?: string; compact?: boolean }) {
  const router = useRouter();
  const ai = useAiStatus();
  const messages = useCoachStore((state) => state.messages);
  const busy = useCoachStore((state) => state.busy);
  const send = useCoachStore((state) => state.send);
  const stop = useCoachStore((state) => state.stop);
  const clear = useCoachStore((state) => state.clear);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const lastText = messages.at(-1)?.text.length ?? 0;
  const lastSteps = messages.at(-1)?.steps.length ?? 0;

  useEffect(() => {
    const list = listRef.current;
    if (list && pinned.current) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages.length, lastText, lastSteps]);

  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    pinned.current = true;
    setDraft("");
    void send(text, { navigate: (path) => router.push(path) });
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className={cn("flex items-center justify-between gap-3 border-b border-foreground/10 px-4 py-3", compact && "pr-16")}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-metal text-[hsl(300_50%_9%)]">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            {busy ? <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-ping rounded-full bg-primary" aria-hidden="true" /> : null}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-medium leading-tight tracking-tight">Sense Coach</h2>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", ai?.live ? "bg-[hsl(160_60%_58%)]" : "bg-[hsl(38_92%_62%)]")} aria-hidden="true" />
              {ai === null ? "Connecting…" : ai.live ? `Live · ${ai.model}` : "Offline coach · scripted"}
            </p>
          </div>
        </div>
        {messages.length ? (
          <button type="button" onClick={clear} className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-full border border-foreground/12 px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            New chat
          </button>
        ) : null}
      </div>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-busy={busy}
        aria-label="Conversation with Sense Coach"
        onScroll={(event) => {
          const el = event.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="hide-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5"
      >
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center py-6 text-center">
            <Scrolly mood="happy" size={compact ? 96 : 128} />
            <h3 className="mt-4 font-display text-2xl font-medium tracking-tight">Ask me about your scrolling.</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              I read your real sessions and scores, simulate what-ifs with the same model that scores you, and can act in the app for you.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submit(suggestion)}
                  className="focus-ring rounded-full border border-foreground/12 bg-foreground/[0.04] px-3.5 py-2 text-left text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/[0.09]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <m.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
              {message.role === "user" ? <UserBubble text={message.text} /> : <AssistantMessage message={message} />}
            </m.div>
          ))}
        </AnimatePresence>
      </div>

      <form
        className="border-t border-foreground/10 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <div className="flex items-end gap-2 rounded-3xl border border-foreground/12 bg-foreground/[0.04] p-2 pl-4 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-ring/20">
          <label htmlFor="coach-input" className="sr-only">
            Message Sense Coach
          </label>
          <textarea
            id="coach-input"
            value={draft}
            rows={1}
            maxLength={1500}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(draft);
              }
            }}
            placeholder="Ask anything about your scrolling…"
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm leading-5 outline-none placeholder:text-muted-foreground"
          />
          {busy ? (
            <button type="button" onClick={stop} aria-label="Stop generating" className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground/10 text-foreground">
              <Square className="h-4 w-4 fill-current" aria-hidden="true" />
            </button>
          ) : (
            <button type="submit" disabled={!draft.trim()} aria-label="Send message" className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full bg-metal text-[hsl(300_50%_9%)] transition-[transform,opacity] active:scale-90 disabled:opacity-40">
              <ArrowUp className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="mt-2 px-2 text-center text-[0.6875rem] text-muted-foreground">
          Not medical advice. Answers use only the data stored in this browser.
        </p>
      </form>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary/[0.16] px-4 py-2.5 text-sm leading-6 text-foreground">{text}</div>
    </div>
  );
}

function AssistantMessage({ message }: { message: ChatMessage }) {
  const undoAction = useCoachStore((state) => state.undoAction);
  const waiting = message.streaming && !message.text && message.steps.length === 0;

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 hidden h-8 w-8 shrink-0 place-items-center rounded-xl bg-foreground/[0.06] sm:grid">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {message.notice ? <p className="rounded-xl bg-[hsl(38_92%_62%/0.12)] px-3 py-2 text-xs text-[hsl(38_92%_70%)]">{message.notice}</p> : null}

        {message.steps.length ? (
          <ul className="space-y-1.5" aria-label="Agent steps">
            {message.steps.map((step) => (
              <li key={step.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                {step.status === "running" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
                ) : step.status === "error" ? (
                  <CircleAlert className="h-3.5 w-3.5 text-[hsl(350_90%_70%)]" aria-hidden="true" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-[hsl(160_60%_58%)]" aria-hidden="true" />
                )}
                <span className="text-foreground/85">{toolLabels[step.name] ?? step.name}</span>
                {step.summary ? <span className="min-w-0 truncate">· {step.summary}</span> : null}
                {step.ms !== undefined ? <span className="ml-auto shrink-0 tabular-nums">{step.ms} ms</span> : null}
              </li>
            ))}
          </ul>
        ) : null}

        {message.cards.map((card, index) => (
          <CoachCardView key={index} card={card} />
        ))}

        {waiting ? (
          <div className="flex items-center gap-1.5 py-2" role="status" aria-label="Sense Coach is thinking">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${dot * 120}ms` }} />
            ))}
          </div>
        ) : null}

        {message.text ? (
          <div className="text-sm leading-6 text-foreground/95">
            <Markdown text={message.text} />
            {message.streaming ? <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-primary" aria-hidden="true" /> : null}
          </div>
        ) : null}

        {message.actions.length ? (
          <div className="flex flex-wrap gap-2">
            {message.actions.map((chip) => (
              <span
                key={chip.id}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border py-1.5 pl-3 pr-1.5 text-xs",
                  chip.undone ? "border-foreground/10 text-muted-foreground line-through" : "border-primary/35 bg-primary/[0.1] text-foreground"
                )}
              >
                <Wand2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {chip.label}
                {chip.undo && !chip.undone ? (
                  <button type="button" onClick={() => undoAction(message.id, chip.id)} className="focus-ring inline-flex h-7 items-center gap-1 rounded-full bg-foreground/10 px-2.5 text-[0.6875rem] font-medium hover:bg-foreground/15">
                    <Undo2 className="h-3 w-3" aria-hidden="true" />
                    Undo
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}

        {message.error ? (
          <p role="alert" className="rounded-xl bg-[hsl(350_90%_64%/0.12)] px-3 py-2 text-xs text-[hsl(350_100%_82%)]">
            {message.error}
          </p>
        ) : null}

        {message.thinking ? (
          <details className="group text-xs text-muted-foreground">
            <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1 rounded-md py-1 hover:text-foreground">
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
              Reasoning summary
            </summary>
            <p className="mt-1 whitespace-pre-wrap rounded-xl bg-foreground/[0.04] p-3 leading-5">{message.thinking}</p>
          </details>
        ) : null}

        {message.meta ? (
          <details className="group text-xs text-muted-foreground">
            <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1 rounded-md py-1 hover:text-foreground">
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              Agent trace · {message.source === "ai" ? "Claude" : "offline"} · {message.meta.iterations} step{message.meta.iterations === 1 ? "" : "s"} · {(message.meta.ms / 1000).toFixed(1)}s
            </summary>
            <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-foreground/[0.04] p-3 tabular-nums sm:grid-cols-3">
              <Trace label="Model" value={message.meta.model} />
              <Trace label="Tool calls" value={String(message.steps.length)} />
              <Trace label="Stop reason" value={message.meta.stopReason} />
              <Trace label="Input tokens" value={String(message.meta.inputTokens)} />
              <Trace label="Output tokens" value={String(message.meta.outputTokens)} />
              <Trace label="Cache reads" value={String(message.meta.cacheReadTokens)} />
            </dl>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function Trace({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.625rem] uppercase tracking-[0.12em]">{label}</dt>
      <dd className="truncate text-foreground/90">{value}</dd>
    </div>
  );
}
