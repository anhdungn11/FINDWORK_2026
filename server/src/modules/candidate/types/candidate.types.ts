export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type CandidateGender = (typeof GENDERS)[number];

export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "INTERNSHIP",
  "CONTRACT",
  "FREELANCE",
  "TEMPORARY",
  "VOLUNTEER",
] as const;
export type CandidateEmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORKPLACE_TYPES = ["ONSITE", "HYBRID", "REMOTE"] as const;
export type CandidateWorkplaceType = (typeof WORKPLACE_TYPES)[number];

export const CAREER_LEVELS = [
  "INTERN",
  "FRESHER",
  "JUNIOR",
  "MID",
  "SENIOR",
  "LEAD",
  "MANAGER",
] as const;
export type CandidateCareerLevel = (typeof CAREER_LEVELS)[number];

export const CANDIDATE_CAREER_STATUSES = [
  "STUDENT",
  "INTERN",
  "LOOKING_FOR_JOB",
  "EMPLOYED",
  "UNEMPLOYED",
  "FREELANCER",
  "OTHER",
] as const;
export type CandidateCareerStatus = (typeof CANDIDATE_CAREER_STATUSES)[number];

export const LOCATION_PREFERENCE_MODES = ["SELECTED", "NATIONWIDE"] as const;
export type CandidateLocationPreferenceMode =
  (typeof LOCATION_PREFERENCE_MODES)[number];

export const SALARY_EXPECTATION_TYPES = [
  "RANGE",
  "NEGOTIABLE",
  "NOT_IMPORTANT",
] as const;
export type CandidateSalaryExpectationType =
  (typeof SALARY_EXPECTATION_TYPES)[number];

export const SALARY_PERIODS = ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"] as const;
export type CandidateSalaryPeriod = (typeof SALARY_PERIODS)[number];

export const AVAILABILITY_TYPES = ["IMMEDIATELY", "SPECIFIC_DATE"] as const;
export type CandidateAvailabilityType = (typeof AVAILABILITY_TYPES)[number];

export const LANGUAGE_PROFICIENCIES = [
  "BASIC",
  "CONVERSATIONAL",
  "PROFESSIONAL",
  "FLUENT",
  "NATIVE",
] as const;
export type CandidateLanguageProficiency =
  (typeof LANGUAGE_PROFICIENCIES)[number];

export const SKILL_LEVELS = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "PROFICIENT",
  "EXPERT",
] as const;
export type CandidateSkillLevel = (typeof SKILL_LEVELS)[number];

export type CandidateJsonValue =
  | string
  | number
  | boolean
  | null
  | CandidateJsonValue[]
  | { [key: string]: CandidateJsonValue };

export interface ExperienceSkillInput {
  skillId: string | null;
  skillName: string;
}
