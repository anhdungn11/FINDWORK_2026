import type { OnboardingDraft } from "../../services/onboardingDraft";
import type { Resume } from "../../../resume/types/resume.types";
import type { AuthUser } from "../../../../store/authStore";

export interface DashboardStepInfo {
  id: string;
  number: number;
  title: string;
  description: string;
}

export type DraftStatusCategory =
  | "not_started"
  | "in_progress"
  | "final_step"
  | "draft_completed";

export interface DashboardProgressResult {
  stepIndex: number;
  stepNumber: number;
  totalSteps: number;
  stepTitle: string;
  stepDescription: string;
  /** Explicit percentage indicating step position (stepNumber / totalSteps) */
  stepProgressPercent: number;
  /** Backward compatible percent field */
  percent: number;
  category: DraftStatusCategory;
  statusLabel: string;
  /** True only when positioned at step 7/7 of draft. Does not imply profile completeness or publication. */
  isAtFinalStep: boolean;
  /** Backward compatible alias for isAtFinalStep */
  isDraftCompleted: boolean;
  /** Explicitly marks whether this is an official CandidateProfile record from backend */
  isOfficialProfile: boolean;
  updatedAt: string | null;
}

export interface CandidateProfileLocation {
  id: string;
  code: string;
  name: string;
  divisionType?: string;
}

export interface CandidatePrivacySetting {
  id: string;
  candidateProfileId: string;
  searchableProfile: boolean;
  showEmail: boolean;
  showPhone: boolean;
  allowResumeDownload: boolean;
  allowJobMatching: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateProfileRecord {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  countryCode: string | null;
  provinceId: string | null;
  wardId: string | null;
  addressLine: string | null;
  bio: string | null;
  avatarAssetKey: string | null;
  careerStatus: string | null;
  createdAt: string;
  updatedAt: string;
  province?: CandidateProfileLocation | null;
  ward?: CandidateProfileLocation | null;
  privacySetting?: CandidatePrivacySetting | null;
}

export type CandidateProfileStatus =
  | "loading"
  | "exists"
  | "not_created"
  | "forbidden"
  | "error";

export interface CandidateProfileState {
  status: CandidateProfileStatus;
  profile: CandidateProfileRecord | null;
  errorMessage?: string | null;
}

export interface CandidateDashboardData {
  user: AuthUser;
  draft: OnboardingDraft | null;
  resumes: Resume[];
  progress: DashboardProgressResult;
  displayName: string;
  profileState: CandidateProfileState;
}
