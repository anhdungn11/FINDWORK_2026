import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getReturnDestination } from "../returnDestination";
import { resolveWorkspaceAccess } from "../../guards/accessPolicy";

test("Task 1 Regression: login return destination allows employer private routes", () => {
  // Employer routes must be preserved after login, not dropped to /candidate
  for (const path of [
    "/employer",
    "/employer/onboarding",
    "/employer/jobs",
    "/employer/jobs/new",
    "/employer/jobs/create",
    "/employer/profile",
    "/employer/locations",
    "/employer/members",
    "/employer/applicants",
    "/employer/jobs/job-123/edit",
  ]) {
    assert.equal(getReturnDestination(path), path);
  }

  // Candidate routes must still be preserved
  for (const path of [
    "/candidate",
    "/candidate/profile",
    "/candidate/onboarding",
    "/candidate/saved-jobs",
    "/candidate/applications",
    "/cv",
    "/cv/create",
    "/cv/res-1/edit",
    "/cv/res-1/preview",
  ]) {
    assert.equal(getReturnDestination(path), path);
  }

  // Employer login default fallback
  assert.equal(getReturnDestination(undefined, "/employer"), "/employer");
  assert.equal(getReturnDestination(null, "/employer"), "/employer");

  // Malicious or invalid paths should fall back safely without executing
  assert.equal(getReturnDestination("https://evil.com"), "/candidate");
  assert.equal(getReturnDestination("//evil.com/employer"), "/candidate");
  assert.equal(getReturnDestination("/employer/../admin"), "/employer");
  assert.equal(getReturnDestination("/employer?x=%5c"), "/employer");
});

test("Task 1 Regression: EmployerRoute access policy handles all authentication states", () => {
  // 1. Loading / idle / loggingOut
  assert.equal(resolveWorkspaceAccess("employer", "idle", null, null), "loading");
  assert.equal(resolveWorkspaceAccess("employer", "loading", null, null), "loading");
  assert.equal(resolveWorkspaceAccess("employer", "loggingOut", null, null), "loading");

  // 2. Anonymous user
  assert.equal(resolveWorkspaceAccess("employer", "unauthenticated", null, null), "unauthenticated");

  // 3. Authenticated Candidate user (has user and token) -> allowed into employer onboarding flow
  const candidateUser = { id: "user-cand-1", role: "CANDIDATE" };
  assert.equal(
    resolveWorkspaceAccess("employer", "authenticated", candidateUser, "test-token"),
    "allowed"
  );

  // 4. Authenticated Employer user
  const employerUser = { id: "user-emp-1", role: "COMPANY_OWNER" };
  assert.equal(
    resolveWorkspaceAccess("employer", "authenticated", employerUser, "test-token"),
    "allowed"
  );

  // Admin access remains strictly guarded
  assert.equal(resolveWorkspaceAccess("admin", "authenticated", candidateUser, "test-token"), "forbidden");
  assert.equal(resolveWorkspaceAccess("admin", "authenticated", employerUser, "test-token"), "forbidden");
  assert.equal(resolveWorkspaceAccess("admin", "authenticated", { role: "SUPER_ADMIN" }, "test-token"), "allowed");
});

test("Task 1 Regression: AppRouter declares /employer/onboarding, /employer/register, and /career routes", () => {
  const routerSrc = readFileSync(new URL("../AppRouter.tsx", import.meta.url), "utf8");

  // Company onboarding route must be explicitly declared
  assert.ok(
    routerSrc.includes('path="employer/onboarding"'),
    "AppRouter must declare path='employer/onboarding'"
  );

  // Employer registration route must point to EmployerRegisterPage, not plain RegisterPage
  assert.ok(
    routerSrc.includes('path="employer/register"'),
    "AppRouter must declare path='employer/register'"
  );
  assert.ok(
    routerSrc.includes("EmployerRegisterPage"),
    "AppRouter must import and render EmployerRegisterPage"
  );

  // Career route must render CareerPage component, not a placeholder <h1>
  assert.ok(
    routerSrc.includes('path="career"'),
    "AppRouter must declare path='career'"
  );
  assert.ok(
    routerSrc.includes("<CareerPage />"),
    "AppRouter must render <CareerPage />"
  );
  assert.ok(
    !routerSrc.includes("<h1>Career Discovery Page</h1>"),
    "AppRouter must not have raw placeholder for career discovery"
  );
});

