import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("Employer Sprint Regression: EmployerLayout provides professional 2-group information architecture", () => {
  const layoutSrc = readFileSync(new URL("../../../layouts/EmployerLayout.tsx", import.meta.url), "utf8");

  // Main Workspace section
  assert.ok(layoutSrc.includes("Quy trình tuyển dụng"), "Must have Main Workspace group: Quy trình tuyển dụng");
  assert.ok(layoutSrc.includes('to="/employer"'), "Must link to /employer Overview");
  assert.ok(layoutSrc.includes('to="/employer/jobs"'), "Must link to /employer/jobs Jobs");
  assert.ok(layoutSrc.includes('to="/employer/applicants"'), "Must link to /employer/applicants Applicants");

  // Company Management section
  assert.ok(layoutSrc.includes("Quản trị doanh nghiệp"), "Must have Company Management group: Quản trị doanh nghiệp");
  assert.ok(layoutSrc.includes('to="/employer/profile"'), "Must link to /employer/profile Public brand");
  assert.ok(layoutSrc.includes('to="/employer/profile?tab=legal"'), "Must link to /employer/profile?tab=legal Legal verification");
  assert.ok(layoutSrc.includes('to="/employer/locations"'), "Must link to /employer/locations Locations");
  assert.ok(layoutSrc.includes('to="/employer/members"'), "Must link to /employer/members Internal members");
  assert.ok(layoutSrc.includes('to="/employer/members?tab=invitations"'), "Must link to /employer/members?tab=invitations Internal invitations");

  // Company Switcher & Header Identity
  assert.ok(layoutSrc.includes("companySelector"), "Must have company switcher/identity in header");
  assert.ok(layoutSrc.includes("viewPublicLink"), "Must have quick link to view public company page");
});

test("Employer Sprint Regression: EmployerJobsPage uses Vietnamese professional labels for statuses", () => {
  const jobsSrc = readFileSync(new URL("../../../pages/employer/EmployerJobsPage.tsx", import.meta.url), "utf8");

  assert.ok(jobsSrc.includes("Đang tuyển dụng"), "Status label must include 'Đang tuyển dụng'");
  assert.ok(jobsSrc.includes("Bản nháp"), "Status label must include 'Bản nháp'");
  assert.ok(jobsSrc.includes("Tạm dừng"), "Status label must include 'Tạm dừng'");
  assert.ok(jobsSrc.includes("Đã đóng tin"), "Status label must include 'Đã đóng tin'");

  // Must not expose raw DRAFT or PUBLISHED in user-facing option labels
  assert.ok(!jobsSrc.includes('<option key={s} value={s}>{s === "" ? "Tất cả" : s}</option>'), "Must not use raw technical enum values in select options");
});

test("Employer Sprint Regression: EmployerProfilePage separates Public Employer Brand from Private Legal Profile", () => {
  const profileSrc = readFileSync(new URL("../../../pages/employer/EmployerProfilePage.tsx", import.meta.url), "utf8");

  // Distinct tab sections
  assert.ok(profileSrc.includes("Thương hiệu tuyển dụng công khai"), "Must have tab for Public Brand");
  assert.ok(profileSrc.includes("Hồ sơ pháp lý & Xác minh"), "Must have tab for Private Legal Profile");

  // Legal verification API and guidance
  assert.ok(profileSrc.includes("companyWorkspaceApi.requestVerification"), "Must connect to requestVerification API");
  assert.ok(profileSrc.includes("canRequestVerification"), "Must enforce presence of legal name and tax code");
  assert.ok(profileSrc.includes("Bảo mật hồ sơ pháp lý"), "Must explicitly document legal profile confidentiality");

  // Truthful media note (no fake saves)
  assert.ok(profileSrc.includes("Lưu ý về định dạng nhận diện thương hiệu"), "Must document server media persistence state truthfully");
});

test("Employer Sprint Regression: EmployerJobFormPage organizes form into 5 logical recruitment sections", () => {
  const jobFormSrc = readFileSync(new URL("../../../pages/employer/EmployerJobFormPage.tsx", import.meta.url), "utf8");

  assert.ok(jobFormSrc.includes("1. Thông tin vị trí tuyển dụng"), "Must declare Section 1: Job Information");
  assert.ok(jobFormSrc.includes("2. Yêu cầu & Kinh nghiệm làm việc"), "Must declare Section 2: Requirements");
  assert.ok(jobFormSrc.includes("3. Mức lương & Chế độ đãi ngộ"), "Must declare Section 3: Salary and Terms");
  assert.ok(jobFormSrc.includes("4. Hạn nộp & Cài đặt công khai"), "Must declare Section 4: Publication Settings");
  assert.ok(jobFormSrc.includes("5. Bộ câu hỏi sàng lọc ứng viên"), "Must declare Section 5: Screening Questions");

  // Connected to real screening questions API
  assert.ok(jobFormSrc.includes("companyWorkspaceApi.replaceScreeningQuestions"), "Must call replaceScreeningQuestions API");
});

test("Employer Sprint Regression: EmployerMembersPage clearly distinguishes internal team invitations", () => {
  const membersSrc = readFileSync(new URL("../../../pages/employer/EmployerMembersPage.tsx", import.meta.url), "utf8");

  // Tab separation
  assert.ok(membersSrc.includes("Thành viên nội bộ & Phân quyền"), "Must have internal members tab");
  assert.ok(membersSrc.includes("Lời mời nội bộ & Cài đặt"), "Must have internal invitations tab");

  // Clarification notice
  assert.ok(
    membersSrc.includes("Phân biệt rõ Lời mời nội bộ với Lời mời phỏng vấn ứng viên"),
    "Must explicitly explain that team invitations are for workspace admin, not candidate interviews"
  );

  // APIs connected
  assert.ok(membersSrc.includes("companyWorkspaceApi.createInvitation"), "Must call createInvitation API");
  assert.ok(membersSrc.includes("companyWorkspaceApi.revokeInvitation"), "Must call revokeInvitation API");
  assert.ok(membersSrc.includes("companyWorkspaceApi.updateMemberRole"), "Must call updateMemberRole API");
  assert.ok(membersSrc.includes("companyWorkspaceApi.transferOwnership"), "Must call transferOwnership API");
});

test("Employer Sprint Regression: EmployerApplicantsPage connects real review workflow transitions", () => {
  const applicantsSrc = readFileSync(new URL("../../../pages/employer/EmployerApplicantsPage.tsx", import.meta.url), "utf8");

  assert.ok(applicantsSrc.includes("availableReviewTransitions"), "Must enforce availableReviewTransitions");
  assert.ok(applicantsSrc.includes("companyWorkspaceApi.reviewApplication"), "Must call reviewApplication API");
  assert.ok(applicantsSrc.includes("Mới nộp"), "Must display Vietnamese status for SUBMITTED");
  assert.ok(applicantsSrc.includes("Đang xem xét"), "Must display Vietnamese status for REVIEWING");
  assert.ok(applicantsSrc.includes("Sơ tuyển"), "Must display Vietnamese status for SHORTLISTED");
  assert.ok(applicantsSrc.includes("Phỏng vấn"), "Must display Vietnamese status for INTERVIEW");
  assert.ok(applicantsSrc.includes("Offer"), "Must display Vietnamese status for OFFERED");
});
