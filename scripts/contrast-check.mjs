// WCAG 2.2 contrast gate for the ScrollSense design tokens.
// Usage: node scripts/contrast-check.mjs   (exits 1 if a required pair fails)
import fs from "node:fs";

const css = fs.readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Missing ${selector} block`);
  return css.slice(start, css.indexOf("\n}", start));
}

function tokens(selector) {
  const map = {};
  for (const m of block(selector).matchAll(/--([\w-]+):\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%;/g)) {
    map[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return map;
}

function hslToRgb([h, s, l]) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum ratio, note]
const text = 4.5;
const ui = 3;
const pairs = [
  ["foreground", "background", text],
  ["foreground", "card", text],
  ["card-foreground", "card-2", text],
  ["muted-foreground", "background", text],
  ["muted-foreground", "card", text],
  ["muted-foreground", "muted", text],
  ["primary-foreground", "primary", text],
  ["secondary-foreground", "secondary", text],
  ["accent-foreground", "accent", text],
  ["destructive-foreground", "destructive", text],
  ["primary", "background", text],
  ["primary", "card", text],
  ["secondary", "background", ui],
  ["success-foreground", "background", text],
  ["success-foreground", "card", text],
  ["warning-foreground", "background", text],
  ["warning-foreground", "card", text],
  ["danger-foreground", "background", text],
  ["danger-foreground", "card", text],
  ["ring", "background", ui],
  ["input", "background", ui],
  ["input", "card", ui]
];

let failed = 0;

for (const [name, selector, metal] of [
  ["Light  (Ivory Porcelain)", ":root", { text: "#f1e6dc", fill: ["#7a2c72", "#5b1f57", "#431540"] }],
  ["Dark   (Aubergine Noir)", ".dark", { text: "#2a0f20", fill: ["#f4d3c2", "#e0a290", "#b76e79"] }]
]) {
  const t = tokens(selector);
  console.log(`\n${name}`);
  for (const [fg, bg, min] of pairs) {
    if (!t[fg] || !t[bg]) continue;
    const r = ratio(hslToRgb(t[fg]), hslToRgb(t[bg]));
    const ok = r >= min;
    if (!ok) failed += 1;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${fg.padEnd(24)} on ${bg.padEnd(12)} ${r.toFixed(2)}:1  (min ${min})`);
  }
  for (const fill of metal.fill) {
    const r = ratio(hexToRgb(metal.text), hexToRgb(fill));
    const ok = r >= text;
    if (!ok) failed += 1;
    console.log(`  ${ok ? "PASS" : "FAIL"}  metal button text on ${fill}  ${r.toFixed(2)}:1  (min ${text})`);
  }
}

console.log(failed ? `\n${failed} pair(s) below WCAG AA` : "\nAll pairs meet WCAG AA");
process.exit(failed ? 1 : 0);
