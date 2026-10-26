/**
 * FINDWORK CP8B — CANDIDATE PROFILE PRESENTATION MODULE
 *
 * Public exports for the candidate profile presentation layer.
 */

export * from "./types/candidateProfile.types";
export * from "./types/uiProfileProps.types";
export * from "./utils/profileFormatters";
export { useModalAccessibility } from "./utils/useModalAccessibility";

export { CandidateProfileView } from "./components/CandidateProfileView";
export { ProfileOverviewCard } from "./components/ProfileOverviewCard";
export { PersonalInfoSection } from "./components/PersonalInfoSection";
export { EducationSection } from "./components/EducationSection";
export { ExperienceSection } from "./components/ExperienceSection";
export { SkillsAndLanguagesSection } from "./components/SkillsAndLanguagesSection";
export { CareerPreferencesSection } from "./components/CareerPreferencesSection";
export { PrivacySettingsSection } from "./components/PrivacySettingsSection";
export { ProfileGuidanceChecklist } from "./components/ProfileGuidanceChecklist";
export { ProfileQuickNav } from "./components/ProfileQuickNav";
export { CvCenterReferenceCard } from "./components/CvCenterReferenceCard";
export { OnboardingImportBanner } from "./components/OnboardingImportBanner";
export { OnboardingImportPreviewModal } from "./components/OnboardingImportPreviewModal";
export { ManualProfileCreateModal } from "./components/ManualProfileCreateModal";
export { ProfileSkeletonLoader } from "./components/ProfileSkeletonLoader";
export { ProfileStateFeedback } from "./components/ProfileStateFeedback";

// CP8C Integration Foundation
export * from "./types/candidateApi.types";
export * from "./config/candidateIntegrationConfig";
export * from "./adapters/candidateProfileNormalizer";
export * from "./services/candidateProfileService";
export * from "./hooks/useCandidateProfileIntegration";
