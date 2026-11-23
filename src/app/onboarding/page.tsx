"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Scrolly } from "@/components/ui/scrolly";
import { Select } from "@/components/ui/select";
import { Disclaimer } from "@/components/layout/disclaimer";
import { validateProfile, type ProfileDraft } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { Frequency, MainPlatform, StudentStatus, UserProfile } from "@/types";

const frequencies: Frequency[] = ["Never", "Rarely", "Sometimes", "Often", "Always"];
const statuses: StudentStatus[] = ["school", "college", "university", "other"];
const platforms: MainPlatform[] = [
  "YouTube Shorts",
  "Instagram Reels",
  "TikTok",
  "Facebook Reels",
  "Other"
];

const fieldIds: Record<keyof ProfileDraft, string> = {
  name: "profile-name",
  age: "profile-age",
  studentStatus: "profile-student-status",
  dailyUsageMinutes: "profile-daily-usage",
  mainPlatform: "profile-main-platform",
  studyHours: "profile-study-hours",
  sleepHours: "profile-sleep-hours",
  lateNightUsage: "profile-late-night",
  losesTrackOfTime: "profile-loses-track",
  unintentionalOpening: "profile-unintentional-opening"
};

const fieldOrder: Array<keyof ProfileDraft> = [
  "name",
  "age",
  "studentStatus",
  "mainPlatform",
  "dailyUsageMinutes",
  "studyHours",
  "sleepHours",
  "lateNightUsage",
  "losesTrackOfTime",
  "unintentionalOpening"
];

const emptyDraft: ProfileDraft = {
  name: "",
  age: "18",
  studentStatus: "college",
  dailyUsageMinutes: "60",
  mainPlatform: "YouTube Shorts",
  studyHours: "3",
  sleepHours: "7",
  lateNightUsage: "Sometimes",
  losesTrackOfTime: "Sometimes",
  unintentionalOpening: "Sometimes"
};

