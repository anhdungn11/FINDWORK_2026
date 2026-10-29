import type { AdminDashboardCounts } from "../../services/api/adminApi";
import { ApiFailure } from "../../services/api/apiFailure";

export class ReportContractError extends ApiFailure {
  constructor(message: string, details?: unknown) {
    super("validation", 422, "REPORT_CONTRACT_ERROR", message, details);
    this.name = "ReportContractError";
  }
}

export type ReportPeriodKey = "7d" | "30d" | "90d" | "all" | "custom";

export const REPORT_PERIOD_LABELS: Record<ReportPeriodKey, string> = {
  "30d": "30 ngày gần nhất (Mặc định)",
  "7d": "7 ngày gần nhất",
  "90d": "90 ngày gần nhất",
  "all": "Toàn bộ thời gian (Tất cả)",
  "custom": "Tùy chỉnh khoảng thời gian",
};

export interface ReportPeriodDto {
  key: ReportPeriodKey | string;
  startDate: string | null;
  endDate: string;
  generatedAt: string;
}

export interface AdminReportSummaryDto {
  period: ReportPeriodDto;
  snapshot: {
    users: { total: number; active: number; suspended: number; disabled: number };
    companies: {
      total: number;
      active: number;
      suspended: number;
      archived: number;
      verified: number;
      pendingVerification: number;
      rejectedVerification: number;
      unverified: number;
    };
    jobs: {
      total: number;
      published: number;
      draft: number;
      paused: number;
      closed: number;
      expired: number;
      archived: number;
    };
    applications: { total: number };
  };
  periodEvents: {
    newUsersRegistered: number;
    newCompaniesRegistered: number;
    companiesVerified: number;
    companiesRejected: number;
    jobsPosted: number;
    applicationsSubmitted: number;
    jobsClosedByAdmin: number;
  };
  operationalBacklog: {
    pendingVerificationQueue: number;
    suspendedUsersQueue: number;
    suspendedCompaniesQueue: number;
  };
  commercialStatus: {
    revenueAndBilling: {
      status: "UNAVAILABLE" | string;
      monetizationActive: boolean | null;
      totalRevenueVnd: number | null;
      note: string;
    };
    enterprisePartnerships: {
      status: "UNAVAILABLE" | string;
      activePartnershipsCount: number | null;
      note: string;
    };
  };
}


export type EmployerJobCountsSummary = EmployerJobsSummaryDto;
export type PipelineSummary = NormalizedPipelineSummary;
export type InterviewSummary = EmployerInterviewsSummaryDto;

export interface EmployerJobsSummaryDto {
  total: number;
  published: number;
  draft: number;
  paused: number;
  closed: number;
  expired: number;
  archived: number;
}

export interface RawPipelineCurrentCounts {
  totalApplications?: number;
  draft?: number;
  submitted?: number;
  reviewing?: number;
  shortlisted?: number;
  interview?: number;
  offered?: number;
  rejected?: number;
  withdrawn?: number;
  total?: number;
  DRAFT?: number;
  SUBMITTED?: number;
  REVIEWING?: number;
  SHORTLISTED?: number;
  INTERVIEW?: number;
  OFFERED?: number;
  REJECTED?: number;
  WITHDRAWN?: number;
}

export interface NormalizedPipelineSummary {
  total: number;
  DRAFT: number;
  SUBMITTED: number;
  REVIEWING: number;
  SHORTLISTED: number;
  INTERVIEW: number;
  OFFERED: number;
  REJECTED: number;
  WITHDRAWN: number;
}

export interface EmployerInterviewsSummaryDto {
  total: number;
  scheduled: number;
  rescheduled: number;
  completed: number;
  cancelled: number;
}

