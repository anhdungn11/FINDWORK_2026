import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildAdminReportCsv,
  buildAdminReportJson,
  buildEmployerReportCsv,
  buildEmployerReportJson,
} from "../../../features/reports/reportFormatters";

import { formatDateOfBirth } from "../../../features/candidate/profile/utils/profileFormatters";

describe("Admin & Employer Reporting and DOB Timezone Regression Suite", () => {
  describe("Task 1: Calendar-safe Date of Birth across Timezones", () => {
    it("formats ISO date string without day-shifting in any timezone", () => {
      assert.equal(formatDateOfBirth("1997-08-20T00:00:00.000Z"), "20/08/1997");
      assert.equal(formatDateOfBirth("1997-08-20"), "20/08/1997");
      assert.equal(formatDateOfBirth("2000-01-01T00:00:00.000Z"), "01/01/2000");
      assert.equal(formatDateOfBirth("2003-11-10"), "10/11/2003");
      assert.equal(formatDateOfBirth("1999-04-15T00:00:00.000Z"), "15/04/1999");
    });

    it("handles Date objects using UTC methods to prevent offset shifting", () => {
      const d = new Date("1997-08-20T00:00:00.000Z");
      assert.equal(formatDateOfBirth(d), "20/08/1997");
    });

    it("handles null, undefined, empty, or whitespace-only inputs gracefully", () => {
      assert.equal(formatDateOfBirth(null), "Chưa cập nhật");
      assert.equal(formatDateOfBirth(undefined), "Chưa cập nhật");
      assert.equal(formatDateOfBirth(""), "Chưa cập nhật");
      assert.equal(formatDateOfBirth("   "), "Chưa cập nhật");
    });
  });

  describe("Task 2A: Admin Reporting Page & Contracts", () => {
    const mockAdminCounts = {
      users: 1500,
      activeUsers: 1420,
      companies: 95,
      activeCompanies: 80,
      pendingCompanies: 12,
      jobs: 320,
      publishedJobs: 210,
      applications: 4500,
    };

    it("builds exportable CSV artifact with UTF-8 BOM containing real platform snapshot counts and honest tracking", () => {
      const csv = buildAdminReportCsv(mockAdminCounts);
      assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM");
      assert.ok(csv.includes("1500"), "CSV must include total users");
      assert.ok(csv.includes("1420"), "CSV must include active users");
      assert.ok(csv.includes("12"), "CSV must include pending companies");
      assert.ok(csv.includes("210"), "CSV must include published jobs");
      assert.ok(csv.includes("Chưa triển khai gói thu phí trên phiên bản hiện tại"), "CSV must honestly track commercial status");
      assert.ok(!csv.includes("NaN"), "CSV must never contain NaN");
    });

    it("builds exportable JSON artifact containing real platform snapshot counts and operational backlog", () => {
      const json = buildAdminReportJson(mockAdminCounts) as any;
      assert.equal(json.reportType, "FINDWORK_ADMIN_PROGRESS_REPORT");
      assert.equal(json.snapshot.users.total, 1500);
      assert.equal(json.snapshot.users.active, 1420);
      assert.equal(json.snapshot.companies.pendingVerification, 12);
      assert.equal(json.snapshot.companies.suspendedOrArchived, 15);
      assert.ok(!Number.isNaN(json.snapshot.companies.suspendedOrArchived), "Must not be NaN");
      assert.equal(json.operationalBacklog.pendingCompaniesToVerify, 12);
      assert.equal(json.commercialModules.revenueAndBilling.monetizationActive, false);
      assert.equal(json.commercialModules.revenueAndBilling.status, "UNIMPLEMENTED");
    });

    it("verifies AdminReportsPage UI does not contain internal contract filenames or ineffective period controls", () => {
      const adminReportsSrc = readFileSync(resolve("src/pages/admin/AdminReportsPage.tsx"), "utf8");
      assert.ok(!adminReportsSrc.includes("REPORTING_API_CONTRACT.md"), "Must not leak internal contract filename to user");
      assert.ok(!adminReportsSrc.includes("Codex"), "Must not leak backend developer name to user");
      assert.ok(!adminReportsSrc.includes("<select"), "Must remove ineffective period control until supported");
      assert.ok(adminReportsSrc.includes("Hiện trạng tích lũy toàn sàn"), "Must preserve snapshot distinction");
    });

    it("verifies AdminLayout and AppRouter declare /admin/reports route and navigation", () => {
      const routerSrc = readFileSync(resolve("src/app/router/AppRouter.tsx"), "utf8");
      assert.ok(routerSrc.includes("AdminReportsPage"), "AppRouter must import AdminReportsPage");
      assert.ok(routerSrc.includes('path="reports"'), "AppRouter must declare reports route under admin");

      const adminLayoutSrc = readFileSync(resolve("src/layouts/AdminLayout.tsx"), "utf8");
      assert.ok(adminLayoutSrc.includes("/admin/reports"), "AdminLayout must link to /admin/reports");
      assert.ok(adminLayoutSrc.includes("Báo cáo tiến độ & Vận hành"), "AdminLayout must label the reports item");

      const adminDashSrc = readFileSync(resolve("src/pages/admin/AdminDashboardPage.tsx"), "utf8");
      assert.ok(adminDashSrc.includes("/admin/reports"), "AdminDashboardPage must link to /admin/reports");
    });

    it("verifies Backend contract document exists and defines required Codex endpoints", () => {
      const contractSrc = readFileSync(resolve("docs/REPORTING_API_CONTRACT.md"), "utf8");
      assert.ok(contractSrc.includes("GET /api/v1/admin/reports/summary"), "Contract must specify admin summary");
      assert.ok(contractSrc.includes("GET /api/v1/companies/:companyId/reports/recruitment"), "Contract must specify employer recruitment report");
      assert.ok(contractSrc.includes("operationalBacklog"), "Contract must define operational backlog queue");
      assert.ok(contractSrc.includes("commercialStatus"), "Contract must explicitly track commercial/revenue status");
    });
  });

  describe("Task 2B: Employer Reporting Page & Contracts", () => {
    const mockEmployerData = {
      companyName: "FINDWORK Tech",
      selectedJobTitle: "Tất cả tin tuyển dụng",
      jobCounts: { total: 10, published: 6, draft: 2, paused: 1, closed: 1 },
      pipeline: null,
      interviews: null,
    };

    it("builds exportable CSV artifact with UTF-8 BOM for employer recruitment showing unavailable status honestly", () => {
      const csv = buildEmployerReportCsv(mockEmployerData);
      assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM");
      assert.ok(csv.includes("FINDWORK Tech"));
      assert.ok(csv.includes("10"), "CSV must include total jobs");
      assert.ok(csv.includes("Chưa khả dụng"), "CSV must honestly show unavailable pipeline status");
      assert.ok(csv.includes("Gói tiêu chuẩn FINDWORK (Miễn phí)"));
    });

    it("builds exportable JSON artifact for employer recruitment without fake trends", () => {
      const json = buildEmployerReportJson({
        ...mockEmployerData,
        companyId: "c-123",
        selectedJobId: null,
      }) as any;
      assert.equal(json.reportType, "FINDWORK_EMPLOYER_RECRUITMENT_REPORT");
      assert.equal(json.company.id, "c-123");
      assert.equal(json.jobSummary.total, 10);
      assert.equal(json.applicationPipeline.status, "UNAVAILABLE_ON_SERVER");
      assert.equal(json.interviewsSummary.status, "UNAVAILABLE_ON_SERVER");
      assert.equal(json.commercialTier.tierName, "FREE_STANDARD");
      assert.equal(json.commercialTier.billingActive, false);
    });

    it("verifies EmployerReportsPage resets state on company change, prevents stale cross-company export, and does not swallow errors", () => {
      const empReportsSrc = readFileSync(resolve("src/pages/employer/EmployerReportsPage.tsx"), "utf8");

      // Verify immediate state reset on company change
      assert.ok(empReportsSrc.includes("setLoadedCompanyId(null)"), "Must reset loaded company id on switch");
      assert.ok(empReportsSrc.includes("setJobCounts(null)"), "Must reset job counts on switch");
      assert.ok(empReportsSrc.includes("setPipeline(null)"), "Must reset pipeline on switch");

      // Verify abort controller usage for stale request cancellation
      assert.ok(empReportsSrc.includes("controller.abort()"), "Must abort in-flight requests when company changes");

      // Verify export guard checking loaded company id matches active company id
      assert.ok(empReportsSrc.includes("loadedCompanyId === activeCompanyId"), "Export must require loadedCompanyId === activeCompanyId");
      assert.ok(empReportsSrc.includes("disabled={!isDataReadyForExport}"), "Export buttons must be disabled when company data is not ready");

      // Verify no swallowing 403 Forbidden into 0
      assert.ok(empReportsSrc.includes("apiFailure.status === 403"), "Must handle 403 Forbidden without swallowing into zero");

      // Verify no slice(0, 20) slicing of interviews
      assert.ok(!empReportsSrc.includes("slice(0, 20)"), "Must not slice interviews to 20");

      // Verify no leak of internal contract filenames
      assert.ok(!empReportsSrc.includes("REPORTING_API_CONTRACT.md"), "Must not leak internal contract filename in employer UI");
    });

    it("verifies EmployerLayout and AppRouter declare /employer/reports route and navigation", () => {
      const routerSrc = readFileSync(resolve("src/app/router/AppRouter.tsx"), "utf8");
      assert.ok(routerSrc.includes("EmployerReportsPage"), "AppRouter must import EmployerReportsPage");
      assert.ok(routerSrc.includes('path="reports"'), "AppRouter must declare reports route under employer");

      const employerLayoutSrc = readFileSync(resolve("src/layouts/EmployerLayout.tsx"), "utf8");
      assert.ok(employerLayoutSrc.includes("/employer/reports"), "EmployerLayout must link to /employer/reports");
      assert.ok(employerLayoutSrc.includes("Báo cáo tuyển dụng"), "EmployerLayout must label the reports item");

      const employerDashSrc = readFileSync(resolve("src/pages/employer/EmployerDashboardPage.tsx"), "utf8");
      assert.ok(employerDashSrc.includes("/employer/reports"), "EmployerDashboardPage must link to /employer/reports");
    });
  });
});
