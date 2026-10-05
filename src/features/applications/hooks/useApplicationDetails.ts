import {
  useCallback,
  useMemo,
  useState,
} from "react";

import type {
  ApplicationContactInfo,
  ApplicationDetailsForm,
} from "@/features/applications/types/application.types";

import {
  mergeResumePrefillIntoDetails,
} from "@/features/applications/utils/applicationResumeMapper";

import {
  validateApplicationDetails,
} from "@/features/applications/utils/applicationValidation";

import type {
  Resume,
} from "@/features/resume/types/resume.types";

const createInitialDetails =
  (): ApplicationDetailsForm => ({
    contact: {
      fullName: "",
      email: "",
      phone: "",
    },

    currentLocation: "",

    availability: "",

    preferredContactMethod:
      "email",

    coverLetter: "",
  });

/**
 * Quản lý riêng state + validation của Step 2.
 *
 * Không load dữ liệu.
 * Không điều hướng step.
 * Không gọi service.
 */
export const useApplicationDetails = () => {
  const [
    details,
    setDetails,
  ] = useState<ApplicationDetailsForm>(
    createInitialDetails,
  );

  const detailsErrors =
    useMemo(
      () =>
        validateApplicationDetails(
          details,
        ),
      [details],
    );

  /**
   * Không validate lần thứ hai.
   * Dùng kết quả đã tính ở detailsErrors.
   */
  const canContinueDetails =
    useMemo(
      () =>
        Object.keys(
          detailsErrors,
        ).length === 0,
      [detailsErrors],
    );

  const updateContact =
    useCallback(
      <
        Key extends keyof ApplicationContactInfo,
      >(
        field: Key,
        value:
          ApplicationContactInfo[Key],
      ) => {
        setDetails(
          (current) => ({
            ...current,

            contact: {
              ...current.contact,
              [field]: value,
            },
          }),
        );
      },
      [],
    );

  const updateDetails =
    useCallback(
      <
        Key extends keyof ApplicationDetailsForm,
      >(
        field: Key,
        value:
          ApplicationDetailsForm[Key],
      ) => {
        setDetails(
          (current) => ({
            ...current,
            [field]: value,
          }),
        );
      },
      [],
    );

  const prefillFromResume =
    useCallback(
      (
        resume: Resume | null,
      ) => {
        setDetails(
          (current) =>
            mergeResumePrefillIntoDetails(
              current,
              resume,
            ),
        );
      },
      [],
    );

  const resetDetails =
    useCallback(() => {
      setDetails(
        createInitialDetails(),
      );
    }, []);

  return {
    details,
    detailsErrors,
    canContinueDetails,

    updateContact,
    updateDetails,
    prefillFromResume,
    resetDetails,
  };
};