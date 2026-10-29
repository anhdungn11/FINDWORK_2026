import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { periodDateFilter, publicPeriod, resolveReportPeriod,
  type ReportPeriodQuery } from "./report-period";

type StatusCount = { status: string; _count: { id: number } };
type VerificationCount = { verificationStatus: string; _count: { id: number } };

const count = (rows: readonly StatusCount[], status: string) =>
  rows.find((row) => row.status === status)?._count.id ?? 0;
const total = (rows: readonly { _count: { id: number } }[]) =>
  rows.reduce((sum, row) => sum + row._count.id, 0);
const verificationCount = (rows: readonly VerificationCount[], status: string) =>
  rows.find((row) => row.verificationStatus === status)?._count.id ?? 0;

@Injectable()
export class ReportingService {
  constructor(private readonly db: PrismaService) {}

  async adminSummary(query: ReportPeriodQuery) {
    const period = resolveReportPeriod(query);
    const window = periodDateFilter(period);
    const [users, companies, verification, jobs, applications,
      newUsersRegistered, newCompaniesRegistered, companiesVerified, companiesRejected,
      jobsPosted, applicationsSubmitted, jobsClosedByAdmin, pendingVerificationQueue] = await Promise.all([
      this.db.user.groupBy({ by: ["status"], _count: { id: true } }),
      this.db.company.groupBy({ by: ["status"], _count: { id: true } }),
      this.db.company.groupBy({ by: ["verificationStatus"], _count: { id: true } }),
      this.db.job.groupBy({ by: ["status"], _count: { id: true } }),
      this.db.application.count(),
      this.db.user.count({ where: { createdAt: window } }),
      this.db.company.count({ where: { createdAt: window } }),
      this.db.auditLog.count({ where: { action: "admin.company.verify", createdAt: window,
        afterData: { path: ["verificationStatus"], equals: "VERIFIED" } } }),
      this.db.auditLog.count({ where: { action: "admin.company.verify", createdAt: window,
        afterData: { path: ["verificationStatus"], equals: "REJECTED" } } }),
      this.db.auditLog.count({ where: { action: "job.publish", createdAt: window } }),
      this.db.application.count({ where: { submittedAt: window } }),
      this.db.auditLog.count({ where: { action: "admin.job.close", createdAt: window } }),
      this.db.company.count({ where: { status: "ACTIVE", verificationStatus: "PENDING" } }),
    ]);
    return {
      period: publicPeriod(period),
      snapshot: {
        users: { total: total(users), active: count(users, "ACTIVE"),
          suspended: count(users, "SUSPENDED"), disabled: count(users, "DISABLED") },
        companies: { total: total(companies), active: count(companies, "ACTIVE"),
          suspended: count(companies, "SUSPENDED"), archived: count(companies, "ARCHIVED"),
          verified: verificationCount(verification, "VERIFIED"),
          pendingVerification: verificationCount(verification, "PENDING"),
          rejectedVerification: verificationCount(verification, "REJECTED"),
          unverified: verificationCount(verification, "UNVERIFIED") },
        jobs: { total: total(jobs), published: count(jobs, "PUBLISHED"),
          draft: count(jobs, "DRAFT"), paused: count(jobs, "PAUSED"),
          closed: count(jobs, "CLOSED"), expired: count(jobs, "EXPIRED"),
          archived: count(jobs, "ARCHIVED") },
        applications: { total: applications },
      },
      periodEvents: { newUsersRegistered, newCompaniesRegistered, companiesVerified,
        companiesRejected, jobsPosted, applicationsSubmitted, jobsClosedByAdmin },
      operationalBacklog: { pendingVerificationQueue,
        suspendedUsersQueue: count(users, "SUSPENDED"),
        suspendedCompaniesQueue: count(companies, "SUSPENDED") },
      commercialStatus: {
        revenueAndBilling: { status: "UNAVAILABLE", monetizationActive: null,
          totalRevenueVnd: null, note: "Billing and revenue records are not implemented." },
        enterprisePartnerships: { status: "UNAVAILABLE", activePartnershipsCount: null,
          note: "Partnership records are not implemented." },
      },
    };
  }

  async companyRecruitment(companyId: string, query: ReportPeriodQuery, jobId?: string) {
    const period = resolveReportPeriod(query);
    const company = await this.db.company.findUnique({ where: { id: companyId },
      select: { name: true } });
    if (!company) throw new NotFoundException({ code: "COMPANY_NOT_FOUND" });
    const job = jobId ? await this.db.job.findFirst({ where: { id: jobId, companyId },
      select: { title: true } }) : null;
    if (jobId && !job) throw new NotFoundException({ code: "JOB_NOT_FOUND" });
    const scopedJob = { companyId, ...(jobId && { id: jobId }) };
    const scopedApplication = { companyId, ...(jobId && { jobId }) };
    const scopedInterview = { companyId, ...(jobId && { application: { jobId } }) };
    const [jobs, applications, periodSubmissions, interviews] = await Promise.all([
      this.db.job.groupBy({ by: ["status"], where: scopedJob, _count: { id: true } }),
      this.db.application.groupBy({ by: ["status"], where: scopedApplication, _count: { id: true } }),
      this.db.application.count({ where: { ...scopedApplication,
        submittedAt: periodDateFilter(period) } }),
      this.db.interview.groupBy({ by: ["status"], where: scopedInterview, _count: { id: true } }),
    ]);
    return {
      companyId, companyName: company.name, period: publicPeriod(period),
      jobFilter: { jobId: jobId ?? null, title: job?.title ?? "Tất cả tin tuyển dụng" },
      jobsSummary: { total: total(jobs), published: count(jobs, "PUBLISHED"),
        draft: count(jobs, "DRAFT"), paused: count(jobs, "PAUSED"),
        closed: count(jobs, "CLOSED"), expired: count(jobs, "EXPIRED"),
        archived: count(jobs, "ARCHIVED") },
      pipeline: {
        currentCounts: { totalApplications: total(applications), draft: count(applications, "DRAFT"),
          submitted: count(applications, "SUBMITTED"), reviewing: count(applications, "REVIEWING"),
          shortlisted: count(applications, "SHORTLISTED"), interview: count(applications, "INTERVIEW"),
          offered: count(applications, "OFFERED"), rejected: count(applications, "REJECTED"),
          withdrawn: count(applications, "WITHDRAWN") },
        periodSubmissions,
        hires: { status: "UNAVAILABLE", count: null,
          note: "No hire outcome is recorded; offers are not hires." },
      },
      interviewsSummary: { total: total(interviews), scheduled: count(interviews, "SCHEDULED"),
        rescheduled: count(interviews, "RESCHEDULED"),
        completed: count(interviews, "COMPLETED"), cancelled: count(interviews, "CANCELLED") },
      commercialPackage: { status: "UNAVAILABLE", tier: null, activeJobsLimit: null,
        paymentActive: null, note: "Company package and payment records are not implemented." },
    };
  }
}
