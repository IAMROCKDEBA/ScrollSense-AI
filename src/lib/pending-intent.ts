/** One-shot hand-off from the Coach (or anywhere) to the Intent Studio, kept in sessionStorage. */
const KEY = "scrollsense-pending-intent";

export interface PendingIntent {
  goal: string;
  minutes: number;
}

export function savePendingIntent(intent: PendingIntent) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(intent));
  } catch {
    /* storage unavailable: the user can simply type the goal */
  }
}

/** Raw stored value (a stable string, so it is safe as a useSyncExternalStore snapshot). */
export function readPendingRaw(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parsePendingIntent(raw: string | null): PendingIntent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingIntent>;
    if (typeof parsed.goal !== "string") return null;
    return { goal: parsed.goal.slice(0, 240), minutes: Number(parsed.minutes) > 0 ? Math.min(120, Number(parsed.minutes)) : 10 };
  } catch {
    return null;
  }
}

export function clearPendingIntent() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
