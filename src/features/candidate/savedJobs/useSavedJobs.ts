import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { isLiveWritesEnabled } from "@/features/candidate/profile/config/candidateIntegrationConfig";
import { savedJobsService } from "./savedJobsService";
import type { SavedJobItem } from "./types";

export const useSavedJobs = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;

  const [savedJobs, setSavedJobs] = useState<SavedJobItem[]>(() =>
    savedJobsService.getSavedJobs(userId),
  );

  const refresh = useCallback(() => {
    setSavedJobs(savedJobsService.getSavedJobs(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
    const unsubscribe = savedJobsService.onSavedJobsChanged(refresh);
    return unsubscribe;
  }, [refresh]);

  useEffect(() => {
    if (userId && isLiveWritesEnabled()) {
      void savedJobsService.syncFromBackend(userId);
    }
  }, [userId]);

  const isSaved = useCallback(
    (jobId: string | number) => savedJobsService.isSaved(userId, jobId),
    [userId, savedJobs],
  );

  const toggleSave = useCallback(
    (item: Omit<SavedJobItem, "savedAt">) => {
      const result = savedJobsService.toggleSave(userId, item);
      refresh();
      return result;
    },
    [userId, refresh],
  );

  const unsaveJob = useCallback(
    (jobId: string | number) => {
      const result = savedJobsService.unsaveJob(userId, jobId);
      refresh();
      return result;
    },
    [userId, refresh],
  );

  return {
    savedJobs,
    savedCount: savedJobs.length,
    isSaved,
    toggleSave,
    unsaveJob,
    refresh,
    userId,
  };
};