export interface CompanyRecruitmentReportDto {
  companyId: string;
  companyName: string;
  period: ReportPeriodDto;
  jobFilter: {
    jobId: string | null;
    title: string;
  };
  jobsSummary: EmployerJobsSummaryDto;
  pipeline: {
    currentCounts: NormalizedPipelineSummary;
    periodSubmissions: number;
    hires: {
      status: "UNAVAILABLE" | string;
      count: number | null;
      note: string;
    };
  };
  interviewsSummary: EmployerInterviewsSummaryDto;
  commercialPackage: {
    status: "UNAVAILABLE" | string;
    tier: string | null;
    activeJobsLimit: number | null;
    paymentActive: boolean | null;
    note: string;
  };
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

export function expectRecord(val: unknown, fieldPath: string): Record<string, unknown> {
  if (!isRecord(val)) {
    throw new ReportContractError(`Dữ liệu '${fieldPath}' không hợp lệ hoặc thiếu trong phản hồi từ máy chủ (cần dạng đối tượng).`);
  }
  return val;
}

export function expectString(val: unknown, fieldPath: string, fallback?: string): string {
  if (typeof val === "string" && val.length > 0) return val;
  if (fallback !== undefined) return fallback;
  throw new ReportContractError(`Trường chuỗi '${fieldPath}' bị thiếu hoặc không hợp lệ.`);
}

export function expectNullableString(val: unknown, fieldPath: string): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val;
  throw new ReportContractError(`Trường '${fieldPath}' phải là chuỗi hoặc null.`);
}

export function expectNonNegativeInt(val: unknown, fieldPath: string): number {
  if (typeof val === "number" && Number.isInteger(val) && val >= 0) {
    return val;
  }
  throw new ReportContractError(
    `Chỉ số '${fieldPath}' phải là số nguyên không âm (nhận được: ${val === null ? "null" : typeof val === "undefined" ? "undefined" : JSON.stringify(val)}). Không thể tự động thay thế bằng 0.`
  );
}

export function expectNullableNonNegativeInt(val: unknown, fieldPath: string): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && Number.isInteger(val) && val >= 0) {
    return val;
  }
  throw new ReportContractError(
    `Chỉ số '${fieldPath}' phải là số nguyên không âm hoặc null (nhận được: ${JSON.stringify(val)}).`
  );
}

export function expectNullableBoolean(val: unknown, fieldPath: string): boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "boolean") return val;
  throw new ReportContractError(`Trường '${fieldPath}' phải là boolean hoặc null.`);
}

function normalizePeriod(raw: unknown, path = "period"): ReportPeriodDto {
  const rec = expectRecord(raw, path);
  const key = expectString(rec.key, `${path}.key`);
  const startDate = expectNullableString(rec.startDate, `${path}.startDate`);
  const endDate = expectString(rec.endDate, `${path}.endDate`);
  const generatedAt = expectString(rec.generatedAt, `${path}.generatedAt`);

  return {
    key,
    startDate,
    endDate,
    generatedAt,
  };
}

function extractStageCount(rec: Record<string, unknown>, lowerKey: string, upperKey: string, path: string): number {
  if (lowerKey in rec && rec[lowerKey] !== undefined) {
    return expectNonNegativeInt(rec[lowerKey], `${path}.${lowerKey}`);
  }
  if (upperKey in rec && rec[upperKey] !== undefined) {
    return expectNonNegativeInt(rec[upperKey], `${path}.${upperKey}`);
  }
  throw new ReportContractError(`Thiếu chỉ số '${path}.${lowerKey}' (hoặc '${upperKey}') trong luồng ứng tuyển.`);
}

export function normalizePipelineCounts(raw: unknown, path = "pipeline.currentCounts"): NormalizedPipelineSummary {
  const rec = expectRecord(raw, path);
  let total: number;
  if ("totalApplications" in rec && rec.totalApplications !== undefined) {
    total = expectNonNegativeInt(rec.totalApplications, `${path}.totalApplications`);
  } else if ("total" in rec && rec.total !== undefined) {
    total = expectNonNegativeInt(rec.total, `${path}.total`);
  } else {
    throw new ReportContractError(`Thiếu chỉ số tổng số ứng viên ('${path}.totalApplications' hoặc '${path}.total').`);
  }

  const draft = extractStageCount(rec, "draft", "DRAFT", path);
  const submitted = extractStageCount(rec, "submitted", "SUBMITTED", path);
  const reviewing = extractStageCount(rec, "reviewing", "REVIEWING", path);
  const shortlisted = extractStageCount(rec, "shortlisted", "SHORTLISTED", path);
  const interview = extractStageCount(rec, "interview", "INTERVIEW", path);
  const offered = extractStageCount(rec, "offered", "OFFERED", path);
  const rejected = extractStageCount(rec, "rejected", "REJECTED", path);
  const withdrawn = extractStageCount(rec, "withdrawn", "WITHDRAWN", path);

  const sumOfStages = draft + submitted + reviewing + shortlisted + interview + offered + rejected + withdrawn;
  return {
    total: Math.max(total, sumOfStages),
    DRAFT: draft,
    SUBMITTED: submitted,
    REVIEWING: reviewing,
    SHORTLISTED: shortlisted,
    INTERVIEW: interview,
    OFFERED: offered,
    REJECTED: rejected,
    WITHDRAWN: withdrawn,
  };
}

