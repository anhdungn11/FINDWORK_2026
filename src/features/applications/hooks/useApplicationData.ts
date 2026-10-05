import {
  useEffect,
  useState,
} from "react";

import { jobService } from "@/features/jobs/services/jobService";

import type {
  JobRecord,
} from "@/features/jobs/types/job.types";

import { resumeService } from "@/features/resume/services/resumeService";

import type {
  Resume,
} from "@/features/resume/types/resume.types";

interface UseApplicationDataOptions {
  jobId: number;
}

/**
 * Data-loading layer của Application Flow.
 *
 * Hiện tại services đọc prototype/mock.
 * Sau này services có thể chuyển sang HTTP API mà
 * hook và UI không cần thay đổi contract.
 */
export const useApplicationData = ({
  jobId,
}: UseApplicationDataOptions) => {
  const [
    job,
    setJob,
  ] = useState<JobRecord | null>(
    null,
  );

  const [
    resumes,
    setResumes,
  ] = useState<Resume[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setJob(null);
      setResumes([]);
      setErrorMessage("");

      if (
        !Number.isInteger(jobId) ||
        jobId <= 0
      ) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [
          jobResult,
          resumeResult,
        ] = await Promise.all([
          jobService.getById(jobId),
          resumeService.list(),
        ]);

        if (!active) {
          return;
        }

        const readyResumes =
          resumeResult.filter(
            (resume: Resume) =>
              resume.status === "ready",
          );
        setJob(jobResult);
        setResumes(readyResumes);
      } catch {
        if (!active) {
          return;
        }

        setJob(null);
        setResumes([]);

        setErrorMessage(
          "Không thể tải dữ liệu ứng tuyển.",
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [jobId]);

  return {
    job,
    resumes,
    isLoading,
    errorMessage,
  };
};