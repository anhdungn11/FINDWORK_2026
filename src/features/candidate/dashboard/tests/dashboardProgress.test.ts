import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateDashboardProgress,
  formatCareerStatus,
  formatDashboardDate,
  formatUserRole,
  formatUserStatus,
  getCandidateDisplayName,
  normalizeStepIndex,
  TOTAL_ONBOARDING_STEPS,
} from "../utils/dashboardProgress";
import { INITIAL_ONBOARDING_DATA } from "../../utils/onboarding.constants";
import type { OnboardingDraft } from "../../services/onboardingDraft";

describe("Candidate Dashboard Progress Calculation", () => {
  it("handles null or undefined draft gracefully", () => {
    const result = calculateDashboardProgress(null);
    assert.equal(result.percent, 0);
    assert.equal(result.stepProgressPercent, 0);
    assert.equal(result.stepIndex, 0);
    assert.equal(result.stepNumber, 1);
    assert.equal(result.totalSteps, 7);
    assert.equal(result.category, "not_started");
    assert.equal(result.isAtFinalStep, false);
    assert.equal(result.isDraftCompleted, false);
    assert.equal(result.isOfficialProfile, false);
    assert.equal(result.updatedAt, null);
    assert.ok(result.statusLabel.includes("Chưa bắt đầu"));
  });

  it("calculates progress for intermediate draft step", () => {
    const draft: OnboardingDraft = {
      data: INITIAL_ONBOARDING_DATA,
      stepIndex: 2, // Step 3: Experience
      version: 1,
      updatedAt: "2026-10-13T10:00:00.000Z",
    };
    const result = calculateDashboardProgress(draft);
    assert.equal(result.stepIndex, 2);
    assert.equal(result.stepNumber, 3);
    assert.equal(result.percent, Math.round((3 / 7) * 100)); // 43%
    assert.equal(result.stepProgressPercent, Math.round((3 / 7) * 100));
    assert.equal(result.category, "in_progress");
    assert.equal(result.isAtFinalStep, false);
    assert.equal(result.isDraftCompleted, false);
    assert.equal(result.isOfficialProfile, false);
    assert.equal(result.stepTitle, "Kinh nghiệm");
    assert.ok(result.statusLabel.includes("3/7"));
    assert.equal(result.updatedAt, "2026-10-13T10:00:00.000Z");
  });

  it("calculates progress for final draft step and distinguishes from official profile", () => {
    const draft: OnboardingDraft = {
      data: INITIAL_ONBOARDING_DATA,
      stepIndex: 6, // Step 7: Privacy
      version: 5,
      updatedAt: "2026-10-13T12:00:00.000Z",
    };
    const result = calculateDashboardProgress(draft);
    assert.equal(result.stepIndex, 6);
    assert.equal(result.stepNumber, 7);
    assert.equal(result.percent, 100);
    assert.equal(result.stepProgressPercent, 100);
    assert.equal(result.category, "final_step");
    assert.equal(result.isAtFinalStep, true);
    assert.equal(result.isDraftCompleted, true);
    // CRITICAL: isOfficialProfile must remain false to prevent draft being called official profile
    assert.equal(result.isOfficialProfile, false);
    assert.ok(result.statusLabel.includes("chưa phải hồ sơ chính thức"));
  });

  it("normalizes and clamps out-of-range step indices", () => {
    assert.equal(normalizeStepIndex(-5), 0);
    assert.equal(normalizeStepIndex(100), TOTAL_ONBOARDING_STEPS - 1);
    assert.equal(normalizeStepIndex(NaN), 0);
    assert.equal(normalizeStepIndex("step" as unknown as number), 0);
    assert.equal(normalizeStepIndex(3.5), 0);
    assert.equal(normalizeStepIndex(4), 4);
  });

  it("resolves candidate display name accurately across account, profile, and draft without hardcoding", () => {
    // 1. Account name present takes highest priority
    assert.equal(
      getCandidateDisplayName("Nguyễn Văn A", "Nguyễn Draft", "Nguyễn Profile"),
      "Nguyễn Văn A",
    );
    // 2. Account name empty, profile name present
    assert.equal(
      getCandidateDisplayName("", "Nguyễn Draft", "Nguyễn Profile"),
      "Nguyễn Profile",
    );
    // 3. Account and profile empty, draft name present
    assert.equal(
      getCandidateDisplayName(undefined, "Trần Thị B", undefined),
      "Trần Thị B",
    );
    // 4. All empty or whitespace only: return empty string
    assert.equal(getCandidateDisplayName("   ", "   ", "   "), "");
    assert.equal(getCandidateDisplayName(undefined, undefined, undefined), "");
  });

  it("formats user role safely without hardcoding", () => {
    assert.equal(formatUserRole("CANDIDATE"), "Ứng viên (Candidate)");
    assert.equal(formatUserRole("EMPLOYER"), "Nhà tuyển dụng (Employer)");
    assert.equal(formatUserRole("ADMIN"), "Quản trị viên (Admin)");
    assert.equal(formatUserRole("CUSTOM_ROLE"), "CUSTOM_ROLE");
    assert.equal(formatUserRole(null), "");
    assert.equal(formatUserRole(undefined), "");
  });

  it("formats user status safely without assuming active state", () => {
    assert.equal(formatUserStatus("ACTIVE"), "Tài khoản đang hoạt động");
    assert.equal(formatUserStatus("PENDING"), "Chờ xác thực");
    assert.equal(formatUserStatus("SUSPENDED"), "Tài khoản bị tạm khóa");
    assert.equal(formatUserStatus("OTHER"), "OTHER");
    assert.equal(formatUserStatus(null), "");
    assert.equal(formatUserStatus(undefined), "");
  });

  it("formats career status accurately", () => {
    assert.equal(formatCareerStatus("OPEN_TO_OPPORTUNITIES"), "Sẵn sàng nhận cơ hội mới");
    assert.equal(formatCareerStatus("ACTIVELY_LOOKING"), "Đang tích cực tìm việc");
    assert.equal(formatCareerStatus(null), "Chưa thiết lập");
    assert.equal(formatCareerStatus(undefined), "Chưa thiết lập");
  });

  it("formats dashboard dates reliably in Vietnamese format", () => {
    const formatted = formatDashboardDate("2026-10-13T10:30:00.000Z");
    assert.ok(formatted.includes("2026"));
    assert.ok(formatted.includes("10"));
    assert.equal(formatDashboardDate(null), "Chưa cập nhật");
    assert.equal(formatDashboardDate("invalid-date"), "Chưa cập nhật");
  });
});
