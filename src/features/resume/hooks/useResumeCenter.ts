import { useCallback, useEffect, useMemo, useState } from "react";

import { resumeService } from "@/features/resume/services/resumeService";
import type { Resume } from "@/features/resume/types/resume.types";
import { MAX_RESUME_COUNT } from "@/features/resume/utils/resume.utils";

export const useResumeCenter = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadResumes = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const items = await resumeService.list();
      setResumes(items);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải danh sách CV.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResumes();
  }, [loadResumes]);

  const addResume = useCallback(async (file: File, name: string) => {
    setError("");

    try {
      await resumeService.createUploadedResume({ file, name });
      const items = await resumeService.list();
      setResumes(items);
      return true;
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Không thể thêm CV.",
      );
      return false;
    }
  }, []);

  const setDefaultResume = useCallback(async (resumeId: string) => {
    setError("");

    try {
      const items = await resumeService.setDefaultResume(resumeId);
      setResumes(items);
    } catch (defaultError) {
      setError(
        defaultError instanceof Error
          ? defaultError.message
          : "Không thể đặt CV mặc định.",
      );
    }
  }, []);

  const canAddResume = resumes.length < MAX_RESUME_COUNT;

  const defaultResume = useMemo(
    () => resumes.find((resume) => resume.isDefault) ?? null,
    [resumes],
  );

  return {
    resumes,
    defaultResume,
    isLoading,
    error,
    canAddResume,
    maxResumeCount: MAX_RESUME_COUNT,
    addResume,
    setDefaultResume,
    retry: loadResumes,
  };
};
