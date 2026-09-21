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
      setResumes(await resumeService.list());
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
      setResumes(await resumeService.setDefaultResume(resumeId));
    } catch (defaultError) {
      setError(
        defaultError instanceof Error
          ? defaultError.message
          : "Không thể đặt CV mặc định.",
      );
    }
  }, []);

  const renameResume = useCallback(async (resumeId: string, name: string) => {
    setError("");

    try {
      setResumes(await resumeService.renameResume({ resumeId, name }));
      return true;
    } catch (renameError) {
      setError(
        renameError instanceof Error
          ? renameError.message
          : "Không thể đổi tên CV.",
      );
      return false;
    }
  }, []);

  const replaceResume = useCallback(async (resumeId: string, file: File) => {
    setError("");

    try {
      setResumes(await resumeService.replaceUploadedResume({ resumeId, file }));
      return true;
    } catch (replaceError) {
      setError(
        replaceError instanceof Error
          ? replaceError.message
          : "Không thể thay file CV.",
      );
      return false;
    }
  }, []);

  const deleteResume = useCallback(async (resumeId: string) => {
    setError("");

    try {
      setResumes(await resumeService.deleteResume(resumeId));
      return true;
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Không thể xóa CV.",
      );
      return false;
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
    renameResume,
    replaceResume,
    deleteResume,
    retry: loadResumes,
  };
};