export function normalizeAdminReport(raw: unknown): AdminReportSummaryDto {
  const r = expectRecord(raw, "adminReport");
  const period = normalizePeriod(r.period, "period");
  const snap = expectRecord(r.snapshot, "snapshot");

  const u = expectRecord(snap.users, "snapshot.users");
  const users = {
    total: expectNonNegativeInt(u.total, "snapshot.users.total"),
    active: expectNonNegativeInt(u.active, "snapshot.users.active"),
    suspended: expectNonNegativeInt(u.suspended, "snapshot.users.suspended"),
    disabled: expectNonNegativeInt(u.disabled, "snapshot.users.disabled"),
  };

  const c = expectRecord(snap.companies, "snapshot.companies");
  const companies = {
    total: expectNonNegativeInt(c.total, "snapshot.companies.total"),
    active: expectNonNegativeInt(c.active, "snapshot.companies.active"),
    suspended: expectNonNegativeInt(c.suspended, "snapshot.companies.suspended"),
    archived: expectNonNegativeInt(c.archived, "snapshot.companies.archived"),
    verified: expectNonNegativeInt(c.verified, "snapshot.companies.verified"),
    pendingVerification: expectNonNegativeInt(c.pendingVerification, "snapshot.companies.pendingVerification"),
    rejectedVerification: expectNonNegativeInt(c.rejectedVerification, "snapshot.companies.rejectedVerification"),
    unverified: expectNonNegativeInt(c.unverified, "snapshot.companies.unverified"),
  };

  const j = expectRecord(snap.jobs, "snapshot.jobs");
  const jobs = {
    total: expectNonNegativeInt(j.total, "snapshot.jobs.total"),
    published: expectNonNegativeInt(j.published, "snapshot.jobs.published"),
    draft: expectNonNegativeInt(j.draft, "snapshot.jobs.draft"),
    paused: expectNonNegativeInt(j.paused, "snapshot.jobs.paused"),
    closed: expectNonNegativeInt(j.closed, "snapshot.jobs.closed"),
    expired: expectNonNegativeInt(j.expired, "snapshot.jobs.expired"),
    archived: expectNonNegativeInt(j.archived, "snapshot.jobs.archived"),
  };

  const a = expectRecord(snap.applications, "snapshot.applications");
  const applications = {
    total: expectNonNegativeInt(a.total, "snapshot.applications.total"),
  };

  const pe = expectRecord(r.periodEvents, "periodEvents");
  const periodEvents = {
    newUsersRegistered: expectNonNegativeInt(pe.newUsersRegistered, "periodEvents.newUsersRegistered"),
    newCompaniesRegistered: expectNonNegativeInt(pe.newCompaniesRegistered, "periodEvents.newCompaniesRegistered"),
    companiesVerified: expectNonNegativeInt(pe.companiesVerified, "periodEvents.companiesVerified"),
    companiesRejected: expectNonNegativeInt(pe.companiesRejected, "periodEvents.companiesRejected"),
    jobsPosted: expectNonNegativeInt(pe.jobsPosted, "periodEvents.jobsPosted"),
    applicationsSubmitted: expectNonNegativeInt(pe.applicationsSubmitted, "periodEvents.applicationsSubmitted"),
    jobsClosedByAdmin: expectNonNegativeInt(pe.jobsClosedByAdmin, "periodEvents.jobsClosedByAdmin"),
  };

  const ob = expectRecord(r.operationalBacklog, "operationalBacklog");
  const operationalBacklog = {
    pendingVerificationQueue: expectNonNegativeInt(ob.pendingVerificationQueue, "operationalBacklog.pendingVerificationQueue"),
    suspendedUsersQueue: expectNonNegativeInt(ob.suspendedUsersQueue, "operationalBacklog.suspendedUsersQueue"),
    suspendedCompaniesQueue: expectNonNegativeInt(ob.suspendedCompaniesQueue, "operationalBacklog.suspendedCompaniesQueue"),
  };

  const cs = expectRecord(r.commercialStatus, "commercialStatus");
  const rb = expectRecord(cs.revenueAndBilling, "commercialStatus.revenueAndBilling");
  const revenueAndBilling = {
    status: expectString(rb.status, "commercialStatus.revenueAndBilling.status", "UNAVAILABLE"),
    monetizationActive: expectNullableBoolean(rb.monetizationActive, "commercialStatus.revenueAndBilling.monetizationActive"),
    totalRevenueVnd: expectNullableNonNegativeInt(rb.totalRevenueVnd, "commercialStatus.revenueAndBilling.totalRevenueVnd"),
    note: expectString(rb.note, "commercialStatus.revenueAndBilling.note", "Chưa triển khai ghi nhận doanh thu và thanh toán."),
  };

  const ep = expectRecord(cs.enterprisePartnerships, "commercialStatus.enterprisePartnerships");
  const enterprisePartnerships = {
    status: expectString(ep.status, "commercialStatus.enterprisePartnerships.status", "UNAVAILABLE"),
    activePartnershipsCount: expectNullableNonNegativeInt(ep.activePartnershipsCount, "commercialStatus.enterprisePartnerships.activePartnershipsCount"),
    note: expectString(ep.note, "commercialStatus.enterprisePartnerships.note", "Chưa triển khai ghi nhận chương trình đối tác."),
  };

  return {
    period,
    snapshot: {
      users,
      companies,
      jobs,
      applications,
    },
    periodEvents,
    operationalBacklog,
    commercialStatus: {
      revenueAndBilling,
      enterprisePartnerships,
    },
  };
}

