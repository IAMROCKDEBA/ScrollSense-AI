"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "framer-motion";
import { Flag, Keyboard, ShieldCheck, Target, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scrolly } from "@/components/ui/scrolly";
import { AttentionPulse, PulsePill } from "@/components/feed/attention-pulse";
import { AutopsyPanel } from "@/components/feed/autopsy-panel";
import { GuardianSheet } from "@/components/feed/guardian-sheet";
import { IntentStudio } from "@/components/feed/intent-studio";
import { ReelsFeed, type ReelsFeedHandle } from "@/components/feed/reels-feed";
import { SessionWrapUp } from "@/components/feed/session-wrap-up";
import { useAiStatus } from "@/hooks/use-ai-status";
import { useGuardian } from "@/hooks/use-guardian";
import { useLiveSession } from "@/hooks/use-live-session";
import { useShortsQueue } from "@/hooks/use-shorts-queue";
import { planIntent } from "@/lib/ai/browser";
import { clearPendingIntent, parsePendingIntent, readPendingRaw } from "@/lib/pending-intent";
import { predictRisk } from "@/lib/risk-engine";
import { buildRiskInput } from "@/lib/risk-input";
import { cn, createId, formatDuration } from "@/lib/utils";
import { spring } from "@/lib/motion";
import type { SessionConfig, PostSessionAnswers } from "@/lib/telemetry/build-session";
import { useAppStore } from "@/store/app-store";
import type { VideoItem, VideoSession, ViewEvent } from "@/types";

