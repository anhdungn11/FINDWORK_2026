/**
 * FINDWORK — APPLICATION DRAFT SERVICE
 * 
 * Vị trí: src/features/applications/services/applicationDraftService.ts
 * Phạm vi: Lưu trữ cục bộ an toàn theo phiên (sessionStorage) cho wizard ứng tuyển.
 * 
 * NGUYÊN TẮC:
 * 1. Phân định chặt chẽ theo (userId, jobId): Không rò rỉ dữ liệu giữa các tài khoản.
 * 2. Bảo toàn trạng thái qua F5 refresh và điều hướng tiến/lùi giữa các bước.
 * 3. Tuyệt đối KHÔNG lưu access token, mật khẩu hoặc secrets trong draft storage.
 * 4. Xóa bản nháp khi nộp đơn thành công hoặc người dùng chủ động đặt lại.
 * 5. Phiên bản hóa cấu trúc (schema versioning), an toàn khi gặp dữ liệu lỗi thời.
 */

import type { ApplicationStep } from "../types/application.types";

export interface ApplicationDraftDetails {
  contact: {
    fullName: string;
    email: string;
    phone: string;
  };
  currentLocation: string;
  availability: string;
  preferredContactMethod: "email" | "phone";
  coverLetter: string;
}

export interface ApplicationDraftData {
  version: 1;
  jobId: string | number;
  userId: string | null;
  currentStep: ApplicationStep;
  selectedResumeId: string;
  selectedResumeVersionId?: string;
  details: ApplicationDraftDetails;
  screeningAnswers: Record<string, string>;
  savedAt: string;
}

const DRAFT_PREFIX = "findwork.app_draft.v1";

const buildStorageKey = (userId: string | null, jobId: string | number): string => {
  const safeUser = userId && userId.trim().length > 0 ? userId.trim() : "anon";
  return `${DRAFT_PREFIX}.${safeUser}.${String(jobId)}`;
};

const isObject = (val: unknown): val is Record<string, unknown> => {
  return typeof val === "object" && val !== null && !Array.isArray(val);
};

export const applicationDraftService = {
  getDraft(userId: string | null, jobId: string | number): ApplicationDraftData | null {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return null;
    }

    try {
      const key = buildStorageKey(userId, jobId);
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return null;

      const parsed: unknown = JSON.parse(raw);
      if (!isObject(parsed)) return null;

      if (parsed.version !== 1) {
        window.sessionStorage.removeItem(key);
        return null;
      }

      const expectedUser = userId && userId.trim().length > 0 ? userId.trim() : null;
      if (parsed.userId !== expectedUser || String(parsed.jobId) !== String(jobId)) {
        window.sessionStorage.removeItem(key);
        return null;
      }

      const detailsObj = isObject(parsed.details) ? parsed.details : {};
      const contactObj = isObject(detailsObj.contact) ? detailsObj.contact : {};

      const draft: ApplicationDraftData = {
        version: 1,
        jobId,
        userId: expectedUser,
        currentStep: typeof parsed.currentStep === "string" && ["resume", "details", "questions", "review"].includes(parsed.currentStep)
          ? (parsed.currentStep as ApplicationStep)
          : "resume",
        selectedResumeId: typeof parsed.selectedResumeId === "string" ? parsed.selectedResumeId : "",
        selectedResumeVersionId: typeof parsed.selectedResumeVersionId === "string" ? parsed.selectedResumeVersionId : undefined,
        details: {
          contact: {
            fullName: typeof contactObj.fullName === "string" ? contactObj.fullName : "",
            email: typeof contactObj.email === "string" ? contactObj.email : "",
            phone: typeof contactObj.phone === "string" ? contactObj.phone : "",
          },
          currentLocation: typeof detailsObj.currentLocation === "string" ? detailsObj.currentLocation : "",
          availability: typeof detailsObj.availability === "string" ? detailsObj.availability : "",
          preferredContactMethod: detailsObj.preferredContactMethod === "phone" ? "phone" : "email",
          coverLetter: typeof detailsObj.coverLetter === "string" ? detailsObj.coverLetter : "",
        },
        screeningAnswers: isObject(parsed.screeningAnswers)
          ? Object.fromEntries(
              Object.entries(parsed.screeningAnswers).filter(
                (entry): entry is [string, string] => typeof entry[1] === "string"
              )
            )
          : {},
        savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      };

      return draft;
    } catch {
      return null;
    }
  },

  saveDraft(userId: string | null, jobId: string | number, draft: Omit<ApplicationDraftData, "version" | "savedAt" | "jobId" | "userId">): void {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return;
    }

    try {
      const key = buildStorageKey(userId, jobId);
      const fullDraft: ApplicationDraftData = {
        ...draft,
        version: 1,
        jobId,
        userId: userId && userId.trim().length > 0 ? userId.trim() : null,
        savedAt: new Date().toISOString(),
      };
      window.sessionStorage.setItem(key, JSON.stringify(fullDraft));
    } catch {
      // Storage quota or privacy restriction safety
    }
  },

  clearDraft(userId: string | null, jobId: string | number): void {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return;
    }
    try {
      const key = buildStorageKey(userId, jobId);
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore sessionStorage removal error
    }
  },

  clearAllUserDrafts(userId: string): void {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return;
    }
    try {
      const targetPrefix = `${DRAFT_PREFIX}.${userId}.`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith(targetPrefix)) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // Ignore cleanup error
    }
  },
};
