"use client";

import { useEffect, useRef } from "react";
import type { VideoItem } from "@/types";

function buildEmbedUrl(videoId: string, muted: boolean) {
  const params = new URLSearchParams({
    autoplay: "1",
    enablejsapi: "1",
    playsinline: "1",
    controls: "1",
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3"
  });

  if (muted) {
    params.set("mute", "1");
  }

  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

export function YouTubePlayer({
  video,
  muted,
  playing,
  interactive
}: {
  video: VideoItem;
  muted: boolean;
  playing: boolean;
  interactive: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      sendYouTubeCommand(iframeRef.current, muted ? "mute" : "unMute");
      sendYouTubeCommand(iframeRef.current, playing ? "playVideo" : "pauseVideo");
    }, 700);

    return () => window.clearTimeout(timer);
  }, [video.id, muted, playing]);

  return (
    <div className="relative h-full min-h-[64svh] w-full overflow-hidden bg-black sm:min-h-[68svh]">
      <iframe
        ref={iframeRef}
        key={video.id}
        className={`absolute inset-0 h-full w-full border-0 ${interactive ? "" : "pointer-events-none"}`}
        src={buildEmbedUrl(video.id, muted)}
        title={video.title}
        loading="eager"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

function sendYouTubeCommand(iframe: HTMLIFrameElement | null, command: "mute" | "unMute" | "playVideo" | "pauseVideo") {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({
      event: "command",
      func: command,
      args: []
    }),
    "https://www.youtube.com"
  );
}
