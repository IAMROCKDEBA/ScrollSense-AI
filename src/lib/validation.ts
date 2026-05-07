import type { UserProfile } from "@/types";

export type ProfileDraft = Omit<UserProfile, "createdAt">;

export function validateProfile(profile: Partial<ProfileDraft>) {
  const errors: Partial<Record<keyof ProfileDraft, string>> = {};

  if (!profile.name || profile.name.trim().length < 2) {
    errors.name = "Enter a name with at least 2 characters.";
  }

  if (!Number.isFinite(profile.age) || Number(profile.age) < 8 || Number(profile.age) > 80) {
    errors.age = "Enter an age between 8 and 80.";
  }

  if (!profile.studentStatus) errors.studentStatus = "Choose your student status.";
  if (!profile.mainPlatform) errors.mainPlatform = "Choose your main short-video platform.";

  if (!Number.isFinite(profile.dailyUsageMinutes) || Number(profile.dailyUsageMinutes) < 0) {
    errors.dailyUsageMinutes = "Enter daily usage in minutes.";
  }

  if (!Number.isFinite(profile.studyHours) || Number(profile.studyHours) < 0 || Number(profile.studyHours) > 24) {
    errors.studyHours = "Enter study hours between 0 and 24.";
  }

  if (!Number.isFinite(profile.sleepHours) || Number(profile.sleepHours) < 0 || Number(profile.sleepHours) > 24) {
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
