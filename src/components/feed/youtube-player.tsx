"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, StepForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VideoItem } from "@/types";

type PlayerState = "loading" | "playable" | "failed";

interface YouTubePlayerInstance {
  destroy: () => void;
  mute: () => void;
  playVideo: () => void;
}

interface YouTubePlayerConstructor {
  new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: (event: { target: YouTubePlayerInstance }) => void;
        onStateChange: (event: { data: number }) => void;
        onError: () => void;
      };
    }
  ): YouTubePlayerInstance;
}

declare global {
  interface Window {
    YT?: {
      Player: YouTubePlayerConstructor;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-youtube-iframe-api]");

    window.onYouTubeIframeAPIReady = () => resolve();

    if (existingScript) return;

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.dataset.youtubeIframeApi = "true";
    script.onerror = () => reject(new Error("YouTube player failed to load"));
    document.head.appendChild(script);
  });

  return youtubeApiPromise;
}

export function YouTubePlayer({
  video,
  onFailed,
  onNext
}: {
  video: VideoItem;
  onFailed: () => void;
  onNext: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const failedRef = useRef(false);
  const onFailedRef = useRef(onFailed);
  const onNextRef = useRef(onNext);
  const [state, setState] = useState<PlayerState>("loading");

  useEffect(() => {
    onFailedRef.current = onFailed;
    onNextRef.current = onNext;
  }, [onFailed, onNext]);

  useEffect(() => {
    let cancelled = false;
    failedRef.current = false;

    const failTimer = window.setTimeout(() => {
      if (!failedRef.current) {
        failedRef.current = true;
        setState("failed");
        onFailedRef.current();
      }
    }, 8500);

    loadYouTubeApi()
      .then(() => {
        if (cancelled || !hostRef.current || !window.YT?.Player) return;

        playerRef.current?.destroy();
        hostRef.current.innerHTML = "";

        playerRef.current = new window.YT.Player(hostRef.current, {
          videoId: video.id,
          playerVars: {
            autoplay: 1,
            controls: 1,
            enablejsapi: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              if (cancelled || failedRef.current) return;
              event.target.mute();
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (cancelled || failedRef.current) return;
              if ([1, 2, 3, 5].includes(event.data)) {
                window.clearTimeout(failTimer);
                setState("playable");
              }
            },
            onError: () => {
              if (cancelled || failedRef.current) return;
              failedRef.current = true;
              window.clearTimeout(failTimer);
              setState("failed");
              onFailedRef.current();
            }
          }
        });
      })
      .catch(() => {
        if (cancelled || failedRef.current) return;
        failedRef.current = true;
        window.clearTimeout(failTimer);
        setState("failed");
        onFailedRef.current();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(failTimer);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [video.id]);

  return (
    <div className="relative h-full min-h-[64svh] w-full bg-black sm:min-h-[68svh]">
      <div
        ref={hostRef}
        className={
          state === "playable"
            ? "h-full min-h-[64svh] w-full sm:min-h-[68svh]"
            : "pointer-events-none h-full min-h-[64svh] w-full opacity-0 sm:min-h-[68svh]"
        }
      />

      {state !== "playable" ? (
        <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center text-white">
          <div className="max-w-sm">
            {state === "loading" ? (
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-sky-300" aria-hidden="true" />
            ) : (
              <AlertCircle className="mx-auto mb-4 h-10 w-10 text-amber-300" aria-hidden="true" />
            )}
            <h2 className="text-xl font-semibold">
              {state === "loading" ? "Checking playable embed..." : "This embed could not play here"}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {state === "loading"
                ? "ScrollSense AI will skip this video automatically if the embed is blocked."
                : "Use the next video instead of leaving the app."}
            </p>
            <Button className="mt-5" onClick={() => onNextRef.current()}>
              <StepForward className="h-4 w-4" aria-hidden="true" />
              Next video
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
