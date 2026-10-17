import type { SavedJobItem } from "./types";

const STORAGE_PREFIX = "findwork_saved_jobs_";
const EVENT_NAME = "findwork:saved-jobs-changed";

function getStorageKey(userId: string | null | undefined): string {
  const safeId = userId && typeof userId === "string" && userId.trim() ? userId.trim() : "guest";
  return `${STORAGE_PREFIX}${safeId}`;
}

export const savedJobsService = {
  getSavedJobs(userId: string | null | undefined): SavedJobItem[] {
    try {
      const key = getStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is SavedJobItem => Boolean(item && item.id && item.title));
      }
      return [];
    } catch {
      return [];
    }
  },

  isSaved(userId: string | null | undefined, jobId: string | number): boolean {
    const list = savedJobsService.getSavedJobs(userId);
    const target = String(jobId);
    return list.some((item) => String(item.id) === target);
  },

  saveJob(userId: string | null | undefined, item: Omit<SavedJobItem, "savedAt">): boolean {
    try {
      const key = getStorageKey(userId);
      const list = savedJobsService.getSavedJobs(userId);
      const target = String(item.id);
      if (list.some((existing) => String(existing.id) === target)) {
        return false;
      }
      const newItem: SavedJobItem = {
        ...item,
        savedAt: new Date().toISOString(),
      };
      const updated = [newItem, ...list];
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { userId, jobId: item.id, action: "save" } }));
      return true;
    } catch {
      return false;
    }
  },

  unsaveJob(userId: string | null | undefined, jobId: string | number): boolean {
    try {
      const key = getStorageKey(userId);
      const list = savedJobsService.getSavedJobs(userId);
      const target = String(jobId);
      const updated = list.filter((item) => String(item.id) !== target);
      if (updated.length === list.length) {
        return false;
      }
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { userId, jobId, action: "unsave" } }));
      return true;
    } catch {
      return false;
    }
  },

  toggleSave(userId: string | null | undefined, item: Omit<SavedJobItem, "savedAt">): boolean {
    if (savedJobsService.isSaved(userId, item.id)) {
      savedJobsService.unsaveJob(userId, item.id);
      return false; // now unsaved
    } else {
      savedJobsService.saveJob(userId, item);
      return true; // now saved
    }
  },

  getSavedCount(userId: string | null | undefined): number {
    return savedJobsService.getSavedJobs(userId).length;
  },

  onSavedJobsChanged(callback: () => void): () => void {
    const handler = () => callback();
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  },
};
