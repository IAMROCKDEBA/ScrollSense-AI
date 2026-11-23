"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scrolly } from "@/components/ui/scrolly";
import { useMotionTier } from "@/hooks/use-motion-tier";

interface ScorePoint {
  name: string;
  value: number;
}

interface RadarPoint {
  subject: string;
  value: number;
}

interface SessionPoint {
  name: string;
  duration: number;
  videos: number;
  urge: number;
}

const axisTick = { fill: "hsl(var(--muted-foreground))", fontSize: 12 };
const gridStroke = "hsl(var(--foreground) / 0.1)";

const tooltipStyle = {
  background: "hsl(var(--card) / 0.96)",
  border: "1px solid hsl(var(--border))",
  borderRadius: 14,
  color: "hsl(var(--foreground))",
  boxShadow: "var(--shadow-raised)",
  fontSize: 13
} as const;

const tooltipItemStyle = { color: "hsl(var(--foreground))" } as const;
const tooltipLabelStyle = { color: "hsl(var(--muted-foreground))", marginBottom: 4 } as const;

export function BehaviorCharts({
  barData,
  radarData
}: {
  barData: ScorePoint[];
  radarData: RadarPoint[];
}) {
  const animate = useMotionTier() !== "none";
  const barSummary = barData.map((item) => `${item.name} ${item.value}`).join(", ");
  const radarSummary = radarData.map((item) => `${item.subject} ${item.value}`).join(", ");

  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Cognitive Performance and Behavior</CardTitle>
          <CardDescription>Each score on a 0–100 scale.</CardDescription>
        </CardHeader>
        <CardContent className="h-80" role="img" aria-label={`Bar chart of scores: ${barSummary}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: "var(--metal-1)" }} />
                  <stop offset="100%" style={{ stopColor: "var(--metal-3)" }} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelStyle={tooltipLabelStyle}
                cursor={{ fill: "hsl(var(--foreground) / 0.05)", radius: 8 }}
              />
              <Bar
                dataKey="value"
                fill="url(#bar-gradient)"
                radius={[10, 10, 4, 4]}
                maxBarSize={44}
                isAnimationActive={animate}
                animationDuration={900}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Digital Well-being Radar</CardTitle>
          <CardDescription>A bigger shape means a healthier balance.</CardDescription>
        </CardHeader>
        <CardContent className="h-80" role="img" aria-label={`Radar chart of well-being: ${radarSummary}`}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <defs>
                <radialGradient id="radar-gradient" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" style={{ stopColor: "hsl(var(--secondary))", stopOpacity: 0.15 }} />
                  <stop offset="100%" style={{ stopColor: "hsl(var(--secondary))", stopOpacity: 0.55 }} />
                </radialGradient>
              </defs>
              <PolarGrid stroke={gridStroke} />
              <PolarAngleAxis dataKey="subject" tick={axisTick} />
              <Radar
                dataKey="value"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                fill="url(#radar-gradient)"
                dot={{ r: 3.5, fill: "hsl(var(--secondary))", strokeWidth: 0 }}
                isAnimationActive={animate}
                animationDuration={900}
              />
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </section>
  );
}

export function SessionHistoryChart({ lineData }: { lineData: SessionPoint[] }) {
  const animate = useMotionTier() !== "none";
  const summary = lineData
    .map((item) => `${item.name}: ${item.duration} minutes, ${item.videos} videos, urge ${item.urge}`)
    .join("; ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session History</CardTitle>
        <CardDescription>Duration (min), videos watched, and urge score (1–10) over saved and in-progress sessions.</CardDescription>
      </CardHeader>
      <CardContent className="h-80" role={lineData.length ? "img" : undefined} aria-label={lineData.length ? `Line chart of sessions. ${summary}` : undefined}>
        {lineData.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="2 6" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))", paddingTop: 8 }} />
              <Line
                type="monotone"
                dataKey="duration"
                name="Duration (min)"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 6 }}
                isAnimationActive={animate}
              />
              <Line
                type="monotone"
                dataKey="videos"
                name="Videos"
                stroke="hsl(var(--success))"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--success))" }}
                activeDot={{ r: 6 }}
                isAnimationActive={animate}
              />
              <Line
                type="monotone"
                dataKey="urge"
                name="Urge (1–10)"
                stroke="hsl(var(--warning))"
                strokeWidth={2.5}
                strokeDasharray="5 4"
                dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--warning))" }}
                activeDot={{ r: 6 }}
                isAnimationActive={animate}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="grid h-full place-items-center rounded-3xl border border-dashed border-foreground/15 text-center text-sm text-muted-foreground">
      <div className="flex flex-col items-center">
        <Scrolly mood="sleepy" size={96} />
        <p className="mt-2">No video sessions yet.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/feed">Start a session</Link>
        </Button>
      </div>
    </div>
  );
}
