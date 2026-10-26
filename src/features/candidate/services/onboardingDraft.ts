import type { CandidateOnboardingData } from "../types/onboarding.types";
import { INITIAL_ONBOARDING_DATA } from "../utils/onboarding.constants";
import { apiClient } from "../../../services/http/apiClient";
import { API_ENDPOINTS } from "../../../services/http/endpoints";

export interface OnboardingDraft {
  data: CandidateOnboardingData;
  stepIndex: number;
  version: number;
  updatedAt: string;
}

export const safeStepIndex = (value: unknown): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6 ? value : 0;

/** Object URLs are browser-tab-only previews, NOT uploaded assets. */
export function draftSnapshot(data: CandidateOnboardingData): CandidateOnboardingData {
  const avatarUrl = data.personal.avatarUrl;
  const localResume = /^(blob:|data:)/i.test(data.resume.resumeUrl);
  return {
    ...data,
    personal: { ...data.personal, avatarUrl: /^(blob:|data:)/i.test(avatarUrl) ? "" : avatarUrl },
    resume: localResume ? {
      resumeName: data.resume.resumeName,
      resumeUrl: "", fileName: "", fileSize: null, mimeType: "",
      hasExistingResume: false, createLater: data.resume.createLater,
    } : { ...data.resume },
  };
}

export function restoreDraftData(input: Partial<CandidateOnboardingData>): CandidateOnboardingData {
  // Merge defaults to tolerate adding fields in a future frontend deployment.
  const preferences = input.preferences ?? INITIAL_ONBOARDING_DATA.preferences;
  return {
    personal: { ...INITIAL_ONBOARDING_DATA.personal, ...input.personal },
    education: Array.isArray(input.education) ? input.education : [],
    experience: Array.isArray(input.experience) ? input.experience : [],
    skills: Array.isArray(input.skills) ? input.skills : [],
    languages: Array.isArray(input.languages) ? input.languages : [],
    preferences: {
      ...INITIAL_ONBOARDING_DATA.preferences,
      ...preferences,
      locationPreference: {
        ...INITIAL_ONBOARDING_DATA.preferences.locationPreference,
        ...preferences.locationPreference,
      },
      salaryExpectation: {
        ...INITIAL_ONBOARDING_DATA.preferences.salaryExpectation,
        ...preferences.salaryExpectation,
      },
      availability: {
        ...INITIAL_ONBOARDING_DATA.preferences.availability,
        ...preferences.availability,
      },
    },
    resume: { ...INITIAL_ONBOARDING_DATA.resume, ...input.resume },
    privacy: { ...INITIAL_ONBOARDING_DATA.privacy, ...input.privacy },
  };
}

/**
 * Normalizes the raw response from GET /api/v1/candidate/onboarding-draft.
 * When no draft exists, NestJS serializes `null` as an empty 200 OK body (`""`).
 */
export function normalizeOnboardingDraftPayload(raw: unknown): OnboardingDraft | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  if (!candidate.data || typeof candidate.data !== "object" || Array.isArray(candidate.data)) {
    return null;
  }
  const rawVersion = candidate.version;
  const version =
    typeof rawVersion === "number" && Number.isInteger(rawVersion) && rawVersion >= 1
      ? rawVersion
      : 1;
  return {
    data: restoreDraftData(candidate.data as Partial<CandidateOnboardingData>),
    stepIndex: safeStepIndex(candidate.stepIndex),
    version,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
  };
}

export async function loadOnboardingDraft(): Promise<OnboardingDraft | null> {
  const response = await apiClient.get< unknown >(API_ENDPOINTS.CANDIDATE.ONBOARDING_DRAFT);
  return normalizeOnboardingDraftPayload(response.data);
}

export async function saveOnboardingDraft(data: CandidateOnboardingData, stepIndex: number, version: number): Promise<OnboardingDraft> {
  const response = await apiClient.put<OnboardingDraft>(API_ENDPOINTS.CANDIDATE.ONBOARDING_DRAFT, {
    data: draftSnapshot(data), stepIndex: safeStepIndex(stepIndex), version,
  });
  return response.data;
}
