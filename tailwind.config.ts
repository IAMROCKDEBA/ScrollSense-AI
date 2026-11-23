import type { Config } from "tailwindcss";

const withAlpha = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: withAlpha("border"),
        input: withAlpha("input"),
        ring: withAlpha("ring"),
        background: withAlpha("background"),
        foreground: withAlpha("foreground"),
        primary: {
          DEFAULT: withAlpha("primary"),
          foreground: withAlpha("primary-foreground")
        },
        secondary: {
          DEFAULT: withAlpha("secondary"),
          foreground: withAlpha("secondary-foreground")
        },
        muted: {
          DEFAULT: withAlpha("muted"),
          foreground: withAlpha("muted-foreground")
        },
        accent: {
          DEFAULT: withAlpha("accent"),
          foreground: withAlpha("accent-foreground")
        },
        destructive: {
          DEFAULT: withAlpha("destructive"),
          foreground: withAlpha("destructive-foreground")
        },
        success: {
          DEFAULT: withAlpha("success"),
          foreground: withAlpha("success-foreground")
        },
        warning: {
          DEFAULT: withAlpha("warning"),
          foreground: withAlpha("warning-foreground")
        },
        danger: {
          DEFAULT: withAlpha("danger"),
          foreground: withAlpha("danger-foreground")
        },
        card: {
          DEFAULT: withAlpha("card"),
          2: withAlpha("card-2"),
          foreground: withAlpha("card-foreground")
        }
      },
      borderRadius: {
        card: "var(--radius-card)"
      },
      boxShadow: {
        surface: "var(--shadow-surface)",
        raised: "var(--shadow-raised)",
        glow: "0 0 44px hsl(var(--primary) / 0.22), 0 18px 72px hsl(var(--secondary) / 0.14)"
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        spring: "var(--ease-spring)"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "Georgia", "serif"]
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -10px, 0)" }
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.045)" }
        },
        "orbit-spin": {
          to: { transform: "rotate(360deg)" }
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.55" },
          "100%": { transform: "scale(1.5)", opacity: "0" }
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" }
        },
        blink: {
          "0%, 92%, 100%": { transform: "scaleY(1)" },
          "96%": { transform: "scaleY(0.08)" }
        },
        "dash-draw": {
          to: { strokeDashoffset: "0" }
        }
      },
      animation: {
        float: "float 7s var(--ease-in-out) infinite",
        breathe: "breathe 5.5s var(--ease-in-out) infinite",
        "orbit-spin": "orbit-spin 40s linear infinite",
        "pulse-ring": "pulse-ring 2.4s var(--ease-out) infinite",
        shimmer: "shimmer 1.8s var(--ease-in-out) infinite",
        blink: "blink 5.5s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
