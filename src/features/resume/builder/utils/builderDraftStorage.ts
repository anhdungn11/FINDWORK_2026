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

/**
 * Controller to manage the lifecycle of builder draft auto-saving,
 * ensuring pending timers are cancelled on successful save and
 * unmount cleanup does NOT recreate a cleared draft.
 */
export class BuilderDraftSyncController {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isSaved = false;

  constructor(
    private getParams: () => {
      userId: string | null | undefined;
      resumeId: string | null | undefined;
      draft: Omit<BuilderDraft, "savedAt">;
    },
    private debounceMs = 300,
  ) {}

  public schedule(): void {
    if (this.isSaved) return;
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  public flush(): void {
    if (this.isSaved) return;
    const { userId, resumeId, draft } = this.getParams();
    saveBuilderDraft(userId, resumeId, draft);
  }

  public markSaved(): void {
    this.isSaved = true;
    this.cancelTimer();
    const { userId, resumeId } = this.getParams();
    clearBuilderDraft(userId, resumeId);
  }

  public markFailed(): void {
    this.isSaved = false;
    // Retain draft on failure
  }

  public cancelTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public teardown(): void {
    this.cancelTimer();
    if (!this.isSaved) {
      this.flush();
    }
  }

  public getIsSaved(): boolean {
    return this.isSaved;
  }
}
