export interface ResumeInfo {
  resumeName: string;
  resumeUrl: string;

  fileName: string;
  fileSize: number | null;
  mimeType: string;

  hasExistingResume: boolean;
  createLater: boolean;
}
