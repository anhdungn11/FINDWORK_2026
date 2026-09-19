export type ResumeSourceType = "uploaded" | "builder";
export type ResumeStatus = "ready" | "uploading" | "failed";
export type ResumeTemplateCode = "modern" | "minimal" | "professional" | "fresher";

export interface ResumeVersionFile {
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  previewUrl: string;
}

export interface ResumeBuilderExperienceItem {
  id: string;
  position: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}

export interface ResumeBuilderEducationItem {
  id: string;
  school: string;
  degree: string;
  major: string;
  startYear: string;
  endYear: string;
  description: string;
}

export interface ResumeBuilderContent {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  languages: string[];
  experience: ResumeBuilderExperienceItem[];
  education: ResumeBuilderEducationItem[];
}

export interface ResumeVersion {
  id: string;
  versionNumber: number;
  file: ResumeVersionFile | null;
  builderContent: ResumeBuilderContent | null;
  templateCode: ResumeTemplateCode | null;
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
}
