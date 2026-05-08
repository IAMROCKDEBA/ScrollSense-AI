import type { UserProfile } from "@/types";

type NumericDraftValue = string;

export type ProfileDraft = Omit<UserProfile, "createdAt" | "age" | "dailyUsageMinutes" | "studyHours" | "sleepHours"> & {
  age: NumericDraftValue;
  dailyUsageMinutes: NumericDraftValue;
  studyHours: NumericDraftValue;
  sleepHours: NumericDraftValue;
};

export function validateProfile(profile: Partial<ProfileDraft>) {
  const errors: Partial<Record<keyof ProfileDraft, string>> = {};

  if (!profile.name || profile.name.trim().length < 2) {
    errors.name = "Enter a name with at least 2 characters.";
  }

  const age = toFiniteNumber(profile.age);
  if (age === null || age < 8 || age > 80) {
    errors.age = "Enter an age between 8 and 80.";
  }

  if (!profile.studentStatus) errors.studentStatus = "Choose your student status.";
  if (!profile.mainPlatform) errors.mainPlatform = "Choose your main short-video platform.";

  const dailyUsageMinutes = toFiniteNumber(profile.dailyUsageMinutes);
  if (dailyUsageMinutes === null || dailyUsageMinutes < 0) {
    errors.dailyUsageMinutes = "Enter daily usage in minutes.";
  }

  const studyHours = toFiniteNumber(profile.studyHours);
  if (studyHours === null || studyHours < 0 || studyHours > 24) {
    errors.studyHours = "Enter study hours between 0 and 24.";
  }

  const sleepHours = toFiniteNumber(profile.sleepHours);
  if (sleepHours === null || sleepHours < 0 || sleepHours > 24) {
    errors.sleepHours = "Enter sleep hours between 0 and 24.";
  }

  if (!profile.lateNightUsage) errors.lateNightUsage = "Choose one option.";
  if (!profile.losesTrackOfTime) errors.losesTrackOfTime = "Choose one option.";
  if (!profile.unintentionalOpening) errors.unintentionalOpening = "Choose one option.";

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

function toFiniteNumber(value: NumericDraftValue | undefined) {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
