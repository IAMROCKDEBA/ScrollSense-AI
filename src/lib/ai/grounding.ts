/**
 * Numeric grounding guard: every number the model writes in a user-facing claim must be traceable to the
 * data it was given. It catches the most damaging hallucination in an analytics assistant (invented figures).
 */

const NUMBER_PATTERN = /-?\d+(?:\.\d+)?/g;

export function extractNumbers(text: string): number[] {
  return (text.match(NUMBER_PATTERN) ?? []).map(Number).filter((value) => Number.isFinite(value));
}

function decimalsOf(token: string) {
  const dot = token.indexOf(".");
  return dot === -1 ? 0 : token.length - dot - 1;
}

/**
 * A written number matches a source number when it is the source rounded to the precision it was written with
 * (3 or 3.2 for 3.24), as a percentage of a 0-1 fraction (45 for 0.45), or minutes of a seconds value (25 for 1500).
 */
function matches(token: string, sources: number[]) {
  const value = Number(token);
  const tolerance = 0.5 * 10 ** -decimalsOf(token) + 1e-9;
  return sources.some(
    (source) =>
      Math.abs(value - source) <= tolerance ||
      (source >= 0 && source <= 1 && Math.abs(value - source * 100) <= tolerance) ||
      Math.abs(value - source / 60) <= tolerance ||
      Math.abs(value - source * 60) <= tolerance
  );
}

export interface GroundingResult {
  grounded: boolean;
  ungrounded: number[];
}

export function checkGrounding(text: string, source: unknown, ignoreSmall = true): GroundingResult {
  const sourceNumbers = extractNumbers(typeof source === "string" ? source : JSON.stringify(source));
  const ungrounded: number[] = [];
  for (const token of text.match(NUMBER_PATTERN) ?? []) {
    const value = Number(token);
    // Ordinals and counts like "1st", "2 patterns" or "3 reels" are rhetoric, not claims about the data.
    if (ignoreSmall && Number.isInteger(value) && value >= 0 && value <= 3) continue;
    if (!matches(token, sourceNumbers)) ungrounded.push(value);
  }
  return { grounded: ungrounded.length === 0, ungrounded };
}
