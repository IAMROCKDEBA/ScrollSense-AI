"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ChevronDown, ChevronUp, Heart, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { VideoItem, ViewEvent } from "@/types";
import { cn } from "@/lib/utils";
import { ReelTracker } from "@/lib/telemetry/session-recorder";
import { ReelPlayer } from "./reel-player";

export interface ReelsFeedHandle {
  /** Close the reel currently on screen and return its telemetry (used when a session ends). */
  flush: () => ViewEvent | null;
  next: () => void;
  prev: () => void;
}

export interface ReelsFeedProps {
  videos: VideoItem[];
  /** External pause (guardian sheet, breathing break, hidden tab). */
  paused: boolean;
  soundOn: boolean;
  onSoundChange: (soundOn: boolean) => void;
  onViewStart: (index: number, video: VideoItem) => void;
  onViewComplete: (view: ViewEvent) => void;
  onNeedMore: () => void;
  onVideoError: (video: VideoItem) => void;
  className?: string;
  ref?: Ref<ReelsFeedHandle>;
}

const PLAYER_RADIUS = 1;
const RENDER_RADIUS = 2;
const NEED_MORE_AHEAD = 5;
const DOUBLE_TAP_MS = 260;
const HOLD_MS = 320;

interface Heart {
  id: number;
  x: number;
  y: number;
}

