#!/usr/bin/env node
/**
 * Snapshot a verified pool of YouTube Shorts into src/data/shorts-seed.json.
 * The seed is the offline / quota-exhausted fallback for the Reels feed, so a demo never dead-ends.
 * Uses ~100 quota units per topic. Reads YOUTUBE_API_KEY from the environment or .env.local.
 * Run: npm run seed:shorts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function loadKey() {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY;
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return "";
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("YOUTUBE_API_KEY="));
  return line ? line.slice("YOUTUBE_API_KEY=".length).trim().replace(/^["']|["']$/g, "") : "";
}

const topics = [
  "study motivation",
  "science facts",
  "funny moments",
  "productivity tips",
  "tech explained",
  "satisfying",
  "mind blowing facts",
  "calm nature",
  "learn something new",
  "student life"
];

function parseDuration(value = "") {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value);
  if (!m) return NaN;
  return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
}

async function yt(path, params, key) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("key", key);
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`YouTube ${path} responded ${response.status}`);
  return response.json();
}

async function isRealShort(id) {
  try {
    const response = await fetch(`https://www.youtube.com/shorts/${id}`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(4000)
    });
    if (response.status === 200) return true;
    if (response.status >= 300 && response.status < 400) return false;
    return null;
  } catch {
    return null;
  }
}

const key = loadKey();
if (!key) {
  console.error("No YOUTUBE_API_KEY found (env or .env.local). Seed not updated.");
  process.exit(1);
}

const seen = new Set();
const videos = [];

for (const topic of topics) {
  try {
    const found = await yt(
      "search",
      {
        part: "snippet",
        type: "video",
        videoDuration: "short",
        videoEmbeddable: "true",
        safeSearch: "moderate",
        maxResults: "30",
        relevanceLanguage: "en",
        q: `${topic} #shorts`
      },
      key
    );
    const ids = (found.items ?? []).map((item) => item.id?.videoId).filter(Boolean);
    if (!ids.length) continue;
    const details = await yt("videos", { part: "snippet,status,contentDetails", id: ids.join(",") }, key);
    const playable = (details.items ?? []).filter((item) => {
      const duration = parseDuration(item.contentDetails?.duration);
      const blocked = item.contentDetails?.regionRestriction?.blocked ?? [];
      const allowed = item.contentDetails?.regionRestriction?.allowed;
      return (
        duration >= 3 &&
        duration <= 60 &&
        item.status?.embeddable === true &&
        item.status?.privacyStatus === "public" &&
        item.status?.uploadStatus === "processed" &&
        !blocked.includes("IN") &&
        (!allowed || allowed.includes("IN"))
      );
    });
    const checks = await Promise.all(playable.map((item) => isRealShort(item.id)));
    const anyConfirmed = checks.some((value) => value === true);
    let added = 0;
    playable.forEach((item, index) => {
      if (anyConfirmed && checks[index] !== true) return;
      if (seen.has(item.id) || added >= 6) return;
      seen.add(item.id);
      added += 1;
      videos.push({
        id: item.id,
        title: item.snippet?.title ?? "Untitled short",
        channelTitle: item.snippet?.channelTitle ?? "Unknown channel",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ?? `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        durationSec: parseDuration(item.contentDetails?.duration),
        topic: topic
      });
    });
    console.log(`${topic}: +${added}`);
  } catch (error) {
    console.error(`${topic}: ${error.message}`);
    if (/403|429/.test(error.message)) break;
  }
}

if (videos.length < 12) {
  console.error(`Only ${videos.length} verified Shorts found; leaving the existing seed untouched.`);
  process.exit(1);
}

writeFileSync(resolve(root, "src/data/shorts-seed.json"), JSON.stringify(videos, null, 2) + "\n");
console.log(`Wrote ${videos.length} Shorts to src/data/shorts-seed.json`);
