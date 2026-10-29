import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildAdminReportCsv,
  buildAdminReportJson,
  buildEmployerReportCsv,
  buildEmployerReportJson,
  normalizePipelineCounts,
  normalizeAdminReport,
  normalizeCompanyRecruitmentReport,
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

    it("verifies AdminReportsPage UI does not contain internal contract filenames and has functional period controls", () => {
      const adminReportsSrc = readFileSync(resolve("src/pages/admin/AdminReportsPage.tsx"), "utf8");
      assert.ok(!adminReportsSrc.includes("REPORTING_API_CONTRACT.md"), "Must not leak internal contract filename to user");
      assert.ok(!adminReportsSrc.includes("Codex"), "Must not leak backend developer name to user");
      assert.ok(adminReportsSrc.includes("admin-period-filter"), "Must have functional period selector");
      assert.ok(adminReportsSrc.includes("30d"), "Must support 30d default preset");
      assert.ok(adminReportsSrc.includes("Hiện trạng tích lũy toàn sàn"), "Must preserve snapshot distinction");
      assert.ok(adminReportsSrc.includes("Biến động trong chu kỳ"), "Must separate period events from snapshot");
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
      assert.ok(empReportsSrc.includes("setReport(null)"), "Must reset report on switch");

      // Verify abort controller usage for stale request cancellation
      assert.ok(empReportsSrc.includes("controller.abort()"), "Must abort in-flight requests when company changes");

      // Verify export guard checking loaded company id matches active company id
      assert.ok(empReportsSrc.includes("loadedCompanyId === activeCompanyId"), "Export must require loadedCompanyId === activeCompanyId");
      assert.ok(empReportsSrc.includes("disabled={!isDataReadyForExport}"), "Export buttons must be disabled when company data is not ready");

      // Verify no swallowing 403 Forbidden into 0
      assert.ok(empReportsSrc.includes("canReviewApplications") || empReportsSrc.includes("403"), "Must handle 403 Forbidden without swallowing into zero");

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

  describe("Task 2C: Real Aggregate Contract Normalization & Validation", () => {
    it("normalizes lowercase pipeline fields from backend to typed uppercase enums", () => {
      const rawBackendCurrentCounts = {
        totalApplications: 12,
        draft: 1,
        submitted: 3,
        reviewing: 2,
        shortlisted: 2,
        interview: 2,
        offered: 1,
        rejected: 1,
        withdrawn: 0,
      };

      const normalized = normalizePipelineCounts(rawBackendCurrentCounts);
      assert.equal(normalized.total, 12);
      assert.equal(normalized.DRAFT, 1);
      assert.equal(normalized.SUBMITTED, 3);
      assert.equal(normalized.REVIEWING, 2);
      assert.equal(normalized.SHORTLISTED, 2);
      assert.equal(normalized.INTERVIEW, 2);
      assert.equal(normalized.OFFERED, 1);
      assert.equal(normalized.REJECTED, 1);
      assert.equal(normalized.WITHDRAWN, 0);
    });

    it("supports actual expired and archived job statuses, and rescheduled interviews", () => {
      const mockRawCompanyReport = {
        companyId: "c-456",
        companyName: "AnhdungEconomy Corp",
        period: {
          key: "30d",
          startDate: "2026-09-29T00:00:00.000Z",
          endDate: "2026-10-29T00:00:00.000Z",
          generatedAt: "2026-10-29T10:00:00.000Z",
        },
        jobFilter: {
          jobId: null,
          title: "Tất cả tin tuyển dụng",
        },
        jobsSummary: {
          total: 8,
          published: 4,
          draft: 1,
          paused: 1,
          closed: 0,
          expired: 1,
          archived: 1,
        },
        pipeline: {
          currentCounts: {
            totalApplications: 5,
            submitted: 2,
            interview: 1,
            withdrawn: 1,
            rejected: 1,
          },
          periodSubmissions: 3,
          hires: {
            status: "UNAVAILABLE",
            count: null,
            note: "Chưa ghi nhận kết quả tuyển dụng (Lời mời nhận việc chưa phải kết quả tuyển).",
          },
        },
        interviewsSummary: {
          total: 4,
          scheduled: 2,
          rescheduled: 1,
          completed: 1,
          cancelled: 0,
        },
        commercialPackage: {
          status: "UNAVAILABLE",
          tier: null,
          activeJobsLimit: null,
          paymentActive: null,
          note: "Chưa triển khai gói dịch vụ thu phí hoặc hạn mức đăng tin.",
        },
      };

      const normalized = normalizeCompanyRecruitmentReport(mockRawCompanyReport);
      assert.equal(normalized.jobsSummary.expired, 1);
      assert.equal(normalized.jobsSummary.archived, 1);
      assert.equal(normalized.pipeline.currentCounts.WITHDRAWN, 1);
      assert.equal(normalized.interviewsSummary.rescheduled, 1);
      assert.equal(normalized.pipeline.hires.status, "UNAVAILABLE");
      assert.equal(normalized.pipeline.hires.count, null);
      assert.equal(normalized.commercialPackage.status, "UNAVAILABLE");
      assert.equal(normalized.commercialPackage.paymentActive, null);

      const csv = buildEmployerReportCsv(normalized);
      assert.ok(csv.startsWith("\uFEFF"));
      assert.ok(csv.includes("AnhdungEconomy Corp"));
      assert.ok(csv.includes("- Hết hạn (EXPIRED)"));
      assert.ok(csv.includes("- Lịch phỏng vấn đã dời (RESCHEDULED)"));
      assert.ok(csv.includes("- Ứng viên rút hồ sơ (WITHDRAWN)"));
    });

    it("normalizes real Admin report with snapshot, period events, operational backlog and honest commercial status", () => {
      const mockRawAdminReport = {
        period: {
          key: "30d",
          startDate: "2026-09-29T00:00:00.000Z",
          endDate: "2026-10-29T00:00:00.000Z",
          generatedAt: "2026-10-29T10:00:00.000Z",
        },
        snapshot: {
          users: { total: 200, active: 190, suspended: 8, disabled: 2 },
          companies: {
            total: 30,
            active: 25,
            suspended: 3,
            archived: 2,
            verified: 20,
            pendingVerification: 4,
            rejectedVerification: 2,
            unverified: 4,
          },
          jobs: { total: 50, published: 35, draft: 5, paused: 3, closed: 2, expired: 3, archived: 2 },
          applications: { total: 420 },
        },
        periodEvents: {
          newUsersRegistered: 18,
          newCompaniesRegistered: 3,
          companiesVerified: 2,
          companiesRejected: 1,
          jobsPosted: 12,
          applicationsSubmitted: 45,
          jobsClosedByAdmin: 0,
        },
        operationalBacklog: {
          pendingVerificationQueue: 4,
          suspendedUsersQueue: 8,
          suspendedCompaniesQueue: 3,
        },
        commercialStatus: {
          revenueAndBilling: {
            status: "UNAVAILABLE",
            monetizationActive: null,
            totalRevenueVnd: null,
            note: "Chưa triển khai ghi nhận doanh thu và thanh toán.",
          },
          enterprisePartnerships: {
            status: "UNAVAILABLE",
            activePartnershipsCount: null,
            note: "Chưa triển khai ghi nhận chương trình đối tác.",
          },
        },
      };

      const normalized = normalizeAdminReport(mockRawAdminReport);
      assert.equal(normalized.snapshot.users.total, 200);
      assert.equal(normalized.periodEvents.applicationsSubmitted, 45);
      assert.equal(normalized.operationalBacklog.pendingVerificationQueue, 4);
      assert.equal(normalized.commercialStatus.revenueAndBilling.status, "UNAVAILABLE");
      assert.equal(normalized.commercialStatus.revenueAndBilling.totalRevenueVnd, null);

      const csv = buildAdminReportCsv(normalized);
      assert.ok(csv.startsWith("\uFEFF"));
      assert.ok(csv.includes("BÁO CÁO TIẾN ĐỘ & VẬN HÀNH NỀN TẢNG FINDWORK"));
      assert.ok(csv.includes("45"));
      assert.ok(csv.includes("Hồ sơ ứng tuyển mới nộp"));
    });
  });
});
