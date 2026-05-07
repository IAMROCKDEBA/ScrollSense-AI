"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Disclaimer } from "@/components/layout/disclaimer";
import { validateProfile, type ProfileDraft } from "@/lib/validation";
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
  age: 18,
  studentStatus: "college",
  dailyUsageMinutes: 60,
  mainPlatform: "YouTube Shorts",
  studyHours: 3,
  sleepHours: 7,
  lateNightUsage: "Sometimes",
  losesTrackOfTime: "Sometimes",
  unintentionalOpening: "Sometimes"
};

function profileToDraft(profile: UserProfile): ProfileDraft {
  return {
    name: profile.name,
    age: profile.age,
    studentStatus: profile.studentStatus,
    dailyUsageMinutes: profile.dailyUsageMinutes,
    mainPlatform: profile.mainPlatform,
    studyHours: profile.studyHours,
    sleepHours: profile.sleepHours,
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

  function goToMoodPage() {
    router.push("/mood");
    window.setTimeout(() => {
      if (window.location.pathname !== "/mood") {
        window.location.assign("/mood");
      }
    }, 250);
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
    setSubmitMessage("Saved. Opening mood check-in...");

    try {
      saveProfile({
        ...draft,
        name: draft.name.trim(),
        createdAt: profile?.createdAt ?? new Date().toISOString()
      });
      goToMoodPage();
    } catch {
      setSubmitMessage("Your browser blocked saving. Please allow site storage or use another browser.");
      setIsSaving(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitProfile();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Onboarding Assessment</h1>
        <p className="mt-2 text-muted-foreground">
          Tell ScrollSense AI about your usual short-video habits. These values are stored only in your browser.
        </p>
      </div>

      <Disclaimer />

      <Card>
        <CardHeader>
          <CardTitle>Student profile and behavior</CardTitle>
          <CardDescription>All fields are required for a more useful estimate.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={onSubmit} noValidate>
            {submitMessage ? (
              <div
                className={
                  errors && Object.keys(errors).length > 0
                    ? "rounded-lg border border-red-500/35 bg-red-500/12 p-4 text-sm text-red-100"
                    : "rounded-lg border border-emerald-500/35 bg-emerald-500/12 p-4 text-sm text-emerald-100"
                }
                role="alert"
              >
                <p className="font-medium">{submitMessage}</p>
                {Object.keys(errors).length > 0 ? (
                  <ul className="mt-2 list-inside list-disc text-red-100/85">
                    {fieldOrder
                      .filter((field) => errors[field])
                      .map((field) => (
                        <li key={field}>{errors[field]}</li>
                      ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-5 md:grid-cols-2">
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
                  className={errors.name ? "border-red-400" : undefined}
                />
              </Field>
              <Field label="Age" inputId={fieldIds.age} error={errors.age}>
                <Input
                  id={fieldIds.age}
                  type="number"
                  min={8}
                  max={80}
                  value={draft.age}
                  onChange={(event) => update("age", Number(event.target.value))}
                  aria-invalid={Boolean(errors.age)}
                  aria-describedby={errors.age ? `${fieldIds.age}-error` : undefined}
                  required
                  className={errors.age ? "border-red-400" : undefined}
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
                  className={errors.studentStatus ? "border-red-400" : undefined}
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
                  className={errors.mainPlatform ? "border-red-400" : undefined}
                >
                  {platforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Daily short-form video usage in minutes" inputId={fieldIds.dailyUsageMinutes} error={errors.dailyUsageMinutes}>
                <Input
                  id={fieldIds.dailyUsageMinutes}
                  type="number"
                  min={0}
                  value={draft.dailyUsageMinutes}
                  onChange={(event) => update("dailyUsageMinutes", Number(event.target.value))}
                  aria-invalid={Boolean(errors.dailyUsageMinutes)}
                  aria-describedby={errors.dailyUsageMinutes ? `${fieldIds.dailyUsageMinutes}-error` : undefined}
                  required
                  className={errors.dailyUsageMinutes ? "border-red-400" : undefined}
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
                  onChange={(event) => update("studyHours", Number(event.target.value))}
                  aria-invalid={Boolean(errors.studyHours)}
                  aria-describedby={errors.studyHours ? `${fieldIds.studyHours}-error` : undefined}
                  required
                  className={errors.studyHours ? "border-red-400" : undefined}
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
                  onChange={(event) => update("sleepHours", Number(event.target.value))}
                  aria-invalid={Boolean(errors.sleepHours)}
                  aria-describedby={errors.sleepHours ? `${fieldIds.sleepHours}-error` : undefined}
                  required
                  className={errors.sleepHours ? "border-red-400" : undefined}
                />
              </Field>
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
            </div>
            <Button type="button" onClick={submitProfile} disabled={isSaving} className="w-full sm:w-fit">
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSaving ? "Saving..." : "Save and continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
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
        <p id={`${inputId}-error`} className="text-sm font-medium text-red-200">
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
      className={invalid ? "border-red-400" : undefined}
    >
      {frequencies.map((frequency) => (
        <option key={frequency} value={frequency}>
          {frequency}
        </option>
      ))}
    </Select>
  );
}
