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

export const createInitialDetails = (
  initial?: Partial<ApplicationDetailsForm>,
): ApplicationDetailsForm => ({
  contact: {
    fullName: initial?.contact?.fullName ?? "",
    email: initial?.contact?.email ?? "",
    phone: initial?.contact?.phone ?? "",
  },
  currentLocation: initial?.currentLocation ?? "",
  availability: initial?.availability ?? "",
  preferredContactMethod: initial?.preferredContactMethod ?? "email",
  coverLetter: initial?.coverLetter ?? "",
});

export interface UseApplicationDetailsOptions {
  initialDetails?: ApplicationDetailsForm;
  onDetailsChange?: (details: ApplicationDetailsForm) => void;
}

/**
 * Quản lý riêng state + validation của Step 2 (Application Details).
 * Hỗ trợ rehydrate từ bản nháp (draft) và đồng bộ khi có thay đổi.
 */
export const useApplicationDetails = (
  options?: UseApplicationDetailsOptions,
) => {
  const [details, setDetails] = useState<ApplicationDetailsForm>(
    () => options?.initialDetails ?? createInitialDetails(),
  );

  const detailsErrors = useMemo(
    () => validateApplicationDetails(details),
    [details],
  );

  const canContinueDetails = useMemo(
    () => Object.keys(detailsErrors).length === 0,
    [detailsErrors],
  );

  const updateContact = useCallback(
    <Key extends keyof ApplicationContactInfo>(
      field: Key,
      value: ApplicationContactInfo[Key],
    ) => {
      setDetails((current) => {
        const next: ApplicationDetailsForm = {
          ...current,
          contact: {
            ...current.contact,
            [field]: value,
          },
        };
        options?.onDetailsChange?.(next);
        return next;
      });
    },
    [options],
  );

  const updateDetails = useCallback(
    <Key extends keyof ApplicationDetailsForm>(
      field: Key,
      value: ApplicationDetailsForm[Key],
    ) => {
      setDetails((current) => {
        const next: ApplicationDetailsForm = {
          ...current,
          [field]: value,
        };
        options?.onDetailsChange?.(next);
        return next;
      });
    },
    [options],
  );

  const prefillFromResume = useCallback(
    (resume: Resume | null) => {
      setDetails((current) => {
        const next = mergeResumePrefillIntoDetails(current, resume);
        options?.onDetailsChange?.(next);
        return next;
      });
    },
    [options],
  );

  const setAllDetails = useCallback(
    (newDetails: ApplicationDetailsForm) => {
      setDetails(newDetails);
      options?.onDetailsChange?.(newDetails);
    },
    [options],
  );

  const resetDetails = useCallback(() => {
    const initial = createInitialDetails();
    setDetails(initial);
    options?.onDetailsChange?.(initial);
  }, [options]);

  return {
    details,
    detailsErrors,
    canContinueDetails,
    updateContact,
    updateDetails,
    prefillFromResume,
    setAllDetails,
    resetDetails,
  };
};