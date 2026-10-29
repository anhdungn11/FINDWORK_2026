import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { REQUIRED_COMPANY_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-company-permissions.decorator";
import { REQUIRED_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-permissions.decorator";
import { REQUIRED_PLATFORM_CAPABILITY_KEY } from "../src/modules/authorization/decorators/require-platform-capability.decorator";
import { periodDateFilter, resolveReportPeriod } from "../src/modules/reporting/report-period";
import { AdminReportsController, CompanyReportsController } from "../src/modules/reporting/reporting.controller";
import { ReportingService } from "../src/modules/reporting/reporting.service";

const companyId = "c49eaf31-68b5-4b33-9b22-02bcce25453b";
const foreignJobId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const grouped = (status: string, id: number) => ({ status, _count: { id } });

function database() {
  return {
    user: { groupBy: jest.fn(), count: jest.fn() },
    company: { findUnique: jest.fn(), groupBy: jest.fn(), count: jest.fn() },
    job: { findFirst: jest.fn(), groupBy: jest.fn() },
    application: { groupBy: jest.fn(), count: jest.fn() },
    interview: { groupBy: jest.fn() },
    auditLog: { count: jest.fn() },
  };
}

describe("report periods", () => {
  it("uses exact inclusive custom UTC boundaries and rejects ambiguous or inverted dates", () => {
    const startDate = "2026-10-01T00:00:00.000Z";
    const endDate = "2026-10-29T23:59:59.999Z";
    const period = resolveReportPeriod({ period: "custom", startDate, endDate },
      new Date("2026-10-30T01:00:00.000Z"));
    expect(periodDateFilter(period)).toEqual({ gte: new Date(startDate), lte: new Date(endDate) });
    expect(period.startDate).toBe(startDate);
    expect(period.endDate).toBe(endDate);
    expect(() => resolveReportPeriod({ period: "custom", startDate: endDate, endDate: startDate }))
      .toThrow(BadRequestException);
    expect(() => resolveReportPeriod({ period: "custom", startDate: "2026-10-01T00:00:00", endDate }))
      .toThrow(BadRequestException);
    expect(() => resolveReportPeriod({ period: "30d", startDate, endDate }))
      .toThrow(BadRequestException);
  });

  it("defines presets as rolling UTC windows and all as unbounded start", () => {
    const now = new Date("2026-10-29T12:00:00.000Z");
    expect(resolveReportPeriod({ period: "7d" }, now).startDate).toBe("2026-10-22T12:00:00.000Z");
    expect(resolveReportPeriod({ period: "all" }, now).startDate).toBeNull();
  });
});

describe("report authorization", () => {
  it("requires all four SYSTEM grants for the admin summary", () => {
    const adminSummary = jest.fn().mockResolvedValue({});
    const controller = new AdminReportsController({ adminSummary } as never);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AdminReportsController.prototype.summary))
      .toEqual(["user.view", "company.view", "job.view", "audit.view"]);
    const permissions = Object.fromEntries(["user.view", "company.view", "job.view", "audit.view"]
      .map((code) => [code, { scope: "SYSTEM" }]));
    expect(() => controller.summary({ authorization: { permissions: { ...permissions,
      "audit.view": { scope: "OWN" } } } } as never, {})).toThrow(ForbiddenException);
    expect(adminSummary).not.toHaveBeenCalled();
    controller.summary({ authorization: { permissions } } as never, { period: "30d" });
    expect(adminSummary).toHaveBeenCalledWith({ period: "30d" });
  });

  it("requires company membership context, company-wide grants, and application capability", () => {
    const companyRecruitment = jest.fn().mockResolvedValue({});
    const controller = new CompanyReportsController({ companyRecruitment } as never);
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY,
      CompanyReportsController.prototype.recruitment)).toEqual(["company.view", "application.view"]);
    expect(Reflect.getMetadata(REQUIRED_PLATFORM_CAPABILITY_KEY,
      CompanyReportsController.prototype.recruitment)).toBe("application.view");
    const permissions = { "company.view": { scope: "COMPANY" },
      "application.view": { scope: "COMPANY" } };
    expect(() => controller.recruitment(companyId, { companyAuthorization: {
      companyId: foreignJobId, permissions } } as never, {})).toThrow(ForbiddenException);
    expect(() => controller.recruitment(companyId, { companyAuthorization: {
      companyId, permissions: { ...permissions, "application.view": { scope: "ASSIGNED" } } } } as never, {}))
      .toThrow(ForbiddenException);
    expect(companyRecruitment).not.toHaveBeenCalled();
    controller.recruitment(companyId, { companyAuthorization: { companyId, permissions } } as never,
      { period: "7d" });
    expect(companyRecruitment).toHaveBeenCalledWith(companyId, { period: "7d" }, undefined);
  });
});

