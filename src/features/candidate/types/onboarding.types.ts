export type OnboardingStepId =
  | "personal"
  | "education"
  | "experience"
  | "skills"
  | "preferences"
  | "resume"
  | "privacy";

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;

  dateOfBirth: string;
  gender: string;

  province: string;
  district: string;
  address: string;

  bio: string;
  avatarUrl: string;
}

export interface EducationItem {
  id: string;

  school: string;
  degree: string;
  major: string;
  location: string;

  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;

  isStudying: boolean;

  gpa: string;
  gpaScale: "" | "4" | "10" | "100";

  achievements: string;
  description: string;
}
export interface ExperienceItem {
  id: string;

  company: string;
  position: string;

  employmentType:
    | ""
    | "full-time"
    | "part-time"
    | "internship"
    | "contract"
    | "freelance"
    | "temporary"
    | "volunteer";

  workplaceType:
    | ""
    | "onsite"
    | "hybrid"
    | "remote";

  location: string;

  startMonth: string;
  startYear: string;

  endMonth: string;
  endYear: string;

  isCurrent: boolean;

  description: string;
  achievements: string;

  skillsUsed: string[];
}

export interface SkillItem {
  id: string;
  name: string;
  level: string;
}

export interface LanguageItem {
  id: string;
  name: string;
  level: string;
}

export interface CareerPreferences {
  employmentStatus: string;
  desiredPosition: string;
  industry: string;
  desiredLocation: string;
  employmentType: string;
  workplaceType: string;
  expectedSalaryMin: string;
  expectedSalaryMax: string;
  availableFrom: string;
}

export interface ResumeInfo {
  resumeName: string;
  resumeUrl: string;
  hasExistingResume: boolean;
  createLater: boolean;
}

export interface PrivacySettings {
  searchableProfile: boolean;
  showEmail: boolean;
  showPhone: boolean;
  allowResumeDownload: boolean;
  allowJobMatching: boolean;
}

export interface CandidateOnboardingData {
  personal: PersonalInfo;

  education: EducationItem[];

  experience: ExperienceItem[];

  skills: SkillItem[];

  languages: LanguageItem[];

  preferences: CareerPreferences;

  resume: ResumeInfo;

  privacy: PrivacySettings;
}

export interface OnboardingStep {
  id: OnboardingStepId;
  number: number;
  title: string;
  description: string;
}