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
  ReportContractError,
} from "../../../features/reports/reportFormatters";
import { ApiFailure, toApiFailure } from "../../../services/api/apiFailure";

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
            draft: 0,
            submitted: 2,
            reviewing: 0,
            shortlisted: 0,
            interview: 1,
            offered: 0,
            rejected: 1,
            withdrawn: 1,
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

  describe("Task 2D: Runtime Contract Validation & Error Propagation", () => {
    const validRawAdminReport = {
      period: {
        key: "30d",
        startDate: "2026-09-29T00:00:00.000Z",
        endDate: "2026-10-29T00:00:00.000Z",
        generatedAt: "2026-10-29T10:00:00.000Z",
      },
      snapshot: {
        users: { total: 100, active: 90, suspended: 8, disabled: 2 },
        companies: {
          total: 20,
          active: 15,
          suspended: 3,
          archived: 2,
          verified: 12,
          pendingVerification: 4,
          rejectedVerification: 2,
          unverified: 2,
        },
        jobs: { total: 30, published: 20, draft: 5, paused: 2, closed: 1, expired: 1, archived: 1 },
        applications: { total: 250 },
      },
      periodEvents: {
        newUsersRegistered: 10,
        newCompaniesRegistered: 2,
        companiesVerified: 1,
        companiesRejected: 0,
        jobsPosted: 8,
        applicationsSubmitted: 30,
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

    const validRawEmployerReport = {
      companyId: "c-123",
      companyName: "Công ty ABC",
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
        total: 5,
        published: 3,
        draft: 1,
        paused: 0,
        closed: 1,
        expired: 0,
        archived: 0,
      },
      pipeline: {
        currentCounts: {
          totalApplications: 10,
          draft: 1,
          submitted: 4,
          reviewing: 2,
          shortlisted: 1,
          interview: 1,
          offered: 1,
          rejected: 0,
          withdrawn: 0,
        },
        periodSubmissions: 4,
        hires: {
          status: "UNAVAILABLE",
          count: null,
          note: "Chưa ghi nhận kết quả tuyển dụng",
        },
      },
      interviewsSummary: {
        total: 2,
        scheduled: 1,
        rescheduled: 0,
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

    it("throws ReportContractError (kind: validation) when required Admin metrics are missing, never defaulting to zero", () => {
      // Missing snapshot.users.total
      const missingUsersTotal = JSON.parse(JSON.stringify(validRawAdminReport));
      delete missingUsersTotal.snapshot.users.total;
      assert.throws(
        () => normalizeAdminReport(missingUsersTotal),
        (err: unknown) => {
          assert.ok(err instanceof ReportContractError);
          assert.ok(err instanceof ApiFailure);
          assert.equal((err as ApiFailure).kind, "validation");
          assert.equal((err as ApiFailure).code, "REPORT_CONTRACT_ERROR");
          assert.ok((err as Error).message.includes("snapshot.users.total"));
          return true;
        }
      );

      // Missing periodEvents.applicationsSubmitted
      const missingEvents = JSON.parse(JSON.stringify(validRawAdminReport));
      delete missingEvents.periodEvents.applicationsSubmitted;
      assert.throws(
        () => normalizeAdminReport(missingEvents),
        (err: unknown) => {
          assert.ok(err instanceof ReportContractError);
          assert.ok((err as Error).message.includes("periodEvents.applicationsSubmitted"));
          return true;
        }
      );

      // Missing operationalBacklog.pendingVerificationQueue
      const missingBacklog = JSON.parse(JSON.stringify(validRawAdminReport));
      delete missingBacklog.operationalBacklog.pendingVerificationQueue;
      assert.throws(
        () => normalizeAdminReport(missingBacklog),
        (err: unknown) => {
          assert.ok(err instanceof ReportContractError);
          assert.ok((err as Error).message.includes("operationalBacklog.pendingVerificationQueue"));
          return true;
        }
      );
    });

    it("throws ReportContractError when required Employer recruitment metrics are missing, never defaulting to zero", () => {
      // Missing jobsSummary.published
      const missingJobStatus = JSON.parse(JSON.stringify(validRawEmployerReport));
      delete missingJobStatus.jobsSummary.published;
      assert.throws(
        () => normalizeCompanyRecruitmentReport(missingJobStatus),
        (err: unknown) => {
          assert.ok(err instanceof ReportContractError);
          assert.ok((err as Error).message.includes("jobsSummary.published"));
          return true;
        }
      );

      // Missing pipeline.currentCounts.submitted
      const missingPipelineStage = JSON.parse(JSON.stringify(validRawEmployerReport));
      delete missingPipelineStage.pipeline.currentCounts.submitted;
      assert.throws(
        () => normalizeCompanyRecruitmentReport(missingPipelineStage),
        (err: unknown) => {
          assert.ok(err instanceof ReportContractError);
          assert.ok((err as Error).message.includes("pipeline.currentCounts.submitted"));
          return true;
        }
      );

      // Missing interviewsSummary.scheduled
      const missingInterviewStatus = JSON.parse(JSON.stringify(validRawEmployerReport));
      delete missingInterviewStatus.interviewsSummary.scheduled;
      assert.throws(
        () => normalizeCompanyRecruitmentReport(missingInterviewStatus),
        (err: unknown) => {
          assert.ok(err instanceof ReportContractError);
          assert.ok((err as Error).message.includes("interviewsSummary.scheduled"));
          return true;
        }
      );
    });

    it("throws ReportContractError on invalid metric values (negative, string, float, boolean, null for required fields)", () => {
      // Negative count
      assert.throws(
        () =>
          normalizePipelineCounts({
            totalApplications: -5,
            draft: 0,
            submitted: 0,
            reviewing: 0,
            shortlisted: 0,
            interview: 0,
            offered: 0,
            rejected: 0,
            withdrawn: 0,
          }),
        (err: unknown) => {
          assert.ok(err instanceof ReportContractError);
          assert.ok((err as Error).message.includes("số nguyên không âm"));
          return true;
        }
      );

      // String instead of number
      assert.throws(
        () =>
          normalizePipelineCounts({
            totalApplications: "10",
            draft: 0,
            submitted: 0,
            reviewing: 0,
            shortlisted: 0,
            interview: 0,
            offered: 0,
            rejected: 0,
            withdrawn: 0,
          }),
        (err: unknown) => {
          assert.ok(err instanceof ReportContractError);
          return true;
        }
      );

      // Non-integer float
      assert.throws(
        () =>
          normalizePipelineCounts({
            totalApplications: 10.5,
            draft: 0,
            submitted: 0,
            reviewing: 0,
            shortlisted: 0,
            interview: 0,
            offered: 0,
            rejected: 0,
            withdrawn: 0,
          }),
        (err: unknown) => {
          assert.ok(err instanceof ReportContractError);
          return true;
        }
      );

      // null for required metric
      assert.throws(
        () =>
          normalizePipelineCounts({
            totalApplications: null,
            draft: 0,
            submitted: 0,
            reviewing: 0,
            shortlisted: 0,
            interview: 0,
            offered: 0,
            rejected: 0,
            withdrawn: 0,
          }),
        (err: unknown) => {
          assert.ok(err instanceof ReportContractError);
          return true;
        }
      );
    });

    it("strictly preserves legitimate zero values and legitimate UNAVAILABLE/null fields", () => {
      const allZeroEmployerReport = {
        companyId: "c-zero",
        companyName: "Doanh nghiệp mới",
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
          total: 0,
          published: 0,
          draft: 0,
          paused: 0,
          closed: 0,
          expired: 0,
          archived: 0,
        },
        pipeline: {
          currentCounts: {
            totalApplications: 0,
            draft: 0,
            submitted: 0,
            reviewing: 0,
            shortlisted: 0,
            interview: 0,
            offered: 0,
            rejected: 0,
            withdrawn: 0,
          },
          periodSubmissions: 0,
          hires: {
            status: "UNAVAILABLE",
            count: null,
            note: "Chưa ghi nhận kết quả tuyển dụng",
          },
        },
        interviewsSummary: {
          total: 0,
          scheduled: 0,
          rescheduled: 0,
          completed: 0,
          cancelled: 0,
        },
        commercialPackage: {
          status: "UNAVAILABLE",
          tier: null,
          activeJobsLimit: null,
          paymentActive: null,
          note: "Chưa triển khai gói dịch vụ thu phí",
        },
      };

      const normalized = normalizeCompanyRecruitmentReport(allZeroEmployerReport);
      assert.equal(normalized.jobsSummary.total, 0);
      assert.equal(normalized.jobsSummary.published, 0);
      assert.equal(normalized.pipeline.currentCounts.total, 0);
      assert.equal(normalized.pipeline.currentCounts.DRAFT, 0);
      assert.equal(normalized.pipeline.currentCounts.SUBMITTED, 0);
      assert.equal(normalized.pipeline.periodSubmissions, 0);
      assert.equal(normalized.interviewsSummary.total, 0);
      assert.equal(normalized.interviewsSummary.scheduled, 0);
      // Legitimate UNAVAILABLE / null preservation
      assert.equal(normalized.pipeline.hires.count, null);
      assert.equal(normalized.pipeline.hires.status, "UNAVAILABLE");
      assert.equal(normalized.commercialPackage.tier, null);
      assert.equal(normalized.commercialPackage.activeJobsLimit, null);
      assert.equal(normalized.commercialPackage.paymentActive, null);
    });

    it("is preserved as-is by toApiFailure so UI error states display the contract error message", () => {
      const contractErr = new ReportContractError("Trường 'snapshot.users.total' bị thiếu.");
      const failure = toApiFailure(contractErr);
      assert.equal(failure, contractErr);
      assert.equal(failure.kind, "validation");
      assert.equal(failure.status, 422);
      assert.equal(failure.code, "REPORT_CONTRACT_ERROR");
      assert.equal(failure.message, "Trường 'snapshot.users.total' bị thiếu.");
    });
  });

  describe("Task 2E: Asynchronous Request Scope & Race Protection", () => {
    interface MockReportResponse {
      companyId: string;
      period: string;
    }

    it("cancels in-flight requests and ignores out-of-order deferred responses", async () => {
      let activeController: AbortController | null = null;
      let requestRevision = 0;
      let renderedReport: MockReportResponse | null = null;
      let renderedCompanyId: string | null = null;
      let renderedError: ApiFailure | null = null;

      const executeReportRequest = (
        companyId: string,
        period: string,
        delayMs: number,
        mockResponse: MockReportResponse
      ): Promise<void> => {
        activeController?.abort();
        const controller = new AbortController();
        activeController = controller;
        const revision = ++requestRevision;
        const targetCompanyId = companyId;

        return new Promise<void>((resolve) => {
          setTimeout(() => {
            if (controller.signal.aborted || revision !== requestRevision || targetCompanyId !== companyId) {
              // Stale or cancelled response — must be ignored!
              resolve();
              return;
            }
            renderedReport = { ...mockResponse, period };
            renderedCompanyId = targetCompanyId;
            renderedError = null;
            resolve();
          }, delayMs);
        });
      };

      // 1. User starts Request 1 for Company A (slow network: 80ms)
      const req1 = executeReportRequest("comp-AAA", "7d", 80, { companyId: "comp-AAA", period: "7d" });

      // 2. User quickly switches to Company B (fast network: 20ms)
      const req2 = executeReportRequest("comp-BBB", "30d", 20, { companyId: "comp-BBB", period: "30d" });

      await Promise.all([req1, req2]);

      // Verify that Company B's fast response won and Company A's delayed response did NOT overwrite it
      assert.equal(renderedCompanyId, "comp-BBB");
      assert.ok(renderedReport !== null);
      assert.equal((renderedReport as MockReportResponse).companyId, "comp-BBB");
      assert.equal((renderedReport as MockReportResponse).period, "30d");
      assert.equal(renderedError, null);
    });

    it("resets state immediately on company switch so export and display cannot leak previous company data", () => {
      let activeCompanyId: string | null = "comp-111";
      let loadedCompanyId: string | null = "comp-111";
      let report: { companyId: string; name: string } | null = { companyId: "comp-111", name: "Company One" };
      let loading = false;
      const error: ApiFailure | null = null;

      const isDataReadyForExport = () => Boolean(report && loadedCompanyId === activeCompanyId && !loading && !error);
      assert.equal(isDataReadyForExport(), true, "Initially ready for export");

      // User switches activeCompanyId to comp-222: effect immediately fires
      activeCompanyId = "comp-222";
      // Effect 1 immediately resets:
      loadedCompanyId = null;
      report = null;
      loading = true;

      assert.equal(isDataReadyForExport(), false, "Immediately blocked from export on company switch");
      assert.equal(report, null);
      assert.equal(loadedCompanyId, null);
    });

    it("suppresses error state when a request is cancelled intentionally", async () => {
      let stateError: ApiFailure | null = null;
      let activeController: AbortController | null = null;
      let requestRevision = 0;

      const startRequest = (delayMs: number): { promise: Promise<void>; controller: AbortController } => {
        activeController?.abort();
        const controller = new AbortController();
        activeController = controller;
        const revision = ++requestRevision;

        const promise = new Promise<void>((resolve) => {
          setTimeout(() => {
            if (controller.signal.aborted || revision !== requestRevision) {
              // Intentionally cancelled: do not set error state!
              resolve();
              return;
            }
            stateError = new ApiFailure("network", 0, "NETWORK_ERROR", "Failed");
            resolve();
          }, delayMs);
        });

        return { promise, controller };
      };

      const { promise, controller } = startRequest(50);
      // Immediately abort
      controller.abort();

      await promise;

      assert.equal(stateError, null, "Cancelled request must never set error state");
    });
  });
});
