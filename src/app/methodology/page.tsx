import { Brain, Database, EyeOff, LockKeyhole, PlaySquare, Shield, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
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

export const metadata = {
  title: "Methodology"
};

export default function MethodologyPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="About"
        title={
          <>
            How the <em className="text-aurora pr-1 italic">method</em> works.
          </>
        }
        description="ScrollSense AI is designed as a transparent academic mini-project for digital well-being analysis."
      />

      <Disclaimer />

      <section className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/25 bg-primary/[0.1] text-primary">
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
              <div key={title} className="rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-4">
                <h2 className="font-medium">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
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
              <div key={label} className="rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-4">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl border border-success/30 bg-success/[0.12] text-success-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="font-medium">{label}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card variant="raised">
        <CardHeader>
          <CardTitle className="text-2xl">Method in plain language</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 leading-8 text-muted-foreground">
          <p>
            The app first asks the student to self-report typical usage, sleep, study time, and automatic scrolling patterns.
            Then it observes only what happens inside this web app: how long each Short is watched, how fast the student swipes, quick skips, rewatches, and whether they keep scrolling after the Live Guardian steps in.
          </p>
          <p>
            Mood check-ins capture before-and-after changes. Cognitive tests capture reaction time, memory recall, and color-word inhibition performance.
            These values are normalised to 0-100 scores and combined with transparent weighted rules; anything not measured is excluded rather than assumed. A Claude-powered agent layer (Sense Coach, Live Guardian, Intent Planner and Session Autopsy) then explains and acts on those numbers, and it is only allowed to state figures that exist in the measured data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
