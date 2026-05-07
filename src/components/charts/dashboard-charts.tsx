"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
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

export function BehaviorCharts({
  barData,
  radarData
}: {
  barData: ScorePoint[];
  radarData: RadarPoint[];
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Cognitive Performance and Behavior</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis domain={[0, 100]} stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #334155", borderRadius: 8 }} />
              <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Digital Well-being Radar</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(148, 163, 184, 0.28)" />
              <PolarAngleAxis dataKey="subject" stroke="#94a3b8" />
              <Radar dataKey="value" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.32} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #334155", borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </section>
  );
}

export function SessionHistoryChart({ lineData }: { lineData: SessionPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session History</CardTitle>
        <CardDescription>Duration, videos watched, and urge score over saved sessions.</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        {lineData.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #334155", borderRadius: 8 }} />
              <Line type="monotone" dataKey="duration" stroke="#38bdf8" strokeWidth={2} />
              <Line type="monotone" dataKey="videos" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="urge" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="grid h-full place-items-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
      <div>
        <p>No saved video sessions yet.</p>
        <Button asChild variant="outline" className="mt-3">
          <Link href="/feed">Start a session</Link>
        </Button>
      </div>
    </div>
  );
}
