/** Default topic rotation for the Shorts pool when the user has not stated an intent. */
export const defaultTopics = [
  "study motivation",
  "science facts",
  "funny moments",
  "productivity tips",
  "tech explained",
  "student life",
  "satisfying",
  "mind blowing facts"
] as const;

export function sanitizeQuery(raw: string) {
  return raw
    .replace(/[^\p{L}\p{N}\s#'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function parseQueries(raw: string | null, max = 4): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split("|")) {
    const query = sanitizeQuery(part);
    const key = query.toLowerCase();
    if (!query || seen.has(key)) continue;
    seen.add(key);
    out.push(query);
    if (out.length >= max) break;
  }
  return out;
}

export function parseExcludeIds(raw: string | null, max = 300): Set<string> {
  const ids = new Set<string>();
  if (!raw) return ids;
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(id)) ids.add(id);
    if (ids.size >= max) break;
  }
  return ids;
}

export function pickTopics(count: number, random: () => number = Math.random): string[] {
  const pool = [...defaultTopics];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
