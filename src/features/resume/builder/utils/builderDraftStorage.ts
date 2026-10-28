import type { ResumeBuilderContent, ResumeBuilderSettings, ResumeTemplateCode } from "../../types/resume.types";

export const DRAFT_PREFIX = "findwork.builder.draft";

export const getDraftKey = (userId: string | null | undefined, resumeId: string | null | undefined) =>
  `${DRAFT_PREFIX}.${userId ?? "anon"}.${resumeId ?? "new"}`;

export interface BuilderDraft {
  resumeName: string;
  templateCode: ResumeTemplateCode;
  content: ResumeBuilderContent;
  settings: ResumeBuilderSettings;
  savedAt: number;
}

export function saveBuilderDraft(
  userId: string | null | undefined,
  resumeId: string | null | undefined,
  draft: Omit<BuilderDraft, "savedAt">,
) {
  if (typeof window === "undefined") return;
  try {
    const key = getDraftKey(userId, resumeId);
    window.sessionStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Best effort
  }
}

export function loadBuilderDraft(
  userId: string | null | undefined,
  resumeId: string | null | undefined,
): BuilderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const key = getDraftKey(userId, resumeId);
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as BuilderDraft;
  } catch {
    return null;
  }
}

export function clearBuilderDraft(
  userId: string | null | undefined,
  resumeId: string | null | undefined,
) {
  if (typeof window === "undefined") return;
  try {
    const key = getDraftKey(userId, resumeId);
    window.sessionStorage.removeItem(key);
  } catch {
    // Best effort
  }
}
