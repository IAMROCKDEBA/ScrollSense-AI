import { Brain, Database, EyeOff, LockKeyhole, PlaySquare, Shield, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclaimer } from "@/components/layout/disclaimer";

const academic = [
  ["Short-form video addiction", "Repeated short rewards can encourage automatic checking and longer sessions than intended."],
  ["Cognitive function", "Reaction speed, memory recall, and Stroop performance approximate attention and inhibitory control."],
  ["Attention", "Rapid context switching may reduce readiness for deep study sessions."],
  ["Memory", "Recall testing gives a simple indicator of short-term memory performance."],
  ["Impulse control", "Planned-vs-actual time and urge to continue are used as behavioral indicators."],
  ["Digital well-being", "Sleep, study routine, mood stability, and balanced use are combined into a well-being estimate."]
];

const privacy: Array<[string, LucideIcon]> = [
  ["No phone tracking", EyeOff],
  ["No private account access", LockKeyhole],
  ["No YouTube login", PlaySquare],
  ["No personal data selling", Shield],
  ["Local-first storage", Database],
  ["Server-side video requests", LockKeyhole]
];

export default function MethodologyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">About and Methodology</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          ScrollSense AI is designed as a transparent academic mini-project for digital well-being analysis.
        </p>
      </div>

      <Disclaimer />

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/12 text-primary">
                <Brain className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Academic relevance</CardTitle>
                <CardDescription>Concepts used by the scoring model.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {academic.map(([title, detail]) => (
              <div key={title} className="rounded-lg border bg-background/55 p-4">
                <h2 className="font-medium">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ethical and privacy design</CardTitle>
            <CardDescription>The app estimates risk without invasive tracking.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {privacy.map(([label, Icon]) => (
              <div key={label} className="rounded-lg border bg-background/55 p-4">
                <Icon className="mb-3 h-5 w-5 text-emerald-400" aria-hidden="true" />
                <div className="font-medium">{label}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Method in plain language</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 leading-7 text-muted-foreground">
          <p>
            The app first asks the student to self-report typical usage, sleep, study time, and automatic scrolling patterns.
            Then it observes only what happens inside this web app: public embedded videos watched, skips, duration, and whether the student continues after a reflective warning.
          </p>
          <p>
            Mood check-ins capture before-and-after changes. Cognitive tests capture reaction time, memory recall, and color-word inhibition performance.
            These values are normalized to 0-100 scores and combined using transparent weighted rules for academic interpretation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