describe("complete and isolated aggregates", () => {
  it("rejects a foreign job before querying any company aggregates", async () => {
    const db = database();
    db.company.findUnique.mockResolvedValue({ name: "AnhDungEconomy" });
    db.job.findFirst.mockResolvedValue(null);
    const service = new ReportingService(db as unknown as PrismaService);
    await expect(service.companyRecruitment(companyId, { period: "all" }, foreignJobId))
      .rejects.toThrow(NotFoundException);
    expect(db.job.findFirst).toHaveBeenCalledWith({ where: { id: foreignJobId, companyId },
      select: { title: true } });
    expect(db.job.groupBy).not.toHaveBeenCalled();
    expect(db.application.groupBy).not.toHaveBeenCalled();
    expect(db.interview.groupBy).not.toHaveBeenCalled();
  });

  it("scopes every aggregate to the owned job when jobId is provided", async () => {
    const db = database();
    db.company.findUnique.mockResolvedValue({ name: "AnhDungEconomy" });
    db.job.findFirst.mockResolvedValue({ title: "Nhân Viên Kinh Doanh" });
    db.job.groupBy.mockResolvedValue([]);
    db.application.groupBy.mockResolvedValue([]);
    db.application.count.mockResolvedValue(0);
    db.interview.groupBy.mockResolvedValue([]);
    const service = new ReportingService(db as unknown as PrismaService);
    const report = await service.companyRecruitment(companyId, { period: "all" }, foreignJobId);
    expect(report.jobFilter).toEqual({ jobId: foreignJobId, title: "Nhân Viên Kinh Doanh" });
    expect(db.job.groupBy.mock.calls[0][0].where).toEqual({ companyId, id: foreignJobId });
    expect(db.application.groupBy.mock.calls[0][0].where).toEqual({ companyId, jobId: foreignJobId });
    expect(db.application.count.mock.calls[0][0].where).toMatchObject({ companyId, jobId: foreignJobId });
    expect(db.interview.groupBy.mock.calls[0][0].where).toEqual({ companyId,
      application: { jobId: foreignJobId } });
  });

  it("counts every status across all jobs and interviews independently of pipeline stage", async () => {
    const db = database();
    db.company.findUnique.mockResolvedValue({ name: "AnhDungEconomy" });
    db.job.groupBy.mockResolvedValue([grouped("PUBLISHED", 120), grouped("DRAFT", 80),
      grouped("PAUSED", 20), grouped("CLOSED", 10), grouped("EXPIRED", 5), grouped("ARCHIVED", 5)]);
    db.application.groupBy.mockResolvedValue([grouped("SUBMITTED", 300), grouped("REVIEWING", 400),
      grouped("SHORTLISTED", 200), grouped("OFFERED", 5), grouped("REJECTED", 100),
      grouped("WITHDRAWN", 20)]);
    db.application.count.mockResolvedValue(99);
    db.interview.groupBy.mockResolvedValue([grouped("SCHEDULED", 70), grouped("RESCHEDULED", 10),
      grouped("COMPLETED", 30), grouped("CANCELLED", 10)]);
    const service = new ReportingService(db as unknown as PrismaService);
    const startDate = "2026-10-01T00:00:00.000Z";
    const endDate = "2026-10-29T23:59:59.999Z";
    const report = await service.companyRecruitment(companyId, { period: "custom", startDate, endDate });
    expect(report.jobsSummary).toMatchObject({ total: 240, expired: 5, archived: 5 });
    expect(report.pipeline.currentCounts).toMatchObject({ totalApplications: 1025,
      interview: 0, offered: 5, withdrawn: 20 });
    expect(report.pipeline.periodSubmissions).toBe(99);
    expect(report.pipeline.hires).toMatchObject({ status: "UNAVAILABLE", count: null });
    expect(report.interviewsSummary).toEqual({ total: 120, scheduled: 70,
      rescheduled: 10, completed: 30, cancelled: 10 });
    expect(db.application.count).toHaveBeenCalledWith({ where: { companyId,
      submittedAt: { gte: new Date(startDate), lte: new Date(endDate) } } });
    expect(db.interview.groupBy.mock.calls[0][0].where).toEqual({ companyId });
    for (const call of [db.job.groupBy, db.application.groupBy, db.interview.groupBy]) {
      expect(call.mock.calls[0][0]).not.toHaveProperty("take");
      expect(call.mock.calls[0][0]).not.toHaveProperty("skip");
    }
  });

  it("uses full grouped snapshots and audit events rather than current status as period events", async () => {
    const db = database();
    db.user.groupBy.mockResolvedValue([grouped("ACTIVE", 1200), grouped("SUSPENDED", 50),
      grouped("DISABLED", 20)]);
    db.company.groupBy.mockImplementation(({ by }) => by[0] === "status"
      ? Promise.resolve([grouped("ACTIVE", 72), grouped("SUSPENDED", 8), grouped("ARCHIVED", 5)])
      : Promise.resolve([{ verificationStatus: "VERIFIED", _count: { id: 60 } },
        { verificationStatus: "PENDING", _count: { id: 15 } },
        { verificationStatus: "REJECTED", _count: { id: 5 } },
        { verificationStatus: "UNVERIFIED", _count: { id: 5 } }]));
    db.job.groupBy.mockResolvedValue([grouped("PUBLISHED", 210), grouped("DRAFT", 45),
      grouped("PAUSED", 35), grouped("CLOSED", 40), grouped("EXPIRED", 5), grouped("ARCHIVED", 5)]);
    db.application.count.mockImplementation((arg) => Promise.resolve(arg ? 620 : 4820));
    db.user.count.mockResolvedValue(142);
    db.company.count.mockImplementation((arg) => Promise.resolve(arg.where.status === "ACTIVE" ? 14 : 12));
    db.auditLog.count.mockImplementation(({ where }) => Promise.resolve(where.action === "job.publish" ? 48
      : where.action === "admin.job.close" ? 3
        : where.afterData.equals === "VERIFIED" ? 10 : 2));
    const report = await new ReportingService(db as unknown as PrismaService)
      .adminSummary({ period: "custom", startDate: "2026-10-01T00:00:00.000Z",
        endDate: "2026-10-29T23:59:59.999Z" });
    expect(report.snapshot.users.total).toBe(1270);
    expect(report.snapshot.companies.total).toBe(85);
    expect(report.snapshot.jobs).toMatchObject({ total: 340, expired: 5, archived: 5 });
    expect(report.snapshot.applications.total).toBe(4820);
    expect(report.periodEvents).toEqual({ newUsersRegistered: 142, newCompaniesRegistered: 12,
      companiesVerified: 10, companiesRejected: 2, jobsPosted: 48,
      applicationsSubmitted: 620, jobsClosedByAdmin: 3 });
    expect(report.operationalBacklog.pendingVerificationQueue).toBe(14);
    expect(report.commercialStatus.revenueAndBilling.totalRevenueVnd).toBeNull();
    expect(db.auditLog.count.mock.calls.map(([arg]) => arg.where.action))
      .toEqual(["admin.company.verify", "admin.company.verify", "job.publish", "admin.job.close"]);
  });
});
