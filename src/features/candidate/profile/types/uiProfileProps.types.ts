/**
 * FINDWORK CP8B — UI PRESENTATION PROPS CONTRACTS
 * 
 * Định nghĩa Typed Props cho toàn bộ Presentation Components.
 * Tách rời hoàn toàn khỏi network calls và query hooks.
 */

import type {
  CandidateCareerStatus,
  CandidateEducationRecord,
  CandidateExperienceRecord,
  CandidateLanguageRecord,
  CandidatePrivacySettingRecord,
  CandidateProfilePresentationState,
  CandidateSkillRecord,
  FullCandidateProfileRecord,
  ImportOnboardingPayload,
  OnboardingDraftSummary,
} from "./candidateProfile.types";

/** Props cho Card Tổng quan hồ sơ */
export interface ProfileOverviewCardProps {
  fullName: string;
  email: string;
  headline?: string;
  careerStatus: CandidateCareerStatus | null;
  bio?: string | null;
  locationName?: string | null;
  updatedAt: string;
  onEditOverview?: () => void;
  isSaving?: boolean;
}

/** Props cho Section Thông tin cá nhân */
export interface PersonalInfoSectionProps {
  profile: Pick<
    FullCandidateProfileRecord,
    | "fullName"
    | "phone"
    | "dateOfBirth"
    | "gender"
    | "countryCode"
    | "provinceId"
    | "wardId"
    | "province"
    | "ward"
    | "addressLine"
  >;
  accountEmail: string;
  onSavePersonalInfo?: (data: Partial<FullCandidateProfileRecord>) => Promise<void> | void;
  isSaving?: boolean;
}

/** Props cho Section Học vấn */
export interface EducationSectionProps {
  educationList: CandidateEducationRecord[];
  onAddEducation?: (item: Omit<CandidateEducationRecord, "id">) => Promise<void> | void;
  onUpdateEducation?: (id: string, item: Partial<CandidateEducationRecord>) => Promise<void> | void;
  onDeleteEducation?: (id: string) => Promise<void> | void;
  isSaving?: boolean;
}

/** Props cho Section Kinh nghiệm làm việc (Tùy chọn cho sinh viên/fresher) */
export interface ExperienceSectionProps {
  experienceList: CandidateExperienceRecord[];
  onAddExperience?: (item: Omit<CandidateExperienceRecord, "id">) => Promise<void> | void;
  onUpdateExperience?: (id: string, item: Partial<CandidateExperienceRecord>) => Promise<void> | void;
  onDeleteExperience?: (id: string) => Promise<void> | void;
  isSaving?: boolean;
}

/** Props cho Section Kỹ năng & Ngoại ngữ */
export interface SkillsAndLanguagesSectionProps {
  skills: CandidateSkillRecord[];
  languages: CandidateLanguageRecord[];
  onAddSkill?: (skill: Omit<CandidateSkillRecord, "id">) => Promise<void> | void;
  onUpdateSkill?: (id: string, skill: Partial<CandidateSkillRecord>) => Promise<void> | void;
  onDeleteSkill?: (id: string) => Promise<void> | void;
  onAddLanguage?: (lang: Omit<CandidateLanguageRecord, "id">) => Promise<void> | void;
  onUpdateLanguage?: (id: string, lang: Partial<CandidateLanguageRecord>) => Promise<void> | void;
  onDeleteLanguage?: (id: string) => Promise<void> | void;
  isSaving?: boolean;
}

/** Props cho Section Nguyện vọng nghề nghiệp */
export interface CareerPreferencesSectionProps {
  careerPreference?: FullCandidateProfileRecord["careerPreference"] | null;
  onSaveCareerPreference?: (pref: NonNullable<FullCandidateProfileRecord["careerPreference"]>) => Promise<void> | void;
  isSaving?: boolean;
}

/** Props cho Section Quyền riêng tư */
export interface PrivacySettingsSectionProps {
  privacySetting: CandidatePrivacySettingRecord;
  onSavePrivacy?: (settings: CandidatePrivacySettingRecord) => Promise<void> | void;
  isSaving?: boolean;
}

