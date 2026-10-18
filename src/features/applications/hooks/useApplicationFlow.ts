import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";

import {
  useApplicationData,
} from "@/features/applications/hooks/useApplicationData";

import {
  useApplicationDetails,
} from "@/features/applications/hooks/useApplicationDetails";

import {
  applicationDraftService,
} from "@/features/applications/services/applicationDraftService";

import { useAuthStore } from "@/store/authStore";

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
 * - Điều phối các step (1: resume, 2: details, 3: questions, 4: review)
 * - Quản lý CV đang chọn
 * - Kết nối application data với application details
 * - Lưu giữ trạng thái draft qua F5 refresh (sessionStorage phân vùng theo user + job)
 * - Tránh ghi đè dữ liệu người dùng khi thông tin CV tải bất đồng bộ
 */
export const useApplicationFlow = ({
  jobId,
}: UseApplicationFlowOptions) => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;

  // Khởi tạo draft ban đầu cho cặp (userId, jobId)
  const initialDraft = useMemo(() => {
    return applicationDraftService.getDraft(userId, jobId);
  }, [userId, jobId]);

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
    setAllDetails,
    resetDetails,
  } = useApplicationDetails({
    initialDetails: initialDraft?.details,
  });

  const [
    selectedResumeId,
    setSelectedResumeId,
  ] = useState<string>(() => initialDraft?.selectedResumeId ?? "");

  const [
    currentStep,
    setCurrentStep,
  ] = useState<ApplicationStep>(
    () => initialDraft?.currentStep ?? "resume",
  );

  const [
    screeningAnswers,
    setScreeningAnswers,
  ] = useState<Record<string, string>>(
    () => initialDraft?.screeningAnswers ?? {},
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const createdCvId = searchParams.get("createdCvId");

  /**
   * Đồng bộ lại state khi chuyển đổi giữa các Job IDs hoặc User IDs khác nhau.
   * Dùng ref so sánh để không bị re-run vòng lặp vô hạn ở mỗi lần render.
   */
  const prevContextRef = useRef({ jobId, userId });
  useEffect(() => {
    if (prevContextRef.current.jobId !== jobId || prevContextRef.current.userId !== userId) {
      prevContextRef.current = { jobId, userId };
      const existingDraft = applicationDraftService.getDraft(userId, jobId);
      if (existingDraft) {
        setCurrentStep(existingDraft.currentStep);
        setSelectedResumeId(existingDraft.selectedResumeId);
        setAllDetails(existingDraft.details);
        setScreeningAnswers(existingDraft.screeningAnswers);
      } else {
        setCurrentStep("resume");
        setSelectedResumeId("");
        resetDetails();
        setScreeningAnswers({});
      }
    }
  }, [jobId, userId, resetDetails, setAllDetails]);

  /**
   * Lưu draft tự động vào sessionStorage mỗi khi có thay đổi.
   */
  useEffect(() => {
    applicationDraftService.saveDraft(userId, jobId, {
      currentStep,
      selectedResumeId,
      details,
      screeningAnswers,
    });
  }, [userId, jobId, currentStep, selectedResumeId, details, screeningAnswers]);

  /**
   * Khi danh sách CV sẵn sàng:
   * 1. Ưu tiên createdCvId nếu vừa tạo CV mới thành công quay lại
   * 2. Giữ CV hiện tại nếu hợp lệ trong danh sách
   * 3. Giữ CV từ draft nếu hợp lệ trong danh sách
   * 4. Mặc định chọn CV default hoặc CV đầu tiên
   */
  useEffect(() => {
    if (resumes.length === 0) {
      setSelectedResumeId("");
      return;
    }

    if (createdCvId && resumes.some((resume) => resume.id === createdCvId)) {
      setSelectedResumeId(createdCvId);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("createdCvId");
      setSearchParams(nextParams, { replace: true });
      return;
    }

    setSelectedResumeId((currentId) => {
      const currentStillExists =
        Boolean(currentId) &&
        resumes.some((resume) => resume.id === currentId);

      if (currentStillExists) {
        return currentId;
      }

      const draft = applicationDraftService.getDraft(userId, jobId);
      if (draft?.selectedResumeId && resumes.some((resume) => resume.id === draft.selectedResumeId)) {
        return draft.selectedResumeId;
      }

      const defaultResume =
        resumes.find((resume) => resume.isDefault) ?? resumes[0];

      return defaultResume.id;
    });
  }, [resumes, createdCvId, searchParams, setSearchParams, userId, jobId]);

  const selectedResume = useMemo(
    () =>
      resumes.find(
        (resume) => resume.id === selectedResumeId,
      ) ?? null,
    [resumes, selectedResumeId],
  );

  /**
   * Prefill thông tin từ CV vào Application form:
   * Chỉ điền vào các trường còn trống, tuyệt đối không ghi đè dữ liệu người dùng đã nhập.
   */
  useEffect(() => {
    if (!selectedResume) {
      return;
    }

    prefillFromResume(selectedResume);
  }, [selectedResume, prefillFromResume]);

  const selectResume = useCallback(
    (resumeId: string) => {
      const exists = resumes.some((resume) => resume.id === resumeId);
      if (!exists) return;
      setSelectedResumeId(resumeId);
    },
    [resumes],
  );

  const goToStep = useCallback(
    (step: ApplicationStep) => {
      setCurrentStep(step);
    },
    [],
  );

  const updateScreeningAnswer = useCallback(
    (questionId: string, answer: string) => {
      setScreeningAnswers((current) => ({
        ...current,
        [questionId]: answer,
      }));
    },
    [],
  );

  const clearDraft = useCallback(() => {
    applicationDraftService.clearDraft(userId, jobId);
    resetDetails();
    setScreeningAnswers({});
    setCurrentStep("resume");
  }, [userId, jobId, resetDetails]);

  return {
    job,
    resumes,

    selectedResumeId,
    selectedResume,

    currentStep,

    details,
    detailsErrors,
    canContinueDetails,

    screeningAnswers,
    updateScreeningAnswer,

    isLoading,
    errorMessage,

    selectResume,
    updateContact,
    updateDetails,
    goToStep,
    clearDraft,
  };
};