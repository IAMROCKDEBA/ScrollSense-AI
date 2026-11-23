"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { loadYouTubeApi, PlayerState, type YTPlayer } from "@/lib/youtube-iframe";

export interface ReelPlayerProps {
  videoId: string;
  thumbnail: string;
  /** This reel is the one on screen. */
  active: boolean;
  /** Overlays / tab-hidden / user pause. */
  paused: boolean;
  muted: boolean;
  onPlayingChange: (playing: boolean) => void;
  onLoop: () => void;
  onError: (code: number) => void;
  onDuration: (seconds: number) => void;
  onProgress: (ratio: number) => void;
}

/**
 * One YouTube IFrame Player bound to one reel. Neighbouring reels are mounted inactive so the
 * next video is already buffered when the user swipes (the "instant" Reels feel).
 */
export function ReelPlayer(props: ReelPlayerProps) {
  const { videoId, thumbnail, active, paused, muted } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  /** True once this player has actually played; only then is it safe to seek without auto-starting it. */
  const playedRef = useRef(false);

  // Always read the freshest props from event handlers without re-creating the player.
  const latest = useRef({ ...props });
  useEffect(() => {
    latest.current = { ...props };
  });

  useEffect(() => {
    let cancelled = false;
    let player: YTPlayer | null = null;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;
        const mount = document.createElement("div");
        hostRef.current.appendChild(mount);
        player = new YT.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              event.target.mute();
              setReady(true);
              const duration = event.target.getDuration();
              if (duration > 0) latest.current.onDuration(duration);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const state = event.data;
              if (state === PlayerState.PLAYING) {
                // Safety net: a neighbouring (or externally paused) reel must never play, or two sounds overlap.
                if (!latest.current.active || latest.current.paused) {
                  event.target.pauseVideo();
                  return;
                }
                playedRef.current = true;
                setStarted(true);
                setBuffering(false);
                latest.current.onPlayingChange(true);
                const duration = event.target.getDuration();
                if (duration > 0) latest.current.onDuration(duration);
              } else if (state === PlayerState.BUFFERING) {
                setBuffering(true);
              } else if (state === PlayerState.PAUSED) {
                latest.current.onPlayingChange(false);
              } else if (state === PlayerState.ENDED) {
                latest.current.onPlayingChange(false);
                latest.current.onLoop();
                event.target.seekTo(0, true);
                if (latest.current.active && !latest.current.paused) event.target.playVideo();
              }
            },
            onError: (event) => {
              if (!cancelled) latest.current.onError(event.data);
            }
          }
        });
      })
      .catch(() => {
        if (!cancelled) latest.current.onError(-1);
      });

    return () => {
      cancelled = true;
      playerRef.current = null;
      try {
        player?.destroy();
      } catch {
        /* player may already be gone */
      }
    };
  }, [videoId]);

  // Play / pause / rewind depending on whether this reel is the one on screen.
  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player) return;
    if (active && !paused) {
      player.playVideo();
    } else {
      player.pauseVideo();
      // seekTo() on a cued / never-started player begins playback (audibly), so only rewind players that have played.
      if (!active && playedRef.current) {
        player.seekTo(0, true);
        player.pauseVideo();
      }
    }
  }, [ready, active, paused]);

  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player) return;
    // Only the on-screen reel may ever be audible.
    if (muted || !active) player.mute();
    else player.unMute();
  }, [ready, muted, active]);

  // Cheap progress polling (writes straight to the DOM in the parent; no React re-render per tick).
  useEffect(() => {
    if (!ready || !active) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const duration = player.getDuration();
      if (duration > 0) latest.current.onProgress(Math.min(1, player.getCurrentTime() / duration));
    }, 200);
    return () => window.clearInterval(timer);
  }, [ready, active]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black" style={{ containerType: "size" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube poster, sized by CSS */}
      <img
        src={thumbnail}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={cn(
          "absolute inset-0 h-full w-full scale-110 object-cover transition-opacity duration-300",
          started ? "opacity-0" : "opacity-100"
        )}
      />
      {/* "Cover" the column like Reels: a 9:16 video in a taller phone screen is scaled up and side-cropped. */}
      <div
        ref={hostRef}
        style={{
          left: "50%",
          top: "50%",
          width: "max(100cqw, 56.25cqh)",
          height: "max(100cqh, 177.78cqw)",
          transform: "translate(-50%, -50%)"
        }}
        className={cn(
          "pointer-events-none absolute transition-opacity duration-300 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0",
          started ? "opacity-100" : "opacity-0"
        )}
      />
      {active && (buffering || !started) ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center" role="status" aria-label="Loading video">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-white/90" />
        </div>
      ) : null}
    </div>
  );
}