function profileToDraft(profile: UserProfile): ProfileDraft {
  return {
    name: profile.name,
    age: String(profile.age),
    studentStatus: profile.studentStatus,
    dailyUsageMinutes: String(profile.dailyUsageMinutes),
    mainPlatform: profile.mainPlatform,
    studyHours: String(profile.studyHours),
    sleepHours: String(profile.sleepHours),
    lateNightUsage: profile.lateNightUsage,
    losesTrackOfTime: profile.losesTrackOfTime,
    unintentionalOpening: profile.unintentionalOpening
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const profile = useAppStore((state) => state.profile);
  const saveProfile = useAppStore((state) => state.saveProfile);
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileDraft, string>>>({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      // The profile is loaded from localStorage after hydration, so the form mirrors it once.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(profileToDraft(profile));
    }
  }, [profile]);

  function update<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSubmitMessage("");
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function submitProfile() {
    if (isSaving) return;
    const result = validateProfile(draft);
    setErrors(result.errors);

    if (!result.valid) {
      const firstInvalidField = fieldOrder.find((field) => result.errors[field]);
      setSubmitMessage("Please fix the highlighted fields before continuing.");
      setIsSaving(false);
      if (firstInvalidField) {
        window.setTimeout(() => {
          document.getElementById(fieldIds[firstInvalidField])?.focus();
        }, 0);
      }
      return;
    }

    setIsSaving(true);
    setSubmitMessage("Saved. Opening your intent studio...");

    try {
      saveProfile({
        name: draft.name.trim(),
        age: Number(draft.age),
        studentStatus: draft.studentStatus,
        dailyUsageMinutes: Number(draft.dailyUsageMinutes),
        mainPlatform: draft.mainPlatform,
        studyHours: Number(draft.studyHours),
        sleepHours: Number(draft.sleepHours),
        lateNightUsage: draft.lateNightUsage,
        losesTrackOfTime: draft.losesTrackOfTime,
        unintentionalOpening: draft.unintentionalOpening,
        createdAt: profile?.createdAt ?? new Date().toISOString()
      });
      router.push("/feed");
    } catch {
      setSubmitMessage("Your browser blocked saving. Please allow site storage or use another browser.");
      setIsSaving(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitProfile();
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Step 1 · Onboarding"
        title={
          <>
            Tell us how you <em className="text-aurora pr-1 italic">scroll.</em>
          </>
        }
        description="Share your usual short-video habits. These values are stored only in your browser."
      />

      <Disclaimer />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_16rem]">
        <Card variant="raised">
          <CardHeader>
            <CardTitle>Student profile and behavior</CardTitle>
            <CardDescription>All fields are required for a more useful estimate.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-8" action="/mood" method="get" onSubmit={onSubmit} noValidate>
              {submitMessage ? (
                <div
                  className={cn(
                    "rounded-2xl border p-4 text-sm",
                    hasErrors
                      ? "border-danger/40 bg-danger/[0.1] text-danger-foreground"
                      : "border-success/40 bg-success/[0.1] text-success-foreground"
                  )}
                  role="alert"
                >
                  <p className="font-medium">{submitMessage}</p>
                  {hasErrors ? (
                    <ul className="mt-2 list-inside list-disc opacity-90">
                      {fieldOrder
                        .filter((field) => errors[field])
                        .map((field) => (
                          <li key={field}>{errors[field]}</li>
                        ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <Section index={1} title="About you">
                <Field label="Name" inputId={fieldIds.name} error={errors.name}>
                  <Input
                    id={fieldIds.name}
                    value={draft.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Your name"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? `${fieldIds.name}-error` : undefined}
                    autoComplete="name"
                    required
                  />
                </Field>
                <Field label="Age" inputId={fieldIds.age} error={errors.age}>
                  <Input
                    id={fieldIds.age}
                    type="number"
                    min={8}
                    max={80}
                    value={draft.age}
                    onChange={(event) => update("age", event.target.value)}
                    aria-invalid={Boolean(errors.age)}
                    aria-describedby={errors.age ? `${fieldIds.age}-error` : undefined}
                    required
                  />
                </Field>
                <Field label="Student status" inputId={fieldIds.studentStatus} error={errors.studentStatus}>
                  <Select
                    id={fieldIds.studentStatus}
                    value={draft.studentStatus}
                    onChange={(event) => update("studentStatus", event.target.value as StudentStatus)}
                    aria-invalid={Boolean(errors.studentStatus)}
                    aria-describedby={errors.studentStatus ? `${fieldIds.studentStatus}-error` : undefined}
                    required
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Main platform" inputId={fieldIds.mainPlatform} error={errors.mainPlatform}>
                  <Select
                    id={fieldIds.mainPlatform}
                    value={draft.mainPlatform}
                    onChange={(event) => update("mainPlatform", event.target.value as MainPlatform)}
                    aria-invalid={Boolean(errors.mainPlatform)}
                    aria-describedby={errors.mainPlatform ? `${fieldIds.mainPlatform}-error` : undefined}
                    required
                  >
                    {platforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </Select>
                </Field>
              </Section>

              <Section index={2} title="Your daily rhythm">
                <Field label="Daily short-form video usage in minutes" inputId={fieldIds.dailyUsageMinutes} error={errors.dailyUsageMinutes}>
                  <Input
                    id={fieldIds.dailyUsageMinutes}
                    type="number"
                    min={0}
                    value={draft.dailyUsageMinutes}
                    onChange={(event) => update("dailyUsageMinutes", event.target.value)}
                    aria-invalid={Boolean(errors.dailyUsageMinutes)}
                    aria-describedby={errors.dailyUsageMinutes ? `${fieldIds.dailyUsageMinutes}-error` : undefined}
                    required
                  />
                </Field>
                <Field label="Average daily study hours" inputId={fieldIds.studyHours} error={errors.studyHours}>
                  <Input
                    id={fieldIds.studyHours}
                    type="number"
                    min={0}
                    max={24}
                    step="0.25"
                    value={draft.studyHours}
                    onChange={(event) => update("studyHours", event.target.value)}
                    aria-invalid={Boolean(errors.studyHours)}
                    aria-describedby={errors.studyHours ? `${fieldIds.studyHours}-error` : undefined}
                    required
                  />
                </Field>
                <Field label="Average sleep hours" inputId={fieldIds.sleepHours} error={errors.sleepHours}>
                  <Input
                    id={fieldIds.sleepHours}
                    type="number"
                    min={0}
                    max={24}
                    step="0.25"
                    value={draft.sleepHours}
                    onChange={(event) => update("sleepHours", event.target.value)}
                    aria-invalid={Boolean(errors.sleepHours)}
                    aria-describedby={errors.sleepHours ? `${fieldIds.sleepHours}-error` : undefined}
                    required
                  />
                </Field>
              </Section>

              <Section index={3} title="Scrolling patterns">
                <Field label="Watches before sleep" inputId={fieldIds.lateNightUsage} error={errors.lateNightUsage}>
                  <FrequencySelect
                    id={fieldIds.lateNightUsage}
                    value={draft.lateNightUsage}
                    onChange={(value) => update("lateNightUsage", value)}
                    invalid={Boolean(errors.lateNightUsage)}
                    describedBy={errors.lateNightUsage ? `${fieldIds.lateNightUsage}-error` : undefined}
                  />
                </Field>
                <Field label="Loses track of time while scrolling" inputId={fieldIds.losesTrackOfTime} error={errors.losesTrackOfTime}>
                  <FrequencySelect
                    id={fieldIds.losesTrackOfTime}
                    value={draft.losesTrackOfTime}
                    onChange={(value) => update("losesTrackOfTime", value)}
                    invalid={Boolean(errors.losesTrackOfTime)}
                    describedBy={errors.losesTrackOfTime ? `${fieldIds.losesTrackOfTime}-error` : undefined}
                  />
                </Field>
                <Field label="Opens short-video apps without intention" inputId={fieldIds.unintentionalOpening} error={errors.unintentionalOpening}>
                  <FrequencySelect
                    id={fieldIds.unintentionalOpening}
                    value={draft.unintentionalOpening}
                    onChange={(value) => update("unintentionalOpening", value)}
                    invalid={Boolean(errors.unintentionalOpening)}
                    describedBy={errors.unintentionalOpening ? `${fieldIds.unintentionalOpening}-error` : undefined}
                  />
                </Field>
              </Section>

              <Button type="submit" size="lg" disabled={isSaving} className="w-full sm:w-fit">
                <Save className="h-4 w-4" aria-hidden="true" />
                {isSaving ? "Saving..." : "Save and continue"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-8">
          <Card className="p-6 text-center">
            <Scrolly mood={hasErrors ? "concerned" : isSaving ? "happy" : "idle"} size={120} />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {hasErrors
                ? "A couple of answers need another look."
                : "Take your time. There are no wrong answers, just honest ones."}
            </p>
          </Card>
          <div className="flex items-start gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 text-xs leading-5 text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Stored in your browser only. Nothing is sent to a server.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-5">
      <legend className="flex items-center gap-3 pb-1 font-display text-lg font-medium tracking-tight">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-metal text-xs font-semibold text-[hsl(300_50%_9%)]" aria-hidden="true">
          {index}
        </span>
        {title}
      </legend>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  inputId,
  error,
  children
}: {
  label: string;
  inputId: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      {children}
      {error ? (
        <p id={`${inputId}-error`} className="text-sm font-medium text-danger-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function FrequencySelect({
  id,
  value,
  onChange,
  invalid,
  describedBy
}: {
  id: string;
  value: Frequency;
  onChange: (value: Frequency) => void;
  invalid: boolean;
  describedBy?: string;
}) {
  return (
    <Select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as Frequency)}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      required
    >
      {frequencies.map((frequency) => (
        <option key={frequency} value={frequency}>
          {frequency}
        </option>
      ))}
    </Select>
  );
}
