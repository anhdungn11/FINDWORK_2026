import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useApplicationData,
} from "@/features/applications/hooks/useApplicationData";

import {
  useApplicationDetails,
} from "@/features/applications/hooks/useApplicationDetails";

import type {
  ApplicationStep,
} from "@/features/applications/types/application.types";

interface UseApplicationFlowOptions {
  jobId: number;
}

/**
 * Orchestrator của Candidate Application Flow.
 *
 * Trách nhiệm:
 * - điều phối các step
 * - quản lý CV đang chọn
 * - kết nối application data với application details
 *
 * Không trực tiếp gọi service.
 * Không chứa validation implementation.
 * Không chứa Resume -> Application mapping.
 */
export const useApplicationFlow = ({
  jobId,
}: UseApplicationFlowOptions) => {
  const {
    job,
    resumes,
    isLoading,
    errorMessage,
  } = useApplicationData({
    jobId,
  });

  const {
    details,
    detailsErrors,
    canContinueDetails,
    updateContact,
    updateDetails,
    prefillFromResume,
    resetDetails,
  } = useApplicationDetails();

  const [
    selectedResumeId,
    setSelectedResumeId,
  ] = useState("");

  const [
    currentStep,
    setCurrentStep,
  ] = useState<ApplicationStep>(
    "resume",
  );

  /**
   * Một Application Flow mới phải bắt đầu lại
   * khi jobId thay đổi.
   *
   * Tránh giữ state của Job A khi chuyển trực tiếp
   * sang URL ứng tuyển Job B.
   */
  useEffect(() => {
    setCurrentStep("resume");
    setSelectedResumeId("");
    resetDetails();
  }, [
    jobId,
    resetDetails,
  ]);

  /**
   * Khi danh sách CV sẵn sàng:
   * - giữ CV hiện tại nếu vẫn tồn tại
   * - nếu chưa có thì chọn CV default
   * - nếu không có default thì lấy CV đầu tiên
   */
  useEffect(() => {
    if (resumes.length === 0) {
      setSelectedResumeId("");
      return;
    }

    setSelectedResumeId(
      (currentId) => {
        const currentStillExists =
          Boolean(currentId) &&
          resumes.some(
            (resume) =>
              resume.id === currentId,
          );

        if (currentStillExists) {
          return currentId;
        }

        const defaultResume =
          resumes.find(
            (resume) =>
              resume.isDefault,
          ) ??
          resumes[0];

        return defaultResume.id;
      },
    );
  }, [resumes]);

  const selectedResume =
    useMemo(
      () =>
        resumes.find(
          (resume) =>
            resume.id ===
            selectedResumeId,
        ) ?? null,
      [
        resumes,
        selectedResumeId,
      ],
    );

  /**
   * CV được chọn có thể prefill những field
   * Application còn trống.
   *
   * Mapper đảm bảo không ghi đè dữ liệu
   * ứng viên đã nhập.
   */
  useEffect(() => {
    if (!selectedResume) {
      return;
    }

    prefillFromResume(
      selectedResume,
    );
  }, [
    selectedResume,
    prefillFromResume,
  ]);

  const selectResume =
    useCallback(
      (
        resumeId: string,
      ) => {
        const exists =
          resumes.some(
            (resume) =>
              resume.id === resumeId,
          );

        if (!exists) {
          return;
        }

        setSelectedResumeId(
          resumeId,
        );
      },
      [resumes],
    );

  const goToStep =
    useCallback(
      (
        step: ApplicationStep,
      ) => {
        setCurrentStep(step);
      },
      [],
    );

  return {
    job,
    resumes,

    selectedResumeId,
    selectedResume,

    currentStep,

    details,
    detailsErrors,
    canContinueDetails,

    isLoading,
    errorMessage,

    selectResume,
    updateContact,
    updateDetails,
    goToStep,
  };
};