export function normalizeCompanyRecruitmentReport(raw: unknown): CompanyRecruitmentReportDto {
  const r = expectRecord(raw, "recruitmentReport");
  const companyId = expectString(r.companyId, "companyId");
  const companyName = expectString(r.companyName, "companyName", "Doanh nghiệp");
  const period = normalizePeriod(r.period, "period");

  const jf = expectRecord(r.jobFilter, "jobFilter");
  const jobFilter = {
    jobId: expectNullableString(jf.jobId, "jobFilter.jobId"),
    title: expectString(jf.title, "jobFilter.title", "Tất cả tin tuyển dụng"),
  };

  const js = expectRecord(r.jobsSummary, "jobsSummary");
  const jobsSummary = {
    total: expectNonNegativeInt(js.total, "jobsSummary.total"),
    published: expectNonNegativeInt(js.published, "jobsSummary.published"),
    draft: expectNonNegativeInt(js.draft, "jobsSummary.draft"),
    paused: expectNonNegativeInt(js.paused, "jobsSummary.paused"),
    closed: expectNonNegativeInt(js.closed, "jobsSummary.closed"),
    expired: expectNonNegativeInt(js.expired, "jobsSummary.expired"),
    archived: expectNonNegativeInt(js.archived, "jobsSummary.archived"),
  };

  const pipe = expectRecord(r.pipeline, "pipeline");
  const currentCounts = normalizePipelineCounts(pipe.currentCounts, "pipeline.currentCounts");
  const periodSubmissions = expectNonNegativeInt(pipe.periodSubmissions, "pipeline.periodSubmissions");

  const hires = expectRecord(pipe.hires, "pipeline.hires");
  const hiresObj = {
    status: expectString(hires.status, "pipeline.hires.status", "UNAVAILABLE"),
    count: expectNullableNonNegativeInt(hires.count, "pipeline.hires.count"),
    note: expectString(hires.note, "pipeline.hires.note", "Chưa ghi nhận kết quả tuyển dụng (Lời mời nhận việc chưa phải kết quả tuyển)."),
  };

  const int = expectRecord(r.interviewsSummary, "interviewsSummary");
  const interviewsSummary = {
    total: expectNonNegativeInt(int.total, "interviewsSummary.total"),
    scheduled: expectNonNegativeInt(int.scheduled, "interviewsSummary.scheduled"),
    rescheduled: expectNonNegativeInt(int.rescheduled, "interviewsSummary.rescheduled"),
    completed: expectNonNegativeInt(int.completed, "interviewsSummary.completed"),
    cancelled: expectNonNegativeInt(int.cancelled, "interviewsSummary.cancelled"),
  };

  const cp = expectRecord(r.commercialPackage, "commercialPackage");
  const commercialPackage = {
    status: expectString(cp.status, "commercialPackage.status", "UNAVAILABLE"),
    tier: expectNullableString(cp.tier, "commercialPackage.tier"),
    activeJobsLimit: expectNullableNonNegativeInt(cp.activeJobsLimit, "commercialPackage.activeJobsLimit"),
    paymentActive: expectNullableBoolean(cp.paymentActive, "commercialPackage.paymentActive"),
    note: expectString(cp.note, "commercialPackage.note", "Chưa triển khai gói dịch vụ thu phí hoặc hạn mức đăng tin."),
  };

  return {
    companyId,
    companyName,
    period,
    jobFilter,
    jobsSummary,
    pipeline: {
      currentCounts,
      periodSubmissions,
      hires: hiresObj,
    },
    interviewsSummary,
    commercialPackage,
  };
}

