import { BadRequestException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import type {
  CandidateEmploymentType, CandidateLanguageProficiency, CandidateSkillLevel,
  CandidateWorkplaceType,
} from "./types/candidate.types";

type RecordValue = Record<string, unknown>;
export type UnsupportedOnboardingAsset = "avatar" | "resume";
export const CANDIDATE_IMPORT_PRIVACY_DEFAULTS = {
  searchableProfile: false,
  showEmail: false,
  showPhone: false,
  allowResumeDownload: false,
  allowJobMatching: true,
} as const;
export type CandidateImportPrivacyField = keyof typeof CANDIDATE_IMPORT_PRIVACY_DEFAULTS;
type Education = Omit<Prisma.CandidateEducationUncheckedCreateInput, "candidateProfileId">;
type Experience = Omit<Prisma.CandidateExperienceUncheckedCreateInput, "candidateProfileId"> & { skillsUsed: string[] };
type Skill = Omit<Prisma.CandidateSkillUncheckedCreateInput, "candidateProfileId" | "skillId"> & { skillCode: string | null };
type Certificate = Omit<Prisma.CandidateLanguageCertificateUncheckedCreateInput, "candidateLanguageId" | "certificateTypeId" | "scores"> & {
  certificateTypeCode: string | null;
  scores: Record<string, number> | null;
};
type Language = Omit<Prisma.CandidateLanguageUncheckedCreateInput, "candidateProfileId" | "languageId"> & {
  languageCode: string | null;
  certificates: Certificate[];
};

export interface ParsedCandidateDraft {
  unsupportedAssets: UnsupportedOnboardingAsset[];
  privacyDifferences: CandidateImportPrivacyField[];
  personal: {
    fullName: string; email: string | null; phone: string | null; dateOfBirth: Date | null;
    gender: "MALE" | "FEMALE" | "OTHER" | null; countryCode: string | null;
    provinceCode: string | null; wardCode: string | null; addressLine: string | null; bio: string | null;
  };
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  languages: Language[];
  preferences: {
    desiredPositions: string[]; preferredCategoryCodes: string[];
    locationMode: "SELECTED" | "NATIONWIDE"; provinceCodes: string[];
    employmentTypes: CandidateEmploymentType[]; workplaceTypes: CandidateWorkplaceType[];
    salaryType: "RANGE" | "NEGOTIABLE" | "NOT_IMPORTANT";
    salaryMin: number | null; salaryMax: number | null; currency: "VND"; salaryPeriod: "MONTH";
    desiredCareerLevel: "INTERN" | "FRESHER" | "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "MANAGER" | null;
    availabilityType: "IMMEDIATELY" | "SPECIFIC_DATE" | null;
    availableFrom: Date | null; willingToRelocate: boolean;
  };
}

function invalid(path: string): never {
  throw new BadRequestException({ code: "CANDIDATE_ONBOARDING_INVALID", message: `Invalid onboarding draft field: ${path}.` });
}
function obj(value: unknown, path: string, keys: readonly string[]): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(path);
  const record = value as RecordValue;
  if (Object.keys(record).some((key) => !keys.includes(key))) invalid(path);
  return record;
}
function str(value: unknown, path: string, max: number, required = false): string | null {
  if (typeof value !== "string") invalid(path);
  const result = value.trim();
  if (result.length > max || (required && !result)) invalid(path);
  return result || null;
}
function bool(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") invalid(path);
  return value;
}
function list(value: unknown, path: string, max = 100): unknown[] {
  if (!Array.isArray(value) || value.length > max) invalid(path);
  return value;
}
function strings(value: unknown, path: string, maxLength: number): string[] {
  const result = list(value, path).map((entry, index) => str(entry, `${path}[${index}]`, maxLength, true)!);
  if (new Set(result.map((entry) => entry.toLowerCase())).size !== result.length) invalid(path);
  return result;
}
function choice<T extends string>(value: unknown, path: string, allowed: readonly T[], optional = false): T | null {
  if (optional && value === "") return null;
  if (typeof value !== "string" || !allowed.includes(value as T)) invalid(path);
  return value as T;
}
function upper<T extends string>(value: unknown, path: string, allowed: readonly T[], optional = false): string | null {
  const result = choice(value, path, allowed, optional);
  return result ? result.replace(/-/g, "_").toUpperCase() : null;
}
function monthYear(month: unknown, year: unknown, path: string, required: boolean): { month: number | null; year: number | null } {
  if (typeof month !== "string" || typeof year !== "string") invalid(path);
  if (!month && !year && !required) return { month: null, year: null };
  if (!/^(?:[1-9]|1[0-2])$/.test(month) || !/^\d{4}$/.test(year)) invalid(path);
  const numericYear = Number(year);
  if (numericYear < 1900 || numericYear > new Date().getFullYear() + 20) invalid(path);
  return { month: Number(month), year: numericYear };
}
function date(value: unknown, path: string): Date | null {
  if (typeof value !== "string") invalid(path);
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid(path);
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value) invalid(path);
  return result;
}
function decimal(value: unknown, path: string, max: number, digits = 3): number | null {
  if (typeof value !== "string") invalid(path);
  if (!value) return null;
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${digits}})?$`).test(value)) invalid(path);
  const result = Number(value);
  if (!Number.isFinite(result) || result > max) invalid(path);
  return result;
}
function nonnegative(value: unknown, path: string): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 90_000_000_000_000 || !/^\d+(?:\.\d{1,2})?$/.test(String(value))) invalid(path);
  return value;
}
function nullableString(value: unknown, path: string, max: number): string | null {
  return str(value, path, max);
}
function assetText(value: unknown, path: string): boolean {
  if (typeof value !== "string") invalid(path);
  return value.trim().length > 0;
}
function localId(record: RecordValue, path: string) { str(record.id, `${path}.id`, 120, true); }
function order(start: { month: number | null; year: number | null }, end: { month: number | null; year: number | null }, path: string) {
  if (end.year !== null && start.year !== null && (end.year * 12 + end.month!) < (start.year * 12 + start.month!)) invalid(path);
}

export function parseCandidateOnboardingDraft(value: unknown): ParsedCandidateDraft {
  const root = obj(value, "data", ["personal", "education", "experience", "skills", "languages", "preferences", "resume", "privacy"]);
  const p = obj(root.personal, "personal", ["fullName", "email", "phone", "dateOfBirth", "gender", "countryCode", "provinceCode", "wardCode", "addressLine", "bio", "avatarUrl"]);
  const hasAvatar = assetText(p.avatarUrl, "personal.avatarUrl");
  const countryCode = str(p.countryCode, "personal.countryCode", 2);
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) invalid("personal.countryCode");
  const provinceCode = str(p.provinceCode, "personal.provinceCode", 10);
  const wardCode = str(p.wardCode, "personal.wardCode", 10);
  if (wardCode && !provinceCode) invalid("personal.wardCode");
  const dateOfBirth = date(p.dateOfBirth, "personal.dateOfBirth");
  if (dateOfBirth && dateOfBirth.getTime() > Date.now()) invalid("personal.dateOfBirth");
  const personal = {
    fullName: str(p.fullName, "personal.fullName", 160, true)!,
    email: str(p.email, "personal.email", 320),
    phone: str(p.phone, "personal.phone", 32), dateOfBirth,
    gender: upper(p.gender, "personal.gender", ["male", "female", "other"] as const, true) as ParsedCandidateDraft["personal"]["gender"],
    countryCode, provinceCode, wardCode,
    addressLine: nullableString(p.addressLine, "personal.addressLine", 255),
    bio: nullableString(p.bio, "personal.bio", 10000),
  };
  if (personal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)) invalid("personal.email");

  const education = list(root.education, "education", 50).map((entry, index): Education => {
    const path = `education[${index}]`;
    const e = obj(entry, path, ["id", "school", "degree", "major", "location", "startMonth", "startYear", "endMonth", "endYear", "isStudying", "gpa", "gpaScale", "achievements", "description"]); localId(e, path);
    const start = monthYear(e.startMonth, e.startYear, `${path}.start`, true);
    const end = monthYear(e.endMonth, e.endYear, `${path}.end`, false);
    const isStudying = bool(e.isStudying, `${path}.isStudying`);
    if (isStudying && end.year !== null) invalid(`${path}.end`);
    order(start, end, path);
    const gpa = decimal(e.gpa, `${path}.gpa`, 100);
    const gpaScale = decimal(e.gpaScale, `${path}.gpaScale`, 100);
    if ((gpa === null) !== (gpaScale === null) || (gpaScale !== null && (gpaScale <= 0 || (gpa !== null && gpa > gpaScale)))) invalid(`${path}.gpa`);
    return { school: str(e.school, `${path}.school`, 255, true)!, degree: str(e.degree, `${path}.degree`, 160, true)!, major: str(e.major, `${path}.major`, 160, true)!, location: str(e.location, `${path}.location`, 255), startMonth: start.month!, startYear: start.year!, endMonth: end.month, endYear: end.year, isStudying, gpa, gpaScale, achievements: str(e.achievements, `${path}.achievements`, 10000), description: str(e.description, `${path}.description`, 10000) };
  });
  const employmentChoices = ["full-time", "part-time", "internship", "contract", "freelance", "temporary", "volunteer"] as const;
  const workplaceChoices = ["onsite", "hybrid", "remote"] as const;
  const experience = list(root.experience, "experience", 50).map((entry, index): Experience => {
    const path = `experience[${index}]`;
    const e = obj(entry, path, ["id", "company", "position", "employmentType", "workplaceType", "location", "startMonth", "startYear", "endMonth", "endYear", "isCurrent", "description", "achievements", "skillsUsed"]); localId(e, path);
    const start = monthYear(e.startMonth, e.startYear, `${path}.start`, true);
    const end = monthYear(e.endMonth, e.endYear, `${path}.end`, false);
    const isCurrent = bool(e.isCurrent, `${path}.isCurrent`);
    if (isCurrent && end.year !== null) invalid(`${path}.end`);
    order(start, end, path);
    return { companyName: str(e.company, `${path}.company`, 255, true)!, position: str(e.position, `${path}.position`, 180, true)!, employmentType: upper(e.employmentType, `${path}.employmentType`, employmentChoices) as CandidateEmploymentType, workplaceType: upper(e.workplaceType, `${path}.workplaceType`, workplaceChoices) as CandidateWorkplaceType, location: str(e.location, `${path}.location`, 255), startMonth: start.month!, startYear: start.year!, endMonth: end.month, endYear: end.year, isCurrent, description: str(e.description, `${path}.description`, 10000), achievements: str(e.achievements, `${path}.achievements`, 10000), skillsUsed: strings(e.skillsUsed, `${path}.skillsUsed`, 160) };
  });
  const skillLevels = ["beginner", "intermediate", "advanced", "proficient", "expert"] as const;
  const skills = list(root.skills, "skills", 100).map((entry, index): Skill => {
    const path = `skills[${index}]`;
    const s = obj(entry, path, ["id", "skillCode", "customSkillName", "level", "yearsOfExperience", "isHighlighted"]); localId(s, path);
    const skillCode = str(s.skillCode, `${path}.skillCode`, 120);
    const customSkillName = str(s.customSkillName, `${path}.customSkillName`, 160);
    if (!!skillCode === !!customSkillName) invalid(path);
    return { skillCode, customSkillName, level: upper(s.level, `${path}.level`, skillLevels) as CandidateSkillLevel, yearsOfExperience: decimal(s.yearsOfExperience, `${path}.yearsOfExperience`, 999.99, 2), isHighlighted: bool(s.isHighlighted, `${path}.isHighlighted`) };
  });
  const proficiency = ["basic", "conversational", "professional", "fluent", "native"] as const;
  const languages = list(root.languages, "languages", 50).map((entry, index): Language => {
    const path = `languages[${index}]`;
    const l = obj(entry, path, ["id", "languageCode", "customLanguageName", "overallLevel", "listeningLevel", "speakingLevel", "readingLevel", "writingLevel", "certificates"]); localId(l, path);
    const languageCode = str(l.languageCode, `${path}.languageCode`, 20);
    const customLanguageName = str(l.customLanguageName, `${path}.customLanguageName`, 160);
    if (!!languageCode === !!customLanguageName) invalid(path);
    const certificates = list(l.certificates, `${path}.certificates`, 50).map((entry, ci): Certificate => {
      const cp = `${path}.certificates[${ci}]`;
      const c = obj(entry, cp, ["id", "certificateTypeCode", "customCertificateName", "level", "overallScore", "scores", "issuedDate", "expiryDate", "issuer", "credentialId", "verificationUrl"]); localId(c, cp);
      const certificateTypeCode = str(c.certificateTypeCode, `${cp}.certificateTypeCode`, 120);
      const customCertificateName = str(c.customCertificateName, `${cp}.customCertificateName`, 180);
      if (!!certificateTypeCode === !!customCertificateName) invalid(cp);
      const scores = list(c.scores, `${cp}.scores`, 50).map((entry, si) => {
        const score = obj(entry, `${cp}.scores[${si}]`, ["id", "componentCode", "value"]); localId(score, `${cp}.scores[${si}]`);
        const value = str(score.value, `${cp}.scores[${si}].value`, 80, true)!;
        if (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) invalid(`${cp}.scores[${si}].value`);
        return [str(score.componentCode, `${cp}.scores[${si}].componentCode`, 80, true)!, Number(value)] as const;
      });
      if (new Set(scores.map(([code]) => code)).size !== scores.length) invalid(`${cp}.scores`);
      const issuedDate = date(c.issuedDate, `${cp}.issuedDate`);
      const expiryDate = date(c.expiryDate, `${cp}.expiryDate`);
      if (issuedDate && expiryDate && expiryDate < issuedDate) invalid(`${cp}.expiryDate`);
      const verificationUrl = str(c.verificationUrl, `${cp}.verificationUrl`, 1000);
      if (verificationUrl && !/^https?:\/\//i.test(verificationUrl)) invalid(`${cp}.verificationUrl`);
      return { certificateTypeCode, customCertificateName, level: str(c.level, `${cp}.level`, 120), overallScore: str(c.overallScore, `${cp}.overallScore`, 80), scores: scores.length ? Object.fromEntries(scores) : null, issuedDate, expiryDate, issuer: str(c.issuer, `${cp}.issuer`, 180), credentialId: str(c.credentialId, `${cp}.credentialId`, 180), verificationUrl };
    });
    return { languageCode, customLanguageName, overallLevel: upper(l.overallLevel, `${path}.overallLevel`, proficiency) as CandidateLanguageProficiency, listeningLevel: upper(l.listeningLevel, `${path}.listeningLevel`, proficiency) as CandidateLanguageProficiency, speakingLevel: upper(l.speakingLevel, `${path}.speakingLevel`, proficiency) as CandidateLanguageProficiency, readingLevel: upper(l.readingLevel, `${path}.readingLevel`, proficiency) as CandidateLanguageProficiency, writingLevel: upper(l.writingLevel, `${path}.writingLevel`, proficiency) as CandidateLanguageProficiency, certificates };
  });
  for (const [path, values] of [["skills", skills.map((s) => s.skillCode || s.customSkillName!.toLowerCase())], ["languages", languages.map((l) => l.languageCode || l.customLanguageName!.toLowerCase())]] as const) {
    if (new Set(values).size !== values.length) invalid(path);
  }

  const pref = obj(root.preferences, "preferences", ["desiredPositions", "preferredCategoryCodes", "locationPreference", "employmentTypes", "workplaceTypes", "salaryExpectation", "desiredCareerLevel", "availability", "willingToRelocate"]);
  const location = obj(pref.locationPreference, "preferences.locationPreference", ["mode", "provinceCodes"]);
  const salary = obj(pref.salaryExpectation, "preferences.salaryExpectation", ["type", "min", "max", "currency", "period"]);
  const availability = obj(pref.availability, "preferences.availability", ["type", "availableFrom"]);
  const locationMode = upper(location.mode, "preferences.locationPreference.mode", ["selected", "nationwide"] as const)! as ParsedCandidateDraft["preferences"]["locationMode"];
  const provinceCodes = strings(location.provinceCodes, "preferences.locationPreference.provinceCodes", 10);
  if (locationMode === "NATIONWIDE" && provinceCodes.length) invalid("preferences.locationPreference.provinceCodes");
  const salaryType = upper(salary.type, "preferences.salaryExpectation.type", ["range", "negotiable", "not-important"] as const)! as ParsedCandidateDraft["preferences"]["salaryType"];
  const salaryMin = nonnegative(salary.min, "preferences.salaryExpectation.min");
  const salaryMax = nonnegative(salary.max, "preferences.salaryExpectation.max");
  if ((salaryType !== "RANGE" && (salaryMin !== null || salaryMax !== null)) || (salaryType === "RANGE" && ((salaryMin === null) !== (salaryMax === null) || (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax)))) invalid("preferences.salaryExpectation");
  if (salary.currency !== "VND" || salary.period !== "month") invalid("preferences.salaryExpectation");
  const availabilityType = upper(availability.type, "preferences.availability.type", ["immediately", "specific-date"] as const, true) as ParsedCandidateDraft["preferences"]["availabilityType"];
  const availableFrom = date(availability.availableFrom, "preferences.availability.availableFrom");
  if ((availabilityType === "SPECIFIC_DATE") !== (availableFrom !== null)) invalid("preferences.availability");
  const preferences: ParsedCandidateDraft["preferences"] = {
    desiredPositions: strings(pref.desiredPositions, "preferences.desiredPositions", 180),
    preferredCategoryCodes: strings(pref.preferredCategoryCodes, "preferences.preferredCategoryCodes", 120),
    locationMode, provinceCodes,
    employmentTypes: strings(pref.employmentTypes, "preferences.employmentTypes", 20).map((value) => upper(value, "preferences.employmentTypes", employmentChoices) as CandidateEmploymentType),
    workplaceTypes: strings(pref.workplaceTypes, "preferences.workplaceTypes", 20).map((value) => upper(value, "preferences.workplaceTypes", workplaceChoices) as CandidateWorkplaceType),
    salaryType, salaryMin, salaryMax, currency: "VND", salaryPeriod: "MONTH",
    desiredCareerLevel: upper(pref.desiredCareerLevel, "preferences.desiredCareerLevel", ["intern", "fresher", "junior", "mid", "senior", "lead", "manager"] as const, true) as ParsedCandidateDraft["preferences"]["desiredCareerLevel"],
    availabilityType, availableFrom, willingToRelocate: bool(pref.willingToRelocate, "preferences.willingToRelocate"),
  };
  const resume = obj(root.resume, "resume", ["resumeName", "resumeUrl", "fileName", "fileSize", "mimeType", "hasExistingResume", "createLater"]);
  const hasResumeText = ["resumeName", "resumeUrl", "fileName", "mimeType"].map((key) => assetText(resume[key], `resume.${key}`)).some(Boolean);
  if (resume.fileSize !== null && (typeof resume.fileSize !== "number" || !Number.isSafeInteger(resume.fileSize) || resume.fileSize < 0)) invalid("resume.fileSize");
  const hasExistingResume = bool(resume.hasExistingResume, "resume.hasExistingResume");
  bool(resume.createLater, "resume.createLater");
  const privacy = obj(root.privacy, "privacy", ["searchableProfile", "showEmail", "showPhone", "allowResumeDownload", "allowJobMatching"]);
  const privacyValues = {
    searchableProfile: bool(privacy.searchableProfile, "privacy.searchableProfile"),
    showEmail: bool(privacy.showEmail, "privacy.showEmail"),
    showPhone: bool(privacy.showPhone, "privacy.showPhone"),
    allowResumeDownload: bool(privacy.allowResumeDownload, "privacy.allowResumeDownload"),
    allowJobMatching: bool(privacy.allowJobMatching, "privacy.allowJobMatching"),
  };
  const privacyDifferences = (Object.keys(CANDIDATE_IMPORT_PRIVACY_DEFAULTS) as CandidateImportPrivacyField[])
    .filter((field) => privacyValues[field] !== CANDIDATE_IMPORT_PRIVACY_DEFAULTS[field]);
  const unsupportedAssets: UnsupportedOnboardingAsset[] = [];
  if (hasAvatar) unsupportedAssets.push("avatar");
  if (hasResumeText || resume.fileSize !== null || hasExistingResume) unsupportedAssets.push("resume");
  return { personal, education, experience, skills, languages, preferences, unsupportedAssets, privacyDifferences };
}
