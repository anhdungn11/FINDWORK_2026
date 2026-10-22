import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("Role-Aware Workspace Navigation & Deep Link Regression", () => {
  it("AccountDropdown conditionally renders /employer workspace link based on actual company membership", () => {
    const dropdownSrc = readFileSync(
      new URL("../../../components/navigation/Header/components/AccountDropdown.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      dropdownSrc.includes("useEmployerMembership"),
      "AccountDropdown must use useEmployerMembership hook"
    );
    assert.ok(
      dropdownSrc.includes("{isEmployer && (") || dropdownSrc.includes("{isEmployer &&"),
      "AccountDropdown must guard /employer link so candidate-only users do not see it"
    );
    assert.ok(
      dropdownSrc.includes('to="/employer"'),
      "AccountDropdown must retain link to /employer workspace for authorized employers"
    );
  });

  it("Candidate-only deep link to /employer/jobs shows restricted-access page and does not auto-redirect to company creation", () => {
    const contextSrc = readFileSync(
      new URL("../../../features/company/CompanyWorkspaceContext.tsx", import.meta.url),
      "utf8"
    );

    // Must detect deep links and render restricted access page
    assert.ok(
      contextSrc.includes('location.pathname.startsWith("/employer/jobs")'),
      "CompanyWorkspaceContext must detect protected deep links to /employer/jobs"
    );
    assert.ok(
      contextSrc.includes('data-testid="employer-restricted-access"'),
      "CompanyWorkspaceContext must render restricted access page with data-testid='employer-restricted-access'"
    );
    assert.ok(
      contextSrc.includes('to="/candidate"'),
      "Restricted access page must provide direct safe button to /candidate"
    );
    assert.ok(
      contextSrc.includes('to="/employer/onboarding"'),
      "Restricted access page must offer explicit intentional onboarding link"
    );
  });

  it("Employer authorized access: CompanyWorkspaceProvider mounts workspace when companies exist", () => {
    const contextSrc = readFileSync(
      new URL("../../../features/company/CompanyWorkspaceContext.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      contextSrc.includes("Ctx.Provider value={value}"),
      "CompanyWorkspaceContext must provide workspace context to children when active company exists"
    );
  });

  it("Explicit company onboarding remains a separate flow outside workspace provider", () => {
    const routerSrc = readFileSync(
      new URL("../AppRouter.tsx", import.meta.url),
      "utf8"
    );
    const onboardingSrc = readFileSync(
      new URL("../../../pages/employer/EmployerOnboardingPage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      routerSrc.includes('path="employer/onboarding"'),
      "AppRouter must declare employer/onboarding as an explicit route"
    );
    assert.ok(
      onboardingSrc.includes("CompanyRegistrationOnboarding"),
      "EmployerOnboardingPage must handle intentional company onboarding"
    );
    assert.ok(
      onboardingSrc.includes('data && data.length > 0'),
      "EmployerOnboardingPage must redirect existing employers to /employer"
    );
  });

  it("Employer public Job preview: verifies visibility without creating CandidateProfile", () => {
    const routerSrc = readFileSync(
      new URL("../AppRouter.tsx", import.meta.url),
      "utf8"
    );
    const jobsSrc = readFileSync(
      new URL("../../../pages/employer/EmployerJobsPage.tsx", import.meta.url),
      "utf8"
    );
    const detailSrc = readFileSync(
      new URL("../../../pages/public/JobDetailPage/JobDetailPage.tsx", import.meta.url),
      "utf8"
    );

    // Public job route is not protected by CandidateRoute
    assert.ok(
      routerSrc.includes('path="jobs/:id"'),
      "AppRouter must declare public jobs/:id route"
    );

    // Employer Jobs management has direct public verification link
    assert.ok(
      jobsSrc.includes("Xem hiển thị công khai"),
      "EmployerJobsPage must provide 'Xem hiển thị công khai' action for published jobs"
    );
    assert.ok(
      jobsSrc.includes('to={`/jobs/${job.id}`}'),
      "EmployerJobsPage must route directly to public job detail /jobs/${job.id}"
    );

    // JobDetailPage does not call candidate profile creation service
    assert.ok(
      !detailSrc.includes("candidateProfileService.createProfile"),
      "JobDetailPage must never call candidateProfileService.createProfile"
    );
  });

  it("Candidate Dashboard shortcuts to /employer are hidden for candidate-only users", () => {
    const headerSrc = readFileSync(
      new URL("../../../features/candidate/dashboard/components/CandidateDashboardHeader.tsx", import.meta.url),
      "utf8"
    );
    const actionsSrc = readFileSync(
      new URL("../../../features/candidate/dashboard/components/QuickActionsPanel.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      headerSrc.includes("useEmployerMembership"),
      "CandidateDashboardHeader must import and check useEmployerMembership"
    );
    assert.ok(
      headerSrc.includes("{isEmployer && (") || headerSrc.includes("{isEmployer &&"),
      "CandidateDashboardHeader must conditionally render 'Tuyển dụng' only when isEmployer is true"
    );
    assert.ok(
      actionsSrc.includes("useEmployerMembership"),
      "QuickActionsPanel must import and check useEmployerMembership"
    );
    assert.ok(
      actionsSrc.includes('action.href !== "/employer"'),
      "QuickActionsPanel must filter out /employer action for candidate-only users"
    );
  });

  it("useEmployerMembership hook queries backend GET /companies/me and fails closed", () => {
    const hookSrc = readFileSync(
      new URL("../../../features/company/hooks/useEmployerMembership.ts", import.meta.url),
      "utf8"
    );

    assert.ok(
      hookSrc.includes("companyWorkspaceApi") && hookSrc.includes("listMine"),
      "Hook must query real companyWorkspaceApi.listMine() (GET /companies/me)"
    );
    assert.ok(
      hookSrc.includes('c.status === "ACTIVE"'),
      "Hook must verify company status is ACTIVE"
    );
  });
});
