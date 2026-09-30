import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ApplicationContactInfo,
  ApplicationDetailsForm,
  ApplicationStep,
} from "@/features/applications/types/application.types";

import {
  isApplicationDetailsValid,
  validateApplicationDetails,
} from "@/features/applications/utils/applicationValidation";

import { jobService } from "@/features/jobs/services/jobService";
import type {
  JobRecord,
} from "@/features/jobs/types/job.types";

import { resumeService } from "@/features/resume/services/resumeService";
import type {
  Resume,
} from "@/features/resume/types/resume.types";

interface UseApplicationFlowOptions {
  jobId: number;
}

const INITIAL_DETAILS:
  ApplicationDetailsForm = {
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
};

const getResumeContactData = (
  resume: Resume | null,
) => {
  const content =
    resume?.currentVersion
      .builderContent;

  if (!content) {
    return null;
  }

  return {
    fullName:
      content.fullName.trim(),

    email:
      content.email.trim(),

    phone:
      content.phone.trim(),

    location:
      content.location.trim(),
  };
};

export const useApplicationFlow = ({
  jobId,
}: UseApplicationFlowOptions) => {
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
    selectedResumeId,
    setSelectedResumeId,
  ] = useState("");

  const [
    currentStep,
    setCurrentStep,
  ] = useState<ApplicationStep>(
    "resume",
  );

  const [
    details,
    setDetails,
  ] = useState<ApplicationDetailsForm>(
    INITIAL_DETAILS,
  );

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

    const loadApplicationData =
      async () => {
        try {
          setIsLoading(true);

          setErrorMessage("");

          const [
            jobResult,
            resumeResult,
          ] = await Promise.all([
            jobService.getById(
              jobId,
            ),

            resumeService.list(),
          ]);

          if (!active) {
            return;
          }

          setJob(jobResult);

          const readyResumes =
            resumeResult.filter(
              (resume) =>
                resume.status ===
                "ready",
            );

          setResumes(
            readyResumes,
          );

          const defaultResume =
            readyResumes.find(
              (resume) =>
                resume.isDefault,
            ) ??
            readyResumes[0] ??
            null;

          setSelectedResumeId(
            defaultResume?.id ??
              "",
          );

          const resumeData =
            getResumeContactData(
              defaultResume,
            );

          if (resumeData) {
            setDetails(
              (current) => ({
                ...current,

                contact: {
                  fullName:
                    current.contact
                      .fullName ||
                    resumeData.fullName,

                  email:
                    current.contact
                      .email ||
                    resumeData.email,

                  phone:
                    current.contact
                      .phone ||
                    resumeData.phone,
                },

                currentLocation:
                  current
                    .currentLocation ||
                  resumeData.location,
              }),
            );
          }
        } catch {
          if (!active) {
            return;
          }

          setErrorMessage(
            "Không thể tải dữ liệu ứng tuyển.",
          );
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      };

    void loadApplicationData();

    return () => {
      active = false;
    };
  }, [jobId]);

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

  const detailsErrors =
    useMemo(
      () =>
        validateApplicationDetails(
          details,
        ),
      [details],
    );

  const canContinueDetails =
    useMemo(
      () =>
        isApplicationDetailsValid(
          details,
        ),
      [details],
    );

  const selectResume = (
    resumeId: string,
  ) => {
    setSelectedResumeId(
      resumeId,
    );

    const resume =
      resumes.find(
        (item) =>
          item.id === resumeId,
      ) ?? null;

    const resumeData =
      getResumeContactData(
        resume,
      );

    if (!resumeData) {
      return;
    }

    setDetails(
      (current) => ({
        ...current,

        contact: {
          fullName:
            current.contact
              .fullName ||
            resumeData.fullName,

          email:
            current.contact.email ||
            resumeData.email,

          phone:
            current.contact.phone ||
            resumeData.phone,
        },

        currentLocation:
          current.currentLocation ||
          resumeData.location,
      }),
    );
  };

  const updateContact = <
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
  };

  const updateDetails = <
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
  };

  const goToStep = (
    step: ApplicationStep,
  ) => {
    setCurrentStep(step);
  };

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