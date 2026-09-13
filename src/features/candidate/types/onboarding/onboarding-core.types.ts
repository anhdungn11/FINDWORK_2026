import type { EducationItem } from "./education.types";
import type { ExperienceItem } from "./experience.types";
import type { CandidateLanguageItem } from "./language.types";
import type { PersonalInfo } from "./personal.types";
import type { CareerPreferences } from "./preferences.types";
import type { PrivacySettings } from "./privacy.types";
import type { ResumeInfo } from "./resume.types";
import type { CandidateSkillItem } from "./skill.types";

export type OnboardingStepId = "personal" | "education" | "experience" | "skills" | "preferences" | "resume" | "privacy";
export interface CandidateOnboardingData {
  personal: PersonalInfo;
  education: EducationItem[];
  experience: ExperienceItem[];
  skills: CandidateSkillItem[];
  languages: CandidateLanguageItem[];
  preferences: CareerPreferences;
  resume: ResumeInfo;
  privacy: PrivacySettings;
}
export interface OnboardingStep { id: OnboardingStepId; number: number; title: string; description: string; }
export type UpdateCandidateOnboardingSection = <Section extends keyof CandidateOnboardingData>(section: Section, value: CandidateOnboardingData[Section]) => void;
