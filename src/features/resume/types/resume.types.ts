export type ResumeSourceType = "uploaded" | "builder";
export type ResumeStatus = "ready" | "uploading" | "failed";
export type ResumeTemplateCode = "classic" | "minimal" | "modern" | "corporate" | "creative";

export type ResumeSectionId =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "certifications"
  | "projects"
  | "awards"
  | "activities"
  | "volunteering"
  | "references"
  | "custom";

export type ResumeBuilderEditorSection = "basics" | ResumeSectionId | "design";
export type ResumeFontFamily = "sans" | "humanist" | "serif";
export type ResumeDensity = "compact" | "balanced" | "spacious";
export type ResumeAccentColor = "ink" | "navy" | "blue" | "emerald" | "burgundy" | "sand";
export type ResumeIndustryPreset =
  | "general"
  | "business"
  | "finance"
  | "people"
  | "marketing"
  | "technical"
  | "operations"
  | "education"
  | "healthcare"
  | "service"
  | "creative"
  | "legal"
  | "other";

export interface ResumeVersionFile {
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  previewUrl: string;
}

export interface ResumeBuilderLinkItem {
  id: string;
  label: string;
  url: string;
}

export interface ResumeBuilderExperienceItem {
  id: string;
  position: string;
  company: string;
  location: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  highlights: string[];
}

export interface ResumeBuilderEducationItem {
  id: string;
  school: string;
  degree: string;
  major: string;
  location: string;
  startYear: string;
  endYear: string;
  isStudying: boolean;
  gpa: string;
  highlights: string[];
}

export interface ResumeBuilderProjectItem {
  id: string;
  name: string;
  role: string;
  organization: string;
  link: string;
  startDate: string;
  endDate: string;
  tags: string[];
  highlights: string[];
}

export interface ResumeBuilderSkillGroup {
  id: string;
  name: string;
  skills: string[];
}

export interface ResumeBuilderLanguageItem {
  id: string;
  name: string;
  level: string;
  certificate: string;
}

export interface ResumeBuilderCertificationItem {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  credentialId: string;
  credentialUrl: string;
}

export interface ResumeBuilderAwardItem {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description: string;
}

export interface ResumeBuilderActivityItem {
  id: string;
  name: string;
  role: string;
  organization: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ResumeBuilderVolunteerItem {
  id: string;
  role: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ResumeBuilderReferenceItem {
  id: string;
  name: string;
  position: string;
  organization: string;
  email: string;
  phone: string;
  note: string;
}

export interface ResumeBuilderCustomItem {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  description: string;
}

export interface ResumeBuilderCustomSection {
  id: string;
  title: string;
  items: ResumeBuilderCustomItem[];
}

export interface ResumeBuilderContent {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  links: ResumeBuilderLinkItem[];
  photoDataUrl: string;
  summary: string;
  experience: ResumeBuilderExperienceItem[];
  education: ResumeBuilderEducationItem[];
  skills: ResumeBuilderSkillGroup[];
  languages: ResumeBuilderLanguageItem[];
  certifications: ResumeBuilderCertificationItem[];
  projects: ResumeBuilderProjectItem[];
  awards: ResumeBuilderAwardItem[];
  activities: ResumeBuilderActivityItem[];
  volunteering: ResumeBuilderVolunteerItem[];
  references: ResumeBuilderReferenceItem[];
  customSections: ResumeBuilderCustomSection[];
}

export interface ResumeBuilderSettings {
  accentColor: ResumeAccentColor;
  fontFamily: ResumeFontFamily;
  density: ResumeDensity;
  showPhoto: boolean;
  industryPreset: ResumeIndustryPreset;
  sectionOrder: ResumeSectionId[];
  hiddenSections: ResumeSectionId[];
}

export interface ResumeVersion {
  id: string;
  versionNumber: number;
  file: ResumeVersionFile | null;
  builderContent: ResumeBuilderContent | null;
  templateCode: ResumeTemplateCode | null;
  builderSettings: ResumeBuilderSettings | null;
  createdAt: string;
}

export interface Resume {
  id: string;
  name: string;
  sourceType: ResumeSourceType;
  isDefault: boolean;
  status: ResumeStatus;
  currentVersion: ResumeVersion;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUploadedResumeInput {
  name: string;
  file: File;
}

export interface CreateBuilderResumeInput {
  name: string;
  templateCode: ResumeTemplateCode;
  content: ResumeBuilderContent;
  settings: ResumeBuilderSettings;
}

export interface RenameResumeInput {
  resumeId: string;
  name: string;
}

export interface ReplaceUploadedResumeInput {
  resumeId: string;
  file: File;
}

export interface UpdateBuilderResumeInput extends CreateBuilderResumeInput {
  resumeId: string;
}