export function ReelsFeed({
  videos,
  paused,
  soundOn,
  onSoundChange,
  onViewStart,
  onViewComplete,
  onNeedMore,
  onVideoError,
  className,
  ref
}: ReelsFeedProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef(new ReelTracker());
  const [active, setActive] = useState(0);
  const [pausedIndex, setPausedIndex] = useState<number | null>(null);
  const [holding, setHolding] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(() => new Set());
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const progressRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const heartId = useRef(0);

  const latest = useRef({ videos, soundOn, active, onViewStart, onViewComplete, onNeedMore, onVideoError, onSoundChange });
  useEffect(() => {
    latest.current = { videos, soundOn, active, onViewStart, onViewComplete, onNeedMore, onVideoError, onSoundChange };
  });

  // ---- scrolling helpers -------------------------------------------------------------------
  const goTo = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const clamped = Math.max(0, Math.min(latest.current.videos.length - 1, index));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({ top: clamped * scroller.clientHeight, behavior: reduced ? "auto" : "smooth" });
  }, []);

  const step = useCallback((dir: 1 | -1) => goTo(latest.current.active + dir), [goTo]);

  const toggleLike = useCallback((videoId: string | undefined, forceOn = false) => {
    if (!videoId) return;
    setLiked((current) => {
      const next = new Set(current);
      const on = forceOn ? true : !next.has(videoId);
      if (on) next.add(videoId);
      else next.delete(videoId);
      if (latest.current.videos[latest.current.active]?.id === videoId) trackerRef.current.setLiked(on);
      return next;
    });
  }, []);

  const togglePause = useCallback(() => {
    setPausedIndex((current) => (current === latest.current.active ? null : latest.current.active));
  }, []);

  // Track which reel is on screen from the scroll offset (rAF-throttled, no layout reads per frame).
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next = Math.round(scroller.scrollTop / Math.max(1, scroller.clientHeight));
        setActive((current) => (current === next ? current : next));
      });
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // One reel per wheel gesture (native snap alone can skip several on a fast wheel / trackpad).
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let lockUntil = 0;
    let accumulated = 0;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      const now = performance.now();
      if (now < lockUntil) return;
      accumulated += event.deltaY;
      if (Math.abs(accumulated) < 32) return;
      step(accumulated > 0 ? 1 : -1);
      accumulated = 0;
      lockUntil = now + 720;
    };
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
  }, [step]);

  // Keyboard: arrows / J K move, space pauses, M mutes, L likes.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      switch (event.key) {
        case "ArrowDown":
        case "j":
          event.preventDefault();
          step(1);
          break;
        case "ArrowUp":
        case "k":
          event.preventDefault();
          step(-1);
          break;
        case " ":
          if (target?.tagName === "BUTTON") return;
          event.preventDefault();
          togglePause();
          break;
        case "m":
          latest.current.onSoundChange(!latest.current.soundOn);
          break;
        case "l":
          toggleLike(latest.current.videos[latest.current.active]?.id, true);
          break;
        default:
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, toggleLike, togglePause]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ---- telemetry: close the previous reel, open the new one --------------------------------
  useEffect(() => {
    const tracker = trackerRef.current;
    const now = Date.now();
    const closed = tracker.end(now);
    if (closed) latest.current.onViewComplete(closed);
    const video = latest.current.videos[active];
    if (!video) return;
    tracker.begin(video, active, now, latest.current.soundOn);
    latest.current.onViewStart(active, video);
    if (active >= latest.current.videos.length - NEED_MORE_AHEAD) latest.current.onNeedMore();
  }, [active]);

  useEffect(() => {
    trackerRef.current.setSound(soundOn);
  }, [soundOn]);

  useImperativeHandle(
    ref,
    () => ({
      flush: () => trackerRef.current.end(Date.now()),
      next: () => step(1),
      prev: () => step(-1)
    }),
    [step]
  );

  // Close the running reel if the feed unmounts mid-session.
  useEffect(() => {
    const tracker = trackerRef.current;
    return () => {
      const closed = tracker.end(Date.now());
      if (closed) latest.current.onViewComplete(closed);
    };
  }, []);

  const userPaused = pausedIndex === active;
  const effectivePaused = paused || userPaused || holding || hidden;

  // Paused time (sheet, break, tap-to-pause, hidden tab) must not count as attention.
  useEffect(() => {
    trackerRef.current.setSuspended(effectivePaused, Date.now());
  }, [effectivePaused, active]);

  const burst = useCallback((x: number, y: number) => {
    heartId.current += 1;
    const id = heartId.current;
    setHearts((current) => [...current.slice(-4), { id, x, y }]);
  }, []);

  const handleError = useCallback(
    (video: VideoItem, index: number) => {
      setFailed((current) => new Set(current).add(video.id));
      latest.current.onVideoError(video);
      if (index === latest.current.active) window.setTimeout(() => goTo(index + 1), 700);
    },
    [goTo]
  );

  const current = videos[active];
  const announce = current ? `${current.title}, video ${active + 1}` : "";

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-black", className)}>
      <div
        ref={scrollerRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Short video feed. Scroll or use the arrow keys for the next video."
        className="hide-scrollbar h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain scroll-smooth [scroll-snap-type:y_mandatory] motion-reduce:scroll-auto"
      >
        {videos.map((video, index) => {
          const distance = Math.abs(index - active);
          const render = distance <= RENDER_RADIUS;
          const withPlayer = distance <= PLAYER_RADIUS && !failed.has(video.id);
          const isActive = index === active;
          return (
            <section
              key={video.id}
              aria-label={`Video ${index + 1} of ${videos.length}`}
              className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black"
            >
              {render ? (
                <Slide
                  video={video}
                  index={index}
                  isActive={isActive}
                  withPlayer={withPlayer}
                  failed={failed.has(video.id)}
                  paused={effectivePaused}
                  muted={!soundOn}
                  liked={liked.has(video.id)}
                  userPaused={isActive && (userPaused || holding)}
                  soundOn={soundOn}
                  progressRefs={progressRefs}
                  onPlayingChange={(playing) => {
                    if (index === latest.current.active) trackerRef.current.setPlaying(playing, Date.now());
                  }}
                  onLoop={() => {
                    if (index === latest.current.active) trackerRef.current.addLoop();
                  }}
                  onDuration={(seconds) => {
                    if (index === latest.current.active) trackerRef.current.setDuration(seconds);
                  }}
                  onError={() => handleError(video, index)}
                  onToggleLike={() => toggleLike(video.id)}
                  onToggleSound={() => latest.current.onSoundChange(!latest.current.soundOn)}
                  onTogglePause={togglePause}
                  onHold={setHolding}
                  onDoubleTap={(x, y) => {
                    toggleLike(video.id, true);
                    burst(x, y);
                  }}
                  onNext={() => step(1)}
                  onPrev={() => step(-1)}
                  canPrev={index > 0}
                  canNext={index < videos.length - 1}
                />
              ) : null}
            </section>
          );
        })}
      </div>

      <AnimatePresence>
        {hearts.map((heart) => (
          <m.div
            key={heart.id}
            aria-hidden="true"
            className="pointer-events-none absolute z-30 text-white drop-shadow-[0_6px_18px_hsl(350_90%_55%/0.7)]"
            style={{ left: heart.x - 44, top: heart.y - 44 }}
            initial={{ opacity: 0, scale: 0.4, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.25, 1, 1.1], y: [0, 0, -12, -48] }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            onAnimationComplete={() => setHearts((all) => all.filter((item) => item.id !== heart.id))}
          >
            <Heart className="h-[88px] w-[88px] fill-[hsl(350_90%_58%)] text-[hsl(350_90%_58%)]" />
          </m.div>
        ))}
      </AnimatePresence>

      <div className="sr-only" aria-live="polite" role="status">
        {announce}
      </div>
      {current ? null : (
        <div className="absolute inset-0 grid place-items-center text-sm text-white/70">No videos available.</div>
      )}
    </div>
  );
}

