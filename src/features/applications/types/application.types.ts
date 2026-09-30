import type {
  JobId,
} from "@/features/jobs/types/job.types";

export type ApplicationStep =
  | "resume"
  | "details"
  | "questions"
  | "review"
  | "success";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "offered"
  | "rejected"
  | "withdrawn";

export type ApplicationContactMethod =
  | "email"
  | "phone";

export type ApplicationAvailability =
  | "immediately"
  | "within-1-week"
  | "within-2-weeks"
  | "within-1-month"
  | "negotiable";

export interface ApplicationContactInfo {
  fullName: string;
  email: string;
  phone: string;
}

/**
 * State dùng trong form Step 2.
 * availability cho phép "" vì người dùng có thể chưa chọn.
 */
export interface ApplicationDetailsForm {
  contact: ApplicationContactInfo;

  currentLocation: string;

  availability:
    | ApplicationAvailability
    | "";

  preferredContactMethod:
    ApplicationContactMethod;

  coverLetter: string;
}

/**
 * Dữ liệu hợp lệ sau khi Step 2 hoàn tất.
 * availability lúc này bắt buộc phải có giá trị.
 */
export interface ApplicationDetails {
  contact: ApplicationContactInfo;

  currentLocation: string;

  availability: ApplicationAvailability;

  preferredContactMethod:
    ApplicationContactMethod;

  coverLetter: string;
}

export interface ApplicationDetailsErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  availability?: string;
}

export interface ApplicationScreeningAnswer {
  questionId: string;
  answer: string;
}

/**
 * Contract frontend gửi xuống Application service.
 *
 * Không phải Prisma model.
 * Không phải database entity.
 */
export interface CreateApplicationDraftInput {
  jobId: JobId;

  resumeId: string;

  /**
   * Application phải giữ đúng version CV
   * tại thời điểm ứng tuyển.
   */
  resumeVersionId: string;

  details: ApplicationDetails;

  answers: ApplicationScreeningAnswer[];
}

export interface ApplicationDraft
  extends CreateApplicationDraftInput {
  id: string;

  status: "draft";

  createdAt: string;
  updatedAt: string;
}

export interface SubmittedApplication {
  id: string;

  jobId: JobId;

  resumeId: string;
  resumeVersionId: string;

  details: ApplicationDetails;

  answers: ApplicationScreeningAnswer[];

  status: Exclude<
    ApplicationStatus,
    "draft"
  >;

  submittedAt: string;
}