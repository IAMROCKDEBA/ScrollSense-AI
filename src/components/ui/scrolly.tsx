import { useId } from "react";
import type { RiskCategory } from "@/types";
import { cn } from "@/lib/utils";

export type ScrollyMood = "idle" | "happy" | "calm" | "concerned" | "sleepy" | "breathing";

interface ScrollyProps {
  mood?: ScrollyMood;
  size?: number;
  className?: string;
  /** Provide for meaningful use; omit for decorative (aria-hidden). */
  label?: string;
}

export function scrollyForRisk(category?: RiskCategory): ScrollyMood {
  if (category === "Low") return "happy";
  if (category === "Moderate") return "idle";
  if (category === "High" || category === "Critical") return "concerned";
  return "idle";
}

const INK = "#2A0F20";
const EYE_CLOSED_HAPPY = "M62 98 Q76 84 90 98";
const EYE_CLOSED_CALM = "M62 93 Q76 106 90 93";

/**
 * "Scrolly" — the ScrollSense mascot. A rose-gold orb with a three-bar "feed" tuft.
 * Pure SVG + CSS animation (float, blink, look-around, breathing), zero JS.
 */
export function Scrolly({ mood = "idle", size = 180, className, label }: ScrollyProps) {
  const id = useId().replace(/:/g, "");
  const eyesClosed = mood === "happy" || mood === "calm" || mood === "sleepy" || mood === "breathing";
  const closedPath = mood === "happy" ? EYE_CLOSED_HAPPY : EYE_CLOSED_CALM;

  return (
    <div
      className={cn("inline-block", mood !== "breathing" && "animate-float", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className="overflow-visible"
      >
        <defs>
          <radialGradient id={`body-${id}`} cx="34%" cy="26%" r="85%">
            <stop offset="0%" style={{ stopColor: "var(--metal-1)" }} />
            <stop offset="55%" style={{ stopColor: "var(--metal-2)" }} />
            <stop offset="100%" style={{ stopColor: "var(--metal-3)" }} />
          </radialGradient>
        </defs>

        <ellipse cx="100" cy="188" rx="46" ry="6" fill="hsl(var(--foreground) / 0.14)" />

        <g className={cn(mood === "breathing" && "animate-[breathe_4s_ease-in-out_infinite] [transform-box:fill-box] origin-center")}>
          {/* feed tuft */}
          {[
            { x: 77, y: 20, h: 24, delay: "0s" },
            { x: 95, y: 10, h: 34, delay: "0.35s" },
            { x: 113, y: 20, h: 24, delay: "0.7s" }
          ].map((bar) => (
            <rect
              key={bar.x}
              x={bar.x}
              y={bar.y}
              width="10"
              height={bar.h}
              rx="5"
              fill={`url(#body-${id})`}
              className="origin-bottom animate-[tuft_2.6s_ease-in-out_infinite] [transform-box:fill-box]"
              style={{ animationDelay: bar.delay }}
            />
          ))}

          {/* body */}
          <ellipse cx="100" cy="104" rx="72" ry="70" fill={`url(#body-${id})`} />
          <ellipse cx="72" cy="66" rx="30" ry="16" fill="#fff" opacity="0.32" transform="rotate(-24 72 66)" />

          {/* cheeks */}
          <circle cx="58" cy="116" r="9" fill="hsl(350 85% 68%)" opacity={mood === "happy" ? 0.8 : 0.5} />
          <circle cx="142" cy="116" r="9" fill="hsl(350 85% 68%)" opacity={mood === "happy" ? 0.8 : 0.5} />

          {/* eyes */}
          {eyesClosed ? (
            <g fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round">
              <path d={closedPath} />
              <path d={closedPath} transform="translate(48 0)" />
            </g>
          ) : (
            <g className="animate-blink [transform-box:fill-box] origin-center">
              {[76, 124].map((cx) => (
                <g key={cx}>
                  <ellipse cx={cx} cy="98" rx="14" ry="17" fill="#FFF8F2" />
                  <g className="animate-[look_9s_ease-in-out_infinite]">
                    <circle cx={cx} cy="101" r="9" fill={INK} />
                    <circle cx={cx + 3} cy="97" r="3" fill="#fff" />
                  </g>
                </g>
              ))}
            </g>
          )}

          {/* concerned brows + sweat drop */}
          {mood === "concerned" ? (
            <g stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none">
              <path d="M62 79 L90 70" />
              <path d="M138 79 L110 70" />
              <path d="M154 70 q6 9 0 14 q-6 -5 0 -14z" fill="hsl(200 85% 75%)" stroke="none" />
            </g>
          ) : null}

          {/* mouth */}
          {mood === "happy" ? (
            <g>
              <path d="M82 124 Q100 152 118 124 Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <ellipse cx="100" cy="136" rx="8" ry="4.5" fill="#E0707F" />
            </g>
          ) : mood === "concerned" ? (
            <path d="M88 134 Q100 124 112 134" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          ) : mood === "sleepy" ? (
            <ellipse cx="100" cy="132" rx="5" ry="6.5" fill={INK} />
          ) : (
            <path d="M88 126 Q100 137 112 126" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          )}
        </g>

        {mood === "sleepy" ? (
          <g fill={INK} opacity="0.55" fontFamily="var(--font-display), serif" fontStyle="italic" fontWeight="600">
            <text x="156" y="60" fontSize="22" className="animate-float">z</text>
            <text x="172" y="38" fontSize="30" className="animate-float" style={{ animationDelay: "-2s" }}>Z</text>
          </g>
        ) : null}

        {mood === "happy" ? (
          <g fill="hsl(var(--accent))" className="animate-pulse">
            <path d="M166 52 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" />
            <path d="M30 70 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" />
          </g>
        ) : null}
      </svg>
    </div>
  );
}