export function buildAdminReportCsv(report: AdminReportSummaryDto | AdminDashboardCounts): string {
  const isFullReport = "periodEvents" in report;
  const full = isFullReport ? (report as AdminReportSummaryDto) : null;
  const d = isFullReport ? (report as AdminReportSummaryDto).snapshot : (report as AdminDashboardCounts);

  const generatedAt = full?.period.generatedAt ?? new Date().toISOString();
  const periodKey = full?.period.key ?? "all";
  const periodLabel = REPORT_PERIOD_LABELS[periodKey as ReportPeriodKey] ?? periodKey;

  const users =
    "users" in d && typeof d.users === "object" && d.users !== null
      ? (d.users as { total: number; active: number; suspended: number; disabled: number })
      : {
          total: "users" in d && typeof d.users === "number" ? d.users : 0,
          active: "activeUsers" in d && typeof d.activeUsers === "number" ? d.activeUsers : 0,
          suspended: 0,
          disabled: 0,
        };
  const companies =
    "companies" in d && typeof d.companies === "object" && d.companies !== null
      ? (d.companies as {
          total: number;
          active: number;
          suspended: number;
          archived: number;
          verified: number;
          pendingVerification: number;
          rejectedVerification: number;
          unverified: number;
        })
      : {
          total: "companies" in d && typeof d.companies === "number" ? d.companies : 0,
          active: "activeCompanies" in d && typeof d.activeCompanies === "number" ? d.activeCompanies : 0,
          pendingVerification: "pendingCompanies" in d && typeof d.pendingCompanies === "number" ? d.pendingCompanies : 0,
          suspended: 0,
          archived: 0,
          verified: 0,
          rejectedVerification: 0,
          unverified: 0,
        };
  const jobs =
    "jobs" in d && typeof d.jobs === "object" && d.jobs !== null
      ? (d.jobs as {
          total: number;
          published: number;
          draft: number;
          paused: number;
          closed: number;
          expired: number;
          archived: number;
        })
      : {
          total: "jobs" in d && typeof d.jobs === "number" ? d.jobs : 0,
          published: "publishedJobs" in d && typeof d.publishedJobs === "number" ? d.publishedJobs : 0,
          draft: 0,
          paused: 0,
          closed: 0,
          expired: 0,
          archived: 0,
        };
  const applications =
    "applications" in d && typeof d.applications === "object" && d.applications !== null
      ? (d.applications as { total: number }).total ?? 0
      : typeof (d as { applications?: number }).applications === "number"
      ? (d as { applications: number }).applications
      : 0;

  const rows = [
    ["BÁO CÁO TIẾN ĐỘ & VẬN HÀNH NỀN TẢNG FINDWORK", ""],
    ["Thời gian tạo báo cáo", generatedAt],
    ["Chu kỳ báo cáo", periodLabel],
    ["Khoảng thời gian bắt đầu", full?.period.startDate ?? "Toàn bộ thời gian"],
    ["Khoảng thời gian kết thúc", full?.period.endDate ?? generatedAt],
    ["", ""],
    ["1. HIỆN TRẠNG TÍCH LŨY TOÀN SÀN (ALL-TIME SNAPSHOT)", "SỐ LƯỢNG"],
    ["Tổng số tài khoản người dùng", users.total.toString()],
    ["- Người dùng đang hoạt động (ACTIVE)", users.active.toString()],
    ["- Người dùng bị tạm khóa (SUSPENDED)", users.suspended.toString()],
    ["- Người dùng bị vô hiệu hóa (DISABLED)", users.disabled.toString()],
    ["Tổng số doanh nghiệp đăng ký", companies.total.toString()],
    ["- Doanh nghiệp đang hoạt động (ACTIVE)", companies.active.toString()],
    ["- Doanh nghiệp tạm dừng (SUSPENDED)", companies.suspended.toString()],
    ["- Doanh nghiệp lưu trữ (ARCHIVED)", companies.archived.toString()],
    ["- Doanh nghiệp đã xác minh (VERIFIED)", companies.verified.toString()],
    ["- Doanh nghiệp chờ xác minh (PENDING)", companies.pendingVerification.toString()],
    ["- Doanh nghiệp bị từ chối xác minh (REJECTED)", companies.rejectedVerification.toString()],
    ["- Doanh nghiệp chưa gửi hồ sơ (UNVERIFIED)", companies.unverified.toString()],
    ["Tổng số tin tuyển dụng", jobs.total.toString()],
    ["- Đang công khai (PUBLISHED)", jobs.published.toString()],
    ["- Bản nháp (DRAFT)", jobs.draft.toString()],
    ["- Tạm dừng (PAUSED)", jobs.paused.toString()],
    ["- Đã đóng (CLOSED)", jobs.closed.toString()],
    ["- Hết hạn (EXPIRED)", jobs.expired.toString()],
    ["- Lưu trữ (ARCHIVED)", jobs.archived.toString()],
    ["Tổng số lượt nộp hồ sơ toàn sàn", applications.toString()],
    ["", ""],
    ["2. BIẾN ĐỘNG TRONG CHU KỲ (PERIOD EVENTS)", "SỐ LƯỢNG PHÁT SINH"],
    ...(full
      ? [
          ["Người dùng mới đăng ký", full.periodEvents.newUsersRegistered.toString()],
          ["Doanh nghiệp mới đăng ký", full.periodEvents.newCompaniesRegistered.toString()],
          ["Doanh nghiệp được duyệt xác minh", full.periodEvents.companiesVerified.toString()],
          ["Doanh nghiệp bị từ chối xác minh", full.periodEvents.companiesRejected.toString()],
          ["Tin tuyển dụng đăng mới / công khai", full.periodEvents.jobsPosted.toString()],
          ["Hồ sơ ứng tuyển mới nộp", full.periodEvents.applicationsSubmitted.toString()],
          ["Tin tuyển dụng bị Admin đóng", full.periodEvents.jobsClosedByAdmin.toString()],
        ]
      : [
          ["Sự kiện theo chu kỳ", "Chưa khả dụng trên phiên bản hiện tại"],
        ]),
    ["", ""],
    ["3. HÀNG ĐỢI VẬN HÀNH CẦN XỬ LÝ (BACKLOG QUEUE)", "SỐ LƯỢNG TỒN ĐỌNG"],
    ...(full
      ? [
          ["Doanh nghiệp chờ xét duyệt (Active & Pending)", full.operationalBacklog.pendingVerificationQueue.toString()],
          ["Tài khoản người dùng cần rà soát (Suspended)", full.operationalBacklog.suspendedUsersQueue.toString()],
          ["Doanh nghiệp tạm khóa cần rà soát (Suspended)", full.operationalBacklog.suspendedCompaniesQueue.toString()],
        ]
      : [
          ["Doanh nghiệp chờ xét duyệt", companies.pendingVerification.toString()],
          ["Người dùng cần rà soát", users.suspended.toString()],
        ]),
    ["", ""],
    ["4. PHÂN HỆ KINH DOANH THƯƠNG MẠI", "TRẠNG THÁI"],
    ["Doanh thu & Giao dịch thanh toán", full?.commercialStatus.revenueAndBilling.note ?? "Chưa triển khai gói thu phí trên phiên bản hiện tại."],
    ["Hợp tác đối tác doanh nghiệp", full?.commercialStatus.enterprisePartnerships.note ?? "Chưa triển khai chương trình đối tác."],
  ];

  return "\uFEFF" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

export function buildAdminReportJson(report: AdminReportSummaryDto | AdminDashboardCounts): object {
  if ("periodEvents" in report) {
    return report;
  }
  const d = report;
  const inactiveUsers = Math.max(0, d.users - d.activeUsers);
  const inactiveCompanies = Math.max(0, d.companies - d.activeCompanies);
  return {
    reportType: "FINDWORK_ADMIN_PROGRESS_REPORT",
    generatedAt: new Date().toISOString(),
    scope: "PLATFORM_SNAPSHOT",
    snapshot: {
      users: { total: d.users, active: d.activeUsers, inactive: inactiveUsers },
      companies: {
        total: d.companies,
        active: d.activeCompanies,
        pendingVerification: d.pendingCompanies,
        suspendedOrArchived: inactiveCompanies,
      },
      jobs: { total: d.jobs, published: d.publishedJobs },
      applications: { total: d.applications },
    },
    operationalBacklog: {
      pendingCompaniesToVerify: d.pendingCompanies,
      inactiveUsersToReview: inactiveUsers,
    },
    commercialModules: {
      revenueAndBilling: { status: "UNIMPLEMENTED", monetizationActive: false },
      enterprisePartnerships: { status: "UNIMPLEMENTED", activePartnerships: 0 },
    },
  };
}

export type EmployerReportParam =
  | CompanyRecruitmentReportDto
  | {
      companyId?: string;
      companyName: string;
      selectedJobId?: string | null;
      selectedJobTitle?: string;
      jobCounts: { total: number; published: number; draft: number; paused: number; closed: number; expired?: number; archived?: number };
      pipeline?: unknown;
      interviews?: unknown;
    };

export function buildEmployerReportCsv(report: EmployerReportParam): string {
  if (!("period" in report)) {
    const legacy = report;
    const generatedAt = new Date().toISOString();
    const rows = [
      ["BÁO CÁO TIẾN ĐỘ TUYỂN DỤNG DOANH NGHIỆP - FINDWORK", ""],
      ["Doanh nghiệp", legacy.companyName],
      ["Mã doanh nghiệp", legacy.companyId ?? "N/A"],
      ["Thời gian xuất báo cáo", generatedAt],
      ["Chu kỳ báo cáo", "Toàn bộ thời gian (Tất cả)"],
      ["Khoảng thời gian", "Khởi tạo - Hiện tại"],
      ["Phạm vi tin tuyển dụng", legacy.selectedJobTitle ?? "Tất cả tin tuyển dụng"],
      ["", ""],
      ["1. HIỆN TRẠNG TIN TUYỂN DỤNG (JOBS SUMMARY)", "SỐ LƯỢNG"],
      ["Tổng số tin tuyển dụng", (legacy.jobCounts.total ?? 0).toString()],
      ["- Đang công khai (PUBLISHED)", (legacy.jobCounts.published ?? 0).toString()],
      ["- Bản nháp (DRAFT)", (legacy.jobCounts.draft ?? 0).toString()],
      ["- Tạm dừng (PAUSED)", (legacy.jobCounts.paused ?? 0).toString()],
      ["- Đã đóng (CLOSED)", (legacy.jobCounts.closed ?? 0).toString()],
      ["- Hết hạn (EXPIRED)", (legacy.jobCounts.expired ?? 0).toString()],
      ["- Lưu trữ (ARCHIVED)", (legacy.jobCounts.archived ?? 0).toString()],
      ["", ""],
      ["2. PHỄU ỨNG VIÊN & LUỒNG XÉT DUYỆT (PIPELINE)", "SỐ LƯỢNG"],
      ["Trạng thái luồng tuyển dụng", legacy.pipeline ? "Có dữ liệu" : "Chưa khả dụng trên phiên bản hiện tại"],
      ["", ""],
      ["3. TỔ CHỨC PHỎNG VẤN ỨNG VIÊN", "SỐ LƯỢNG"],
      ["Trạng thái lịch phỏng vấn", legacy.interviews ? "Có dữ liệu" : "Chưa khả dụng trên phiên bản hiện tại"],
      ["", ""],
      ["4. GÓI DỊCH VỤ DOANH NGHIỆP", "TRẠNG THÁI"],
      ["Gói dịch vụ thương mại", "Gói tiêu chuẩn FINDWORK (Miễn phí) - Chưa triển khai gói thu phí"],
    ];
    return "\uFEFF" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  }

  const generatedAt = report.period.generatedAt;
  const periodLabel = REPORT_PERIOD_LABELS[report.period.key as ReportPeriodKey] ?? report.period.key;

  const js = report.jobsSummary;
  const p = report.pipeline.currentCounts;
  const int = report.interviewsSummary;

  const rows = [
    ["BÁO CÁO TIẾN ĐỘ TUYỂN DỤNG DOANH NGHIỆP - FINDWORK", ""],
    ["Doanh nghiệp", report.companyName],
    ["Mã doanh nghiệp", report.companyId],
    ["Thời gian xuất báo cáo", generatedAt],
    ["Chu kỳ báo cáo", periodLabel],
    ["Khoảng thời gian", `${report.period.startDate ?? "Bắt đầu"} - ${report.period.endDate}`],
    ["Phạm vi tin tuyển dụng", report.jobFilter.title],
    ["", ""],
    ["1. HIỆN TRẠNG TIN TUYỂN DỤNG (JOBS SUMMARY)", "SỐ LƯỢNG"],
    ["Tổng số tin tuyển dụng", js.total.toString()],
    ["- Đang công khai (PUBLISHED)", js.published.toString()],
    ["- Bản nháp (DRAFT)", js.draft.toString()],
    ["- Tạm dừng (PAUSED)", js.paused.toString()],
    ["- Đã đóng (CLOSED)", js.closed.toString()],
    ["- Hết hạn (EXPIRED)", js.expired.toString()],
    ["- Lưu trữ (ARCHIVED)", js.archived.toString()],
    ["", ""],
    ["2. PHỄU ỨNG VIÊN & LUỒNG XÉT DUYỆT (PIPELINE)", "SỐ LƯỢNG"],
    ["Tổng lượt hồ sơ tiếp nhận", p.total.toString()],
    ["- Hồ sơ nháp (DRAFT)", p.DRAFT.toString()],
    ["- Mới nộp (SUBMITTED)", p.SUBMITTED.toString()],
    ["- Đang xem xét (REVIEWING)", p.REVIEWING.toString()],
    ["- Đã chọn lọc (SHORTLISTED)", p.SHORTLISTED.toString()],
    ["- Vòng phỏng vấn (INTERVIEW)", p.INTERVIEW.toString()],
    ["- Đã gửi đề nghị (OFFERED)", p.OFFERED.toString()],
    ["- Đã từ chối (REJECTED)", p.REJECTED.toString()],
    ["- Ứng viên rút hồ sơ (WITHDRAWN)", p.WITHDRAWN.toString()],
    ["", ""],
    ["3. SỰ KIỆN ỨNG TUYỂN TRONG CHU KỲ", "SỐ LƯỢNG"],
    ["Hồ sơ nộp trong chu kỳ đã chọn", report.pipeline.periodSubmissions.toString()],
    ["Kết quả tuyển dụng hoàn tất (Hires)", report.pipeline.hires.note],
    ["", ""],
    ["4. TỔ CHỨC PHỎNG VẤN ỨNG VIÊN", "SỐ LƯỢNG"],
    ["Tổng số lượt phỏng vấn đã thiết lập", int.total.toString()],
    ["- Lịch phỏng vấn sắp tới (SCHEDULED)", int.scheduled.toString()],
    ["- Lịch phỏng vấn đã dời (RESCHEDULED)", int.rescheduled.toString()],
    ["- Phỏng vấn đã hoàn thành (COMPLETED)", int.completed.toString()],
    ["- Lịch phỏng vấn đã hủy (CANCELLED)", int.cancelled.toString()],
    ["", ""],
    ["5. GÓI DỊCH VỤ DOANH NGHIỆP", "TRẠNG THÁI"],
    ["Gói dịch vụ thương mại", report.commercialPackage.note],
  ];

  return "\uFEFF" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

export function buildEmployerReportJson(report: EmployerReportParam): object {
  if (!("period" in report)) {
    const legacy = report;
    return {
      reportType: "FINDWORK_EMPLOYER_RECRUITMENT_REPORT",
      generatedAt: new Date().toISOString(),
      company: { id: legacy.companyId ?? "UNKNOWN", name: legacy.companyName },
      selectedJobTitle: legacy.selectedJobTitle,
      jobSummary: legacy.jobCounts,
      applicationPipeline: legacy.pipeline ? legacy.pipeline : { status: "UNAVAILABLE_ON_SERVER" },
      interviewsSummary: legacy.interviews ? legacy.interviews : { status: "UNAVAILABLE_ON_SERVER" },
      commercialTier: { tierName: "FREE_STANDARD", billingActive: false },
    };
  }
  return report;
}