test("Task 1 Regression: Footer and Employer Header links point to employer registration", () => {
  const footerSrc = readFileSync(new URL("../../../components/navigation/Footer/Footer.tsx", import.meta.url), "utf8");
  assert.ok(
    footerSrc.includes('<Link to="/employer/register">Đăng ký doanh nghiệp</Link>'),
    "Footer 'Đăng ký doanh nghiệp' must link to /employer/register"
  );

  const employerDropdownSrc = readFileSync(
    new URL("../../../components/navigation/Header/components/EmployerDropdown.tsx", import.meta.url),
    "utf8"
  );
  assert.ok(
    employerDropdownSrc.includes('to="/employer/register"'),
    "EmployerDropdown must link to /employer/register"
  );

  const mobilePanelSrc = readFileSync(
    new URL("../../../components/navigation/Header/components/MobilePanel.tsx", import.meta.url),
    "utf8"
  );
  assert.ok(
    mobilePanelSrc.includes('to="/employer/register"'),
    "MobilePanel must link to /employer/register"
  );
});

test("Task 1 Regression: EmployerRegisterPage routes authenticated user to onboarding and provides employer branding", () => {
  const pageSrc = readFileSync(new URL("../../../pages/employer/EmployerRegisterPage.tsx", import.meta.url), "utf8");
  assert.ok(
    pageSrc.includes('<Navigate to="/employer/onboarding" replace />'),
    "Authenticated user visiting employer register must navigate to /employer/onboarding"
  );
  assert.ok(
    pageSrc.includes("DÀNH CHO NHÀ TUYỂN DỤNG"),
    "EmployerRegisterPage must present employer eyebrow"
  );
  assert.ok(
    pageSrc.includes('to="/employer/onboarding"'),
    "EmployerRegisterPage post-registration must link to /employer/onboarding"
  );
  assert.ok(
    pageSrc.includes('to="/employer/login"'),
    "EmployerRegisterPage footer must link to /employer/login"
  );
});

test("Task 1 Regression: EmployerOnboardingPage handles empty, existing, and forbidden states", () => {
  const pageSrc = readFileSync(new URL("../../../pages/employer/EmployerOnboardingPage.tsx", import.meta.url), "utf8");
  // 1. Existing company -> navigate to /employer
  assert.ok(
    pageSrc.includes('<Navigate to="/employer" replace />'),
    "If company already exists, navigate to /employer workspace"
  );
  // 2. Empty companies -> render CompanyRegistrationOnboarding
  assert.ok(
    pageSrc.includes("<CompanyRegistrationOnboarding"),
    "If no company exists, render CompanyRegistrationOnboarding"
  );
  // 3. Forbidden error -> explain restriction and offer action
  assert.ok(
    pageSrc.includes("apiError.kind === \"forbidden\" || apiError.status === 403"),
    "Must check for forbidden error"
  );
  assert.ok(
    pageSrc.includes("Tài khoản hiện tại không có quyền đăng ký doanh nghiệp"),
    "Must explain restriction when forbidden"
  );
});

test("Task 2 Regression: CareerPage connects to publicApi.listJobCategories and avoids fabricated data", () => {
  const careerSrc = readFileSync(new URL("../../../pages/public/CareerPage/CareerPage.tsx", import.meta.url), "utf8");
  assert.ok(
    careerSrc.includes("publicApi.listJobCategories"),
    "CareerPage must load real categories from publicApi.listJobCategories"
  );
  assert.ok(
    careerSrc.includes("to={`/jobs?categoryCode="),
    "Category cards must link to /jobs with categoryCode query"
  );
  assert.ok(
    !careerSrc.includes("mockJobs"),
    "CareerPage must not use mock jobs"
  );
  assert.ok(
    !careerSrc.includes("mockCompanies"),
    "CareerPage must not use mock companies"
  );
  assert.ok(
    careerSrc.includes("ApiErrorState"),
    "CareerPage must display retryable ApiErrorState on failure"
  );
});

test("Task 3 Regression: FeaturedJobs and FeaturedCompanies present retryable error state on connection failure", () => {
  const featuredJobsSrc = readFileSync(
    new URL("../../../features/jobs/components/FeaturedJobs/FeaturedJobs.tsx", import.meta.url),
    "utf8"
  );
  assert.ok(
    featuredJobsSrc.includes("setError(err?.message"),
    "FeaturedJobs must capture error message on connection failure"
  );
  assert.ok(
    featuredJobsSrc.includes("Thử lại"),
    "FeaturedJobs must render retry button on error"
  );

  const featuredCompaniesSrc = readFileSync(
    new URL("../../../features/companies/components/FeaturedCompanies/FeaturedCompanies.tsx", import.meta.url),
    "utf8"
  );
  assert.ok(
    featuredCompaniesSrc.includes("setError(err?.message"),
    "FeaturedCompanies must capture error message on connection failure"
  );
  assert.ok(
    featuredCompaniesSrc.includes("Thử lại"),
    "FeaturedCompanies must render retry button on error"
  );
});
