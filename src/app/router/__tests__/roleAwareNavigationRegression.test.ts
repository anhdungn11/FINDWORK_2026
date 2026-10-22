import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("Role-Aware Workspace Navigation Regression", () => {
  it("AccountDropdown conditionally renders /employer workspace link based on actual company membership", () => {
    const dropdownSrc = readFileSync(
      new URL("../../../components/navigation/Header/components/AccountDropdown.tsx", import.meta.url),
      "utf8"
    );

    // Must import and use useEmployerMembership
    assert.ok(
      dropdownSrc.includes("useEmployerMembership"),
      "AccountDropdown must use useEmployerMembership hook"
    );

    // Must guard /employer link with isEmployer
    assert.ok(
      dropdownSrc.includes("{isEmployer && (") || dropdownSrc.includes("{isEmployer &&"),
      "AccountDropdown must guard /employer link so candidate-only users do not see it"
    );

    // Must still preserve regression test contract for employer workspace link
    assert.ok(
      dropdownSrc.includes('to="/employer"'),
      "AccountDropdown must retain link to /employer workspace for authorized employers"
    );
  });

  it("EmployerJobsPage provides a direct public verification action for published jobs", () => {
    const jobsSrc = readFileSync(
      new URL("../../../pages/employer/EmployerJobsPage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      jobsSrc.includes("Xem hiển thị công khai"),
      "EmployerJobsPage must provide 'Xem hiển thị công khai' action for published jobs"
    );
    assert.ok(
      jobsSrc.includes('to={`/jobs/${job.id}`}'),
      "EmployerJobsPage must route directly to public job detail /jobs/${job.id}"
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