export default function FeedPage() {
  const profile = useAppStore((state) => state.profile);
  const demoMode = useAppStore((state) => state.demoMode);
  const addSession = useAppStore((state) => state.addSession);
  const addMoodLog = useAppStore((state) => state.addMoodLog);
  const dailyLimit = useAppStore((state) => state.dailyLimitMinutes);
  const setDailyLimit = useAppStore((state) => state.setDailyLimit);
  const patchSession = useAppStore((state) => state.patchSession);
  const storedSessions = useAppStore((state) => state.sessions);
  const storedMoodLogs = useAppStore((state) => state.moodLogs);
  const cognitiveResult = useAppStore((state) => state.cognitiveResult);
  const ai = useAiStatus();
  const pendingRaw = useSyncExternalStore(subscribeNoop, readPendingRaw, serverNull);
  const pending = parsePendingIntent(pendingRaw);

  const queue = useShortsQueue(demoMode);
  const session = useLiveSession(addSession);
  const feedRef = useRef<ReelsFeedHandle>(null);
  const failedIds = useRef<Set<string>>(new Set());
  const activeIndex = useRef(0);

  const [soundOn, setSoundOn] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [statusLabel, setStatusLabel] = useState("");
  const [startError, setStartError] = useState("");
  const [saved, setSaved] = useState(false);
  const [finalSession, setFinalSession] = useState<VideoSession | null>(null);
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<number | undefined>(undefined);

  const flash = useCallback((text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 3800);
  }, []);

  // Warm the default pool so "Start" is instant when the user does not give an intent.
  const prefetched = useRef(false);
  useEffect(() => {
    if (prefetched.current) return;
    prefetched.current = true;
    void queue.prime([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const startSession = useCallback(
    async (input: Omit<SessionConfig, "queries" | "mantra">) => {
      setPlanning(true);
      setStartError("");
      setStatusLabel(ai?.live ? "Claude is planning your feed…" : "Planning your feed…");
      try {
        const plan = await planIntent({
          goal: input.goal ?? "",
          plannedMinutes: input.plannedMinutes,
          moodBefore: input.moodBefore,
          reason: input.reason,
          name: profile?.name,
          hour: new Date().getHours()
        });
        setStatusLabel("Curating Shorts…");
        const ok = await queue.prime(plan.queries);
        if (!ok) {
          setStartError("No videos could be loaded. Check your connection or switch on offline demo mode in Settings.");
          return;
        }
        failedIds.current = new Set();
        activeIndex.current = 0;
        setSaved(false);
        clearPendingIntent();
        session.begin({
          ...input,
          plannedMinutes: plan.plannedMinutes,
          queries: plan.queries,
          mantra: plan.mantra,
          tone: plan.tone,
          guardrails: plan.guardrails
        });
      } finally {
        setPlanning(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session.begin / queue.prime are stable callbacks
    [ai?.live, profile?.name, queue.prime, session.begin]
  );

  const onViewComplete = useCallback(
    (view: ViewEvent) => {
      if (failedIds.current.has(view.videoId)) return;
      session.recordView(view);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recordView is stable
    [session.recordView]
  );

  const endSession = useCallback(() => {
    const finalView = feedRef.current?.flush() ?? null;
    session.end(finalView && !failedIds.current.has(finalView.videoId) ? finalView : null);
  }, [session]);

  const guardian = useGuardian(session, dailyLimit, profile?.name, {
    onBreak: (seconds) => session.startBreak(seconds),
    onEnd: endSession,
    onSetLimit: (minutes) => {
      setDailyLimit(minutes);
      flash(`Daily limit set to ${minutes} minutes`);
    },
    onRetune: (intent) => {
      void queue.retune([intent], activeIndex.current).then((ok) => {
        flash(ok ? `Feed retuned to "${intent}"` : "Could not find better videos, keeping your feed");
        if (ok) session.patchConfig({ queries: [intent] });
      });
    }
  });

  const saveSession = useCallback(
    (answers: PostSessionAnswers) => {
      const final = session.finalize(answers);
      if (!final) return;
      addMoodLog({
        id: createId("mood"),
        moodBefore: final.moodBefore,
        reason: final.reason,
        moodAfter: answers.moodAfter,
        urgeToContinueScore: answers.urge,
        exceededPlannedTime: final.exceededPlannedTime,
        focusAfter: answers.focusAfter,
        createdAt: new Date().toISOString()
      });
      setFinalSession(final);
      setSaved(true);
    },
    [addMoodLog, session]
  );

  // Fresh risk estimate that already includes the session that was just saved (feeds the Autopsy's score note).
  const riskAfterSave = useMemo(
    () => (saved ? predictRisk(buildRiskInput(profile, storedSessions, cognitiveResult, storedMoodLogs)) : null),
    [saved, profile, storedSessions, cognitiveResult, storedMoodLogs]
  );

  const live = session.status === "live";
  const plannedSec = (session.config?.plannedMinutes ?? 10) * 60;
  const progress = Math.min(1, session.elapsedSec / plannedSec);
  const remaining = Math.max(0, plannedSec - session.elapsedSec);
  const overPlan = session.elapsedSec >= plannedSec;

  // ---------- Live: immersive full-screen Reels ----------
  if (live) {
    // Portal to <body>: the route transition wrapper keeps a transform, which would trap `position: fixed`.
    return createPortal(
      <div className="dark fixed inset-0 z-[70] flex overflow-hidden bg-[hsl(287_39%_4%)] text-white" data-print-hide>
        {/* Ambient colour bleed from the current video */}
        {currentVideo ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 scale-125 bg-cover bg-center opacity-35 blur-3xl transition-[background-image] duration-700"
            style={{ backgroundImage: `url("${currentVideo.thumbnail}")` }}
          />
        ) : null}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(287_39%_4%/0.85)_100%)]" />

        {/* Left panel (desktop) */}
        <aside className="relative z-10 hidden w-[21rem] shrink-0 flex-col gap-6 overflow-y-auto p-6 pt-8 lg:flex">
          <div>
            <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-white/55">Session goal</div>
            <p className="mt-2 font-display text-xl font-medium leading-snug tracking-tight">
              {session.config?.goal ?? "Open scroll — no goal set"}
            </p>
            {session.config?.mantra ? <p className="mt-2 text-sm italic text-white/60">“{session.config.mantra}”</p> : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {session.config?.queries.map((query) => (
                <span key={query} className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[0.6875rem] text-white/75">
                  {query}
                </span>
              ))}
            </div>
          </div>
          <AttentionPulse reading={session.reading} views={session.views} />

          {session.config?.guardrails?.length ? (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-white/55">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Guardrails
              </div>
              <ul className="space-y-1.5 text-xs leading-5 text-white/70">
                {session.config.guardrails.map((rule) => (
                  <li key={rule} className="rounded-xl bg-white/[0.04] px-3 py-2">{rule}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {session.guardianEvents.length ? (
            <div>
              <div className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-white/55">Guardian log</div>
              <ul className="space-y-1.5 text-xs leading-5 text-white/70">
                {session.guardianEvents.map((event, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                    <span>{event.headline}</span>
                    <span className="shrink-0 text-white/45">{event.response ?? "open"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        {/* Centre: the phone-shaped Reels column */}
        <main className="relative z-10 grid min-w-0 flex-1 place-items-center">
          <div className="relative h-full w-full overflow-hidden bg-black lg:h-[min(95dvh,62rem)] lg:max-w-[calc(min(95dvh,62rem)*9/16)] lg:rounded-[2.25rem] lg:shadow-[0_40px_120px_-30px_hsl(287_60%_20%/0.9),0_0_0_1px_hsl(0_0%_100%/0.1)]">
            <ReelsFeed
              ref={feedRef}
              videos={queue.videos}
              paused={session.breakSeconds > 0 || Boolean(guardian.active)}
              soundOn={soundOn}
              onSoundChange={setSoundOn}
              onViewStart={(index, video) => {
                activeIndex.current = index;
                setCurrentVideo(video);
              }}
              onViewComplete={onViewComplete}
              onNeedMore={() => void queue.loadMore()}
              onVideoError={(video) => failedIds.current.add(video.id)}
            />

            {/* Top HUD */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
              <button
                type="button"
                onClick={endSession}
                aria-label="End session"
                className="focus-ring pointer-events-auto flex h-11 items-center gap-2 rounded-full border border-white/20 bg-black/50 pl-3 pr-4 text-xs font-medium backdrop-blur-md"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                End
              </button>
              <div className="flex items-center gap-2">
                <PulsePill reading={session.reading} className="lg:hidden" />
                <span
                  className={cn(
                    "rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-medium tabular-nums backdrop-blur-md",
                    overPlan && "text-[hsl(38_92%_66%)]"
                  )}
                  role="timer"
                  aria-label="Session time"
                >
                  {overPlan ? "Over plan · " : ""}
                  {formatDuration(overPlan ? session.elapsedSec : remaining)}
                </span>
              </div>
            </div>
            <div className="absolute inset-x-0 top-0 z-30 h-[2px] bg-white/10" aria-hidden="true">
              <div className="h-full w-full origin-left bg-metal transition-transform duration-1000 ease-linear" style={{ transform: `scaleX(${progress})` }} />
            </div>

            {/* Mindful break overlay */}
            <AnimatePresence>
              {session.breakSeconds > 0 ? (
                <m.div
                  key="break"
                  role="dialog"
                  aria-label="Mindful pause"
                  className="absolute inset-0 z-40 grid place-items-center bg-[hsl(287_39%_4%/0.92)] px-8 text-center backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex flex-col items-center">
                    <Scrolly mood="breathing" size={170} />
                    <div className="mt-2 font-display text-6xl font-medium tabular-nums">{session.breakSeconds}</div>
                    <p className="mt-3 max-w-xs text-sm text-white/75">Breathe in for four, out for six. Decide what you actually want next.</p>
                    <Button variant="outline" size="sm" className="mt-6 border-white/25 bg-white/5 text-white hover:bg-white/10" onClick={session.endBreak}>
                      I am ready to continue
                    </Button>
                  </div>
                </m.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {guardian.active ? (
                <GuardianSheet
                  key="guardian"
                  event={guardian.active.event}
                  limitMinutes={guardian.active.limitMinutes}
                  onAccept={guardian.accept}
                  onDismiss={guardian.dismiss}
                  onEnd={guardian.end}
                />
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {notice ? (
                <m.div
                  key="notice"
                  role="status"
                  className="absolute left-1/2 top-20 z-40 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-medium text-white backdrop-blur-md"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {notice}
                </m.div>
              ) : null}
            </AnimatePresence>
          </div>
        </main>

        {/* Right panel (desktop) */}
        <aside className="relative z-10 hidden w-[19rem] shrink-0 flex-col gap-5 overflow-y-auto p-6 pt-8 lg:flex">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={queue.mode === "youtube" ? "success" : "warning"} dot>
                {queue.mode === "youtube" ? "Live Shorts" : "Offline pool"}
              </Badge>
              <Badge variant={ai?.live ? "success" : "outline"} dot>
                {ai?.live ? "Guardian: Claude" : "Guardian: offline"}
              </Badge>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" aria-hidden="true" /> Time budget</span>
                <span className="tabular-nums">{Math.round(progress * 100)}%</span>
              </div>
              <div className="mt-1 font-display text-3xl font-medium tabular-nums">{formatDuration(session.elapsedSec)}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <div className="h-full w-full origin-left rounded-full bg-metal transition-transform duration-1000 ease-linear" style={{ transform: `scaleX(${progress})` }} />
              </div>
              <div className="mt-2 text-xs text-white/55">
                {overPlan ? "You are past your plan." : `${formatDuration(remaining)} left of ${session.config?.plannedMinutes} min`}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Mini label="Videos" value={String(session.views.length)} />
              <Mini label="Skips" value={String(session.views.filter((v) => v.skippedEarly).length)} />
              <Mini label="Likes" value={String(session.views.filter((v) => v.liked).length)} />
            </div>
          </div>

          <Button variant="outline" className="border-white/20 bg-white/[0.05] text-white hover:bg-white/10" onClick={() => session.startBreak(30)}>
            30-second mindful break
          </Button>
          <Button variant="destructive" onClick={endSession}>
            <Flag className="h-4 w-4" aria-hidden="true" />
            End session
          </Button>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-6 text-white/55">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-white/75"><Keyboard className="h-3.5 w-3.5" aria-hidden="true" /> Shortcuts</div>
            ↑ ↓ or J K — previous / next · Space — pause · M — sound · L — like · double-tap — like · hold — pause
          </div>
        </aside>
      </div>,
      document.body
    );
  }

  // ---------- Wrap-up ----------
  if (session.status === "ended") {
    return (
      <SessionWrapUp
        views={session.views}
        durationSeconds={session.durationSec}
        plannedMinutes={session.config?.plannedMinutes ?? 10}
        saved={saved}
        afterSave={
          finalSession ? (
            <AutopsyPanel
              key={finalSession.id}
              session={finalSession}
              risk={riskAfterSave}
              name={profile?.name}
              onResult={(autopsy) => patchSession(finalSession.id, { autopsy })}
            />
          ) : null
        }
        onSave={saveSession}
        onAnother={() => {
          session.reset();
          setSaved(false);
          setFinalSession(null);
          void queue.prime([]);
        }}
      />
    );
  }

  // ---------- Setup ----------
  return (
    <div className="space-y-6">
      <IntentStudio key={pendingRaw ?? "none"} busy={planning} statusLabel={statusLabel} aiLive={Boolean(ai?.live)} initial={pending} onStart={startSession} />
      <AnimatePresence>
        {startError ? (
          <m.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring.snappy}
            role="alert"
            className="mx-auto max-w-5xl rounded-2xl border border-[hsl(350_80%_60%/0.4)] bg-[hsl(350_80%_60%/0.08)] px-4 py-3 text-sm text-[hsl(350_100%_84%)]"
          >
            {startError}{" "}
            <Link href="/settings" className="underline underline-offset-4">Open settings</Link>
          </m.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const subscribeNoop = () => () => {};
const serverNull = () => null;

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2.5">
      <div className="font-display text-lg font-medium tabular-nums">{value}</div>
      <div className="text-[0.625rem] uppercase tracking-[0.14em] text-white/50">{label}</div>
    </div>
  );
}