interface SlideProps {
  video: VideoItem;
  index: number;
  isActive: boolean;
  withPlayer: boolean;
  failed: boolean;
  paused: boolean;
  muted: boolean;
  liked: boolean;
  userPaused: boolean;
  soundOn: boolean;
  progressRefs: React.RefObject<Map<number, HTMLDivElement>>;
  onPlayingChange: (playing: boolean) => void;
  onLoop: () => void;
  onDuration: (seconds: number) => void;
  onError: () => void;
  onToggleLike: () => void;
  onToggleSound: () => void;
  onTogglePause: () => void;
  onHold: (holding: boolean) => void;
  onDoubleTap: (x: number, y: number) => void;
  onNext: () => void;
  onPrev: () => void;
  canPrev: boolean;
  canNext: boolean;
}

function Slide(props: SlideProps) {
  const { video, index, isActive, withPlayer, failed, liked, userPaused, soundOn, progressRefs } = props;
  const lastTap = useRef(0);
  const tapTimer = useRef<number | undefined>(undefined);
  const holdTimer = useRef<number | undefined>(undefined);
  const holdActive = useRef(false);
  const downAt = useRef({ x: 0, y: 0, t: 0 });

  useEffect(
    () => () => {
      window.clearTimeout(tapTimer.current);
      window.clearTimeout(holdTimer.current);
    },
    []
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    downAt.current = { x: event.clientX, y: event.clientY, t: performance.now() };
    holdActive.current = false;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      holdActive.current = true;
      props.onHold(true);
    }, HOLD_MS);
  };

  const endHold = () => {
    window.clearTimeout(holdTimer.current);
    if (holdActive.current) props.onHold(false);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const wasHold = holdActive.current;
    endHold();
    if (wasHold) return;
    const moved = Math.hypot(event.clientX - downAt.current.x, event.clientY - downAt.current.y);
    if (moved > 12) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const now = performance.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      window.clearTimeout(tapTimer.current);
      lastTap.current = 0;
      props.onDoubleTap(x, y);
      return;
    }
    lastTap.current = now;
    tapTimer.current = window.setTimeout(() => {
      // First tap on a muted feed unmutes (browsers only allow sound after a gesture); later taps pause.
      if (!soundOn) props.onToggleSound();
      else props.onTogglePause();
    }, DOUBLE_TAP_MS);
  };

  return (
    <>
      {withPlayer ? (
        <ReelPlayer
          videoId={video.id}
          thumbnail={video.thumbnail}
          active={isActive}
          paused={props.paused}
          muted={props.muted}
          onPlayingChange={props.onPlayingChange}
          onLoop={props.onLoop}
          onError={props.onError}
          onDuration={props.onDuration}
          onProgress={(ratio) => {
            const bar = progressRefs.current.get(index);
            if (bar) bar.style.transform = `scaleX(${ratio})`;
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- remote YouTube poster
        <img src={video.thumbnail} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70" />
      )}

      {failed ? (
        <div className="absolute inset-0 grid place-items-center bg-black/80 px-8 text-center text-sm text-white/80" role="status">
          This video is not available to embed. Skipping to the next one…
        </div>
      ) : null}

      {/* Readability gradient (static, compositor-friendly) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/90 via-black/55 to-transparent" aria-hidden="true" />

      {/* Gesture layer: transparent, keeps native vertical scroll (touch-action: pan-y) */}
      {isActive ? (
        <div
          className="absolute inset-0 z-10 cursor-pointer touch-pan-y select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={endHold}
          onPointerLeave={endHold}
          onContextMenu={(event) => event.preventDefault()}
        />
      ) : null}

      {isActive && userPaused ? (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center" aria-hidden="true">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-black/45 backdrop-blur-md">
            <Play className="h-9 w-9 translate-x-0.5 fill-white text-white" />
          </span>
        </div>
      ) : null}

      {isActive && !soundOn ? (
        <button
          type="button"
          onClick={props.onToggleSound}
          className="focus-ring absolute left-1/2 top-16 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/55 px-4 py-2 text-xs font-medium text-white backdrop-blur-md"
        >
          <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
          Tap for sound
        </button>
      ) : null}

      {/* Caption */}
      <div className="pointer-events-none absolute bottom-6 left-4 right-20 z-20 text-white">
        {video.topic ? (
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.14em] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--metal-1)]" aria-hidden="true" />
            {video.topic}
          </span>
        ) : null}
        <p className="line-clamp-2 text-[0.95rem] font-semibold leading-snug drop-shadow">{video.title}</p>
        <p className="mt-1 truncate text-xs text-white/75">{video.channelTitle}</p>
      </div>

      {/* Action rail */}
      {isActive ? (
        <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-3 text-white">
          <RailButton label={liked ? "Unlike" : "Like"} pressed={liked} onClick={props.onToggleLike}>
            <Heart className={cn("h-6 w-6 transition-transform", liked && "scale-110 fill-[hsl(350_90%_58%)] text-[hsl(350_90%_58%)]")} />
          </RailButton>
          <RailButton label={soundOn ? "Mute" : "Unmute"} pressed={soundOn} onClick={props.onToggleSound}>
            {soundOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </RailButton>
          <RailButton label={userPaused ? "Play" : "Pause"} pressed={userPaused} onClick={props.onTogglePause}>
            {userPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
          </RailButton>
          <div className="hidden flex-col gap-3 sm:flex">
            <RailButton label="Previous video" onClick={props.onPrev} disabled={!props.canPrev}>
              <ChevronUp className="h-6 w-6" />
            </RailButton>
            <RailButton label="Next video" onClick={props.onNext} disabled={!props.canNext}>
              <ChevronDown className="h-6 w-6" />
            </RailButton>
          </div>
        </div>
      ) : null}

      {/* Progress bar (transform-only, updated imperatively) */}
      <div className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/15" aria-hidden="true">
        <div
          ref={(node) => {
            if (!progressRefs.current) return;
            if (node) progressRefs.current.set(index, node);
            else progressRefs.current.delete(index);
          }}
          className="h-full w-full origin-left scale-x-0 bg-white/90"
        />
      </div>
    </>
  );
}

function RailButton({
  label,
  pressed,
  onClick,
  disabled,
  children
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="focus-ring grid h-12 w-12 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md transition-[transform,background-color] duration-150 hover:bg-black/55 active:scale-90 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
