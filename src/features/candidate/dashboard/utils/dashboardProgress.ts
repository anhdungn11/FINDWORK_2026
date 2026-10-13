import { ONBOARDING_STEPS } from "../../utils/onboarding.constants";
import type { OnboardingDraft } from "../../services/onboardingDraft";
import type { DashboardProgressResult } from "../types/dashboard.types";

export const CANDIDATE_DASHBOARD_QUERY_KEYS = {
  all: (userId?: string) => ["candidate", "dashboard", userId ?? "anonymous"] as const,
  draft: (userId?: string) => ["candidate", "dashboard", userId ?? "anonymous", "draft"] as const,
  resumes: (userId?: string) => ["candidate", "dashboard", userId ?? "anonymous", "resumes"] as const,
  profile: (userId?: string) => ["candidate", "dashboard", userId ?? "anonymous", "profile"] as const,
};

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length; // 7

/**
 * Clamps stepIndex into a valid 0..TOTAL_ONBOARDING_STEPS-1 integer range.
 */
export function normalizeStepIndex(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    if (value < 0) return 0;
    if (value >= TOTAL_ONBOARDING_STEPS) return TOTAL_ONBOARDING_STEPS - 1;
    return value;
  }
  return 0;
}

/**
 * Calculates deterministic step position metrics from an onboarding draft.
 *
 * BUSINESS RULES:
 * - Being at step 7/7 (stepIndex === 6) represents current step position in the draft,
 *   NOT field completeness or official profile publication.
 * - isOfficialProfile is ALWAYS false for draft data.
 * - Labels explicitly state this is a step progress indicator.
 */
export function calculateDashboardProgress(
  draft: OnboardingDraft | null | undefined,
): DashboardProgressResult {
  if (!draft) {
    const firstStep = ONBOARDING_STEPS[0];
    return {
      stepIndex: 0,
      stepNumber: 1,
      totalSteps: TOTAL_ONBOARDING_STEPS,
      stepTitle: firstStep.title,
      stepDescription: firstStep.description,
      stepProgressPercent: 0,
      percent: 0,
      category: "not_started",
      statusLabel: "Chưa bắt đầu bản nháp Onboarding",
      isAtFinalStep: false,
      isDraftCompleted: false,
      isOfficialProfile: false,
      updatedAt: null,
    };
  }

  const validIndex = normalizeStepIndex(draft.stepIndex);
  const currentStep = ONBOARDING_STEPS[validIndex] ?? ONBOARDING_STEPS[0];
  const stepNumber = validIndex + 1;
  const isAtFinalStep = validIndex === TOTAL_ONBOARDING_STEPS - 1;
  const stepProgressPercent = Math.round((stepNumber / TOTAL_ONBOARDING_STEPS) * 100);

  return {
    stepIndex: validIndex,
    stepNumber,
    totalSteps: TOTAL_ONBOARDING_STEPS,
    stepTitle: currentStep.title,
    stepDescription: currentStep.description,
    stepProgressPercent,
    percent: stepProgressPercent,
    category: isAtFinalStep ? "final_step" : "in_progress",
    statusLabel: isAtFinalStep
      ? "Đang ở bước cuối Onboarding: 7/7 (Quyền riêng tư) — Bản nháp chưa phải hồ sơ chính thức"
      : `Vị trí bước Onboarding: ${stepNumber}/${TOTAL_ONBOARDING_STEPS} (${currentStep.title})`,
    isAtFinalStep,
    isDraftCompleted: isAtFinalStep,
    isOfficialProfile: false,
    updatedAt: draft.updatedAt || null,
  };
}

/**
 * Resolves user display name without inventing fake personas.
 * Priority: Authenticated account name -> Official profile name -> Draft personal name.
 */
export function getCandidateDisplayName(
  userFullName?: string | null,
  draftFullName?: string | null,
  profileFullName?: string | null,
): string {
  const accountName = (userFullName ?? "").trim();
  if (accountName.length > 0) return accountName;

  const profileName = (profileFullName ?? "").trim();
  if (profileName.length > 0) return profileName;

  const draftName = (draftFullName ?? "").trim();
  if (draftName.length > 0) return draftName;

  return "";
}

/**
 * Formats system role safely without hardcoding or assumptions.
 */
export function formatUserRole(role?: string | null): string {
  if (!role) return "";
  const normalized = role.trim().toUpperCase();
  if (normalized === "CANDIDATE") return "Ứng viên (Candidate)";
  if (normalized === "EMPLOYER") return "Nhà tuyển dụng (Employer)";
  if (normalized === "ADMIN") return "Quản trị viên (Admin)";
  return role.trim();
}

/**
 * Formats user account status safely without assuming active state.
 */
export function formatUserStatus(status?: string | null): string {
  if (!status) return "";
  const normalized = status.trim().toUpperCase();
  if (normalized === "ACTIVE") return "Tài khoản đang hoạt động";
  if (normalized === "PENDING" || normalized === "PENDING_VERIFICATION") return "Chờ xác thực";
  if (normalized === "SUSPENDED" || normalized === "BANNED") return "Tài khoản bị tạm khóa";
  return status.trim();
}

/**
 * Formats candidate career status enum safely.
 */
export function formatCareerStatus(status?: string | null): string {
  if (!status) return "Chưa thiết lập";
  const normalized = status.trim().toUpperCase();
  switch (normalized) {
    case "OPEN_TO_OPPORTUNITIES":
      return "Sẵn sàng nhận cơ hội mới";
    case "ACTIVELY_LOOKING":
      return "Đang tích cực tìm việc";
    case "CASUALLY_LOOKING":
      return "Đang cân nhắc cơ hội phù hợp";
    case "NOT_LOOKING":
      return "Chưa có nhu cầu tìm việc";
    default:
      return status;
  }
}

/**
 * Formats ISO date string to localized readable Vietnamese format.
 */
export function formatDashboardDate(dateString?: string | null): string {
  if (!dateString) return "Chưa cập nhật";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}