/** Hạng mục trong Checklist hướng dẫn */
export interface GuidanceChecklistItem {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isOptional?: boolean;
  anchorId: string;
}

/** Props cho Guidance Checklist (Right Rail - No %) */
export interface ProfileGuidanceChecklistProps {
  items: GuidanceChecklistItem[];
  onItemClick?: (anchorId: string) => void;
}

/** Props cho Banner Import Onboarding */
export interface OnboardingImportBannerProps {
  draftSummary: OnboardingDraftSummary;
  onOpenImportPreview: () => void;
  onGoToOnboarding: () => void;
}

/** Props cho Modal xem trước và xác nhận Import */
export interface OnboardingImportPreviewModalProps {
  isOpen: boolean;
  draftSummary: OnboardingDraftSummary;
  isImporting?: boolean;
  importError?: string | null;
  validationErrors?: Record<string, string[]> | null;
  onClose: () => void;
  onConfirmImport: (payload: ImportOnboardingPayload) => Promise<void> | void;
  onGoToOnboarding: () => void;

  /** Dữ liệu bản nháp thực tế để tính toán chính xác khác biệt quyền riêng tư và asset */
  draftData?: import("../../types/onboarding.types").CandidateOnboardingData | null;
  detectedUnsupportedAssets?: import("./candidateApi.types").UnsupportedOnboardingAsset[];
  privacyDifferences?: import("../adapters/candidateProfileNormalizer").PrivacyDifferenceItem[];
}

/** Props cho State Feedback Card (Error, Forbidden, Eligibility Unknown, etc.) */
export interface ProfileStateFeedbackProps {
  state: CandidateProfilePresentationState;
  errorMessage?: string | null;
  onRetry?: () => void;
  onGoToOnboarding?: () => void;
}

/** Props Master cho CandidateProfileView */
export interface CandidateProfileViewProps {
  state: CandidateProfilePresentationState;
  profile?: FullCandidateProfileRecord | null;
  draftSummary?: OnboardingDraftSummary | null;
  draftData?: import("../../types/onboarding.types").CandidateOnboardingData | null;
  accountEmail: string;
  errorMessage?: string | null;
  isSaving?: boolean;

  // Handlers
  onRetry?: () => void;
  onGoToOnboarding?: () => void;
  onConfirmImport?: (payload: ImportOnboardingPayload) => Promise<void> | void;
  onSavePersonalInfo?: (data: Partial<FullCandidateProfileRecord>) => Promise<void> | void;
  onSaveOverview?: (data: { fullName: string; headline?: string; bio?: string | null; careerStatus: CandidateCareerStatus | null }) => Promise<void> | void;
  onAddEducation?: (item: Omit<CandidateEducationRecord, "id">) => Promise<void> | void;
  onUpdateEducation?: (id: string, item: Partial<CandidateEducationRecord>) => Promise<void> | void;
  onDeleteEducation?: (id: string) => Promise<void> | void;
  onAddExperience?: (item: Omit<CandidateExperienceRecord, "id">) => Promise<void> | void;
  onUpdateExperience?: (id: string, item: Partial<CandidateExperienceRecord>) => Promise<void> | void;
  onDeleteExperience?: (id: string) => Promise<void> | void;
  onAddSkill?: (skill: Omit<CandidateSkillRecord, "id">) => Promise<void> | void;
  onUpdateSkill?: (id: string, skill: Partial<CandidateSkillRecord>) => Promise<void> | void;
  onDeleteSkill?: (id: string) => Promise<void> | void;
  onAddLanguage?: (lang: Omit<CandidateLanguageRecord, "id">) => Promise<void> | void;
  onUpdateLanguage?: (id: string, lang: Partial<CandidateLanguageRecord>) => Promise<void> | void;
  onDeleteLanguage?: (id: string) => Promise<void> | void;
  onSaveCareerPreference?: (pref: NonNullable<FullCandidateProfileRecord["careerPreference"]>) => Promise<void> | void;
  onSavePrivacy?: (settings: CandidatePrivacySettingRecord) => Promise<void> | void;
}
