import type { SavedJobItem } from "./types";
import { isLiveWritesEnabled } from "../profile/config/candidateIntegrationConfig";
import { candidateSavedJobsApi } from "../../../services/api/candidateSavedJobsApi";
import { formatSalary } from "../../../services/api/apiTypes";

const STORAGE_PREFIX = "findwork_saved_jobs_";
const EVENT_NAME = "findwork:saved-jobs-changed";

function getStorageKey(userId: string | null | undefined): string {
  const safeId = userId && typeof userId === "string" && userId.trim() ? userId.trim() : "guest";
  return `${STORAGE_PREFIX}${safeId}`;
}

function migrateGuestSavedJobs(userId: string): void {
  if (typeof window === "undefined" || !userId || userId === "guest") return;
  try {
    const guestKey = `${STORAGE_PREFIX}guest`;
    const guestRaw = localStorage.getItem(guestKey);
    if (!guestRaw) return;
    const guestItems = JSON.parse(guestRaw);
    if (!Array.isArray(guestItems) || guestItems.length === 0) return;

    const userKey = `${STORAGE_PREFIX}${userId}`;
    const userRaw = localStorage.getItem(userKey);
    const userItems: SavedJobItem[] = userRaw ? JSON.parse(userRaw) : [];
    const existingIds = new Set(userItems.map((i) => String(i.id)));

    const merged = [...userItems];
    for (const item of guestItems) {
      if (item && item.id && !existingIds.has(String(item.id))) {
        merged.push(item);
        existingIds.add(String(item.id));
      }
    }
    localStorage.setItem(userKey, JSON.stringify(merged));
    localStorage.removeItem(guestKey);
  } catch {
    // Best-effort migration
  }
}

export const savedJobsService = {
  getSavedJobs(userId: string | null | undefined): SavedJobItem[] {
    if (userId && userId !== "guest") {
      migrateGuestSavedJobs(userId);
    }
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
        isAvailable: item.isAvailable ?? true,
        savedAt: new Date().toISOString(),
      };
      const updated = [newItem, ...list];
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { userId, jobId: item.id, action: "save" } }));

      // Nếu là UUID và live writes được bật, gọi API backend
      if (isLiveWritesEnabled() && typeof item.id === "string") {
        candidateSavedJobsApi.save(item.id).catch((err: { status?: number }) => {
          if (err.status !== 409) {
            // Không xóa local bookmark nếu gặp lỗi mạng đột xuất
          }
        });
      }

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

      // Nếu là UUID và live writes được bật, gọi API xóa backend
      if (isLiveWritesEnabled() && typeof jobId === "string") {
        candidateSavedJobsApi.remove(jobId).catch(() => {
          // Ignore removal error
        });
      }

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

  /**
   * Đồng bộ từ Backend khi live writes bật và người dùng đã xác thực.
   * Giữ lại mọi bookmark cục bộ chưa có trên server để chống mất mát dữ liệu (data loss).
   */
  async syncFromBackend(userId: string | null | undefined): Promise<void> {
    if (!userId || !isLiveWritesEnabled()) {
      return;
    }
    try {
      const paged = await candidateSavedJobsApi.list({ page: 1, pageSize: 100 });
      const remoteItems: SavedJobItem[] = paged.data.map((r) => {
        if (!r.isAvailable || !r.job) {
          return {
            id: r.jobId,
            title: "Tin tuyển dụng không còn khả dụng",
            company: "Doanh nghiệp",
            location: "Việt Nam",
            salary: "Không công bố",
            savedAt: r.savedAt,
            isAvailable: false,
            isMock: false,
          };
        }
        return {
          id: r.jobId,
          title: r.job.title,
          company: r.job.companyName || "Doanh nghiệp",
          location: "Việt Nam",
          salary: formatSalary(r.job),
          savedAt: r.savedAt,
          isAvailable: true,
          isMock: false,
        };
      });

      const key = getStorageKey(userId);
      const currentList = savedJobsService.getSavedJobs(userId);
      const remoteIdSet = new Set(remoteItems.map((r) => String(r.id)));

      // Bảo toàn các bookmark cục bộ (bao gồm cả mock và real jobs chưa kịp sync lên server)
      const preservedLocal: SavedJobItem[] = [];

      for (const item of currentList) {
        const idStr = String(item.id);
        if (remoteIdSet.has(idStr)) {
          continue; // Đã có trên remote
        }

        // Nếu là job thực tế (UUID) chưa có trên server, gửi request lưu lên backend
        if (!item.isMock && typeof item.id === "string") {
          try {
            await candidateSavedJobsApi.save(item.id);
          } catch {
            // Lưu thất bại hoặc mạng chập chờn: tiếp tục bảo toàn trong local để không mất bookmark
          }
        }

        preservedLocal.push(item);
      }

      const merged = [...remoteItems, ...preservedLocal];
      localStorage.setItem(key, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { userId, action: "sync" } }));
    } catch {
      // Fallback an toàn về local storage nếu offline: bảo toàn nguyên vẹn danh sách cục bộ
    }
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
