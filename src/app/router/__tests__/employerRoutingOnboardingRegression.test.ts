import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { canManageJobs, canReviewApplications, formatCompanyRole } from "../../../features/company/companyWorkspacePermissions";

describe("Employer Routing & Onboarding Regression", () => {
  it("RoleRoute redirects unauthenticated employer requests to /employer/login", () => {
    const roleRouteSrc = readFileSync(new URL("../../guards/RoleRoute.tsx", import.meta.url), "utf8");
    assert.ok(
      roleRouteSrc.includes('kind === "employer" ? "/employer/login" : "/login"'),
      "RoleRoute must redirect unauthenticated employer requests to /employer/login to preserve employer context"
    );
  });

  it("CompanyWorkspaceContext rehydrates and persists active company selection across refreshes", () => {
    const contextSrc = readFileSync(new URL("../../../features/company/CompanyWorkspaceContext.tsx", import.meta.url), "utf8");
    assert.ok(
      contextSrc.includes("findwork_active_company_id"),
      "CompanyWorkspaceContext must use storage key findwork_active_company_id"
    );
    assert.ok(
      contextSrc.includes('Navigate to="/employer/onboarding" replace'),
      "Empty company membership must redirect to /employer/onboarding"
    );
  });

  it("canManageJobs authorizes recruitment roles and blocks read-only VIEWER and HIRING_MANAGER", () => {
    // Authorized roles
    assert.equal(canManageJobs(["OWNER"]), true);
    assert.equal(canManageJobs(["COMPANY_OWNER"]), true);
    assert.equal(canManageJobs(["ADMIN"]), true);
    assert.equal(canManageJobs(["HR_MANAGER"]), true);
    assert.equal(canManageJobs(["RECRUITER"]), true);
    assert.equal(canManageJobs(["VIEWER", "RECRUITER"]), true);

    // Unauthorized roles (including HIRING_MANAGER per backend company-roles.ts)
    assert.equal(canManageJobs(["HIRING_MANAGER"]), false);
    assert.equal(canManageJobs(["VIEWER"]), false);
    assert.equal(canManageJobs([]), false);
    assert.equal(canManageJobs(null), false);
    assert.equal(canManageJobs(undefined), false);
    assert.equal(canManageJobs(["UNKNOWN_ROLE"]), false);

    // canReviewApplications authorizes recruiters/managers and blocks HIRING_MANAGER/VIEWER
    assert.equal(canReviewApplications(["OWNER"]), true);
    assert.equal(canReviewApplications(["ADMIN"]), true);
    assert.equal(canReviewApplications(["HR_MANAGER"]), true);
    assert.equal(canReviewApplications(["RECRUITER"]), true);
    assert.equal(canReviewApplications(["HIRING_MANAGER"]), false);
    assert.equal(canReviewApplications(["VIEWER"]), false);
  });

  it("formatCompanyRole maps roles to clear Vietnamese UI labels", () => {
    assert.equal(formatCompanyRole("OWNER"), "Chủ sở hữu");
    assert.equal(formatCompanyRole("COMPANY_OWNER"), "Chủ sở hữu");
    assert.equal(formatCompanyRole("ADMIN"), "Quản trị viên");
    assert.equal(formatCompanyRole("HR_MANAGER"), "Trưởng phòng nhân sự");
    assert.equal(formatCompanyRole("RECRUITER"), "Chuyên viên tuyển dụng");
    assert.equal(formatCompanyRole("HIRING_MANAGER"), "Quản lý tuyển dụng");
    assert.equal(formatCompanyRole("VIEWER"), "Người xem");
  });

  it("EmployerJobFormPage blocks unauthorized members with in-workspace denied state, not silent candidate fallback", () => {
    const jobFormSrc = readFileSync(new URL("../../../pages/employer/EmployerJobFormPage.tsx", import.meta.url), "utf8");
    assert.ok(
      jobFormSrc.includes("canManageJobs(active.memberRoleNames)"),
      "EmployerJobFormPage must check canManageJobs"
    );
    assert.ok(
      jobFormSrc.includes('data-testid="job-permission-denied"'),
      "EmployerJobFormPage must render data-testid='job-permission-denied' for insufficient role"
    );
    assert.ok(
      jobFormSrc.includes("Bạn không có quyền đăng hoặc sửa tin tuyển dụng"),
      "Must show Vietnamese access denied title"
    );
    assert.ok(
      jobFormSrc.includes('to="/employer/jobs"'),
      "Access denied screen must offer navigation back to /employer/jobs"
    );
    assert.ok(
      !jobFormSrc.includes('<Navigate to="/candidate'),
      "EmployerJobFormPage must NEVER silently dump employer users into candidate routes"
    );
  });

  it("EmployerOnboardingPage provides navigation shell, identity context, and read-only exit options", () => {
    const onboardingSrc = readFileSync(new URL("../../../pages/employer/EmployerOnboardingPage.tsx", import.meta.url), "utf8");
    assert.ok(
      onboardingSrc.includes('data-testid="onboarding-account-status"'),
      "Must render current account status section"
    );
    assert.ok(
      onboardingSrc.includes('data-testid="onboarding-writes-disabled-notice"'),
      "Must render explicit notice and safe exits when writes are disabled"
    );
    assert.ok(
      onboardingSrc.includes('to="/candidate"'),
      "Must provide explicit safe navigation link to Candidate workspace"
    );
    assert.ok(
      onboardingSrc.includes('to="/"'),
      "Must provide explicit safe navigation link to Home"
    );
    assert.ok(
      onboardingSrc.includes("handleSwitchAccount"),
      "Must provide action to switch or log in with another account"
    );
    assert.ok(
      !onboardingSrc.includes("VITE_ENABLE_WORKSPACE_WRITES"),
      "Must not expose raw developer environment variables in UI"
    );

    const formSrc = readFileSync(
      new URL("../../../features/company/components/CompanyRegistrationOnboarding.tsx", import.meta.url),
      "utf8"
    );
    assert.ok(
      !formSrc.includes('role="note"'),
      "CompanyRegistrationOnboarding must not render duplicate warning banner"
    );
  });

  it("AccountDropdown preserves coherent role context and avoids accidental lock-in", () => {
    const dropdownSrc = readFileSync(
      new URL("../../../components/navigation/Header/components/AccountDropdown.tsx", import.meta.url),
      "utf8"
    );
    assert.ok(
      dropdownSrc.includes('to="/employer"'),
      "AccountDropdown must provide link to /employer workspace"
    );
    assert.ok(
      dropdownSrc.includes('location.pathname.startsWith("/employer")'),
      "AccountDropdown must be context-aware regarding employer vs candidate"
    );
  });

  it("EmployerLayout topbar and EmployerJobsPage conditionally hide 'Đăng tin mới' for VIEWER roles", () => {
    const layoutSrc = readFileSync(new URL("../../../layouts/EmployerLayout.tsx", import.meta.url), "utf8");
    assert.ok(
      layoutSrc.includes("canManageJobs(active?.memberRoleNames)"),
      "EmployerLayout topbar must conditionally render post job button based on canManageJobs"
    );

    const jobsPageSrc = readFileSync(new URL("../../../pages/employer/EmployerJobsPage.tsx", import.meta.url), "utf8");
    assert.ok(
      jobsPageSrc.includes("canManageJobs(active.memberRoleNames)"),
      "EmployerJobsPage must conditionally render new job action based on canManageJobs"
    );
  });
});
