import type { AdminDashboardCounts } from "../../services/api/adminApi";

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

const safeNum = (val: unknown, fallback = 0): number => {
  if (typeof val === "number" && Number.isFinite(val)) return Math.max(0, Math.floor(val));
  if (typeof val === "string") {
    const parsed = parseInt(val, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return fallback;
};

const safeStr = (val: unknown, fallback = ""): string =>
  typeof val === "string" ? val : fallback;

export function normalizePipelineCounts(raw: unknown): NormalizedPipelineSummary {
  const r = (raw && typeof raw === "object" ? raw : {}) as RawPipelineCurrentCounts;
  const total = safeNum(r.totalApplications ?? r.total);
  const draft = safeNum(r.draft ?? r.DRAFT);
  const submitted = safeNum(r.submitted ?? r.SUBMITTED);
  const reviewing = safeNum(r.reviewing ?? r.REVIEWING);
  const shortlisted = safeNum(r.shortlisted ?? r.SHORTLISTED);
  const interview = safeNum(r.interview ?? r.INTERVIEW);
  const offered = safeNum(r.offered ?? r.OFFERED);
  const rejected = safeNum(r.rejected ?? r.REJECTED);
  const withdrawn = safeNum(r.withdrawn ?? r.WITHDRAWN);

  return {
    total: Math.max(total, draft + submitted + reviewing + shortlisted + interview + offered + rejected + withdrawn),
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
  const r = (raw && typeof raw === "object" ? raw : {}) as any;
  const p = (r.period && typeof r.period === "object" ? r.period : {}) as any;
  const snap = (r.snapshot && typeof r.snapshot === "object" ? r.snapshot : {}) as any;
  const u = (snap.users && typeof snap.users === "object" ? snap.users : {}) as any;
  const c = (snap.companies && typeof snap.companies === "object" ? snap.companies : {}) as any;
  const j = (snap.jobs && typeof snap.jobs === "object" ? snap.jobs : {}) as any;
  const a = (snap.applications && typeof snap.applications === "object" ? snap.applications : {}) as any;
  const pe = (r.periodEvents && typeof r.periodEvents === "object" ? r.periodEvents : {}) as any;
  const ob = (r.operationalBacklog && typeof r.operationalBacklog === "object" ? r.operationalBacklog : {}) as any;
  const cs = (r.commercialStatus && typeof r.commercialStatus === "object" ? r.commercialStatus : {}) as any;
  const rb = (cs.revenueAndBilling && typeof cs.revenueAndBilling === "object" ? cs.revenueAndBilling : {}) as any;
  const ep = (cs.enterprisePartnerships && typeof cs.enterprisePartnerships === "object" ? cs.enterprisePartnerships : {}) as any;

  return {
    period: {
      key: safeStr(p.key, "30d"),
      startDate: p.startDate ? safeStr(p.startDate) : null,
      endDate: safeStr(p.endDate, new Date().toISOString()),
      generatedAt: safeStr(p.generatedAt, new Date().toISOString()),
    },
    snapshot: {
      users: {
        total: safeNum(u.total),
        active: safeNum(u.active),
        suspended: safeNum(u.suspended),
        disabled: safeNum(u.disabled),
      },
      companies: {
        total: safeNum(c.total),
        active: safeNum(c.active),
        suspended: safeNum(c.suspended),
        archived: safeNum(c.archived),
        verified: safeNum(c.verified),
        pendingVerification: safeNum(c.pendingVerification),
        rejectedVerification: safeNum(c.rejectedVerification),
        unverified: safeNum(c.unverified),
      },
      jobs: {
        total: safeNum(j.total),
        published: safeNum(j.published),
        draft: safeNum(j.draft),
        paused: safeNum(j.paused),
        closed: safeNum(j.closed),
        expired: safeNum(j.expired),
        archived: safeNum(j.archived),
      },
      applications: {
        total: safeNum(a.total),
      },
    },
    periodEvents: {
      newUsersRegistered: safeNum(pe.newUsersRegistered),
      newCompaniesRegistered: safeNum(pe.newCompaniesRegistered),
      companiesVerified: safeNum(pe.companiesVerified),
      companiesRejected: safeNum(pe.companiesRejected),
      jobsPosted: safeNum(pe.jobsPosted),
      applicationsSubmitted: safeNum(pe.applicationsSubmitted),
      jobsClosedByAdmin: safeNum(pe.jobsClosedByAdmin),
    },
    operationalBacklog: {
      pendingVerificationQueue: safeNum(ob.pendingVerificationQueue),
      suspendedUsersQueue: safeNum(ob.suspendedUsersQueue),
      suspendedCompaniesQueue: safeNum(ob.suspendedCompaniesQueue),
    },
    commercialStatus: {
      revenueAndBilling: {
        status: safeStr(rb.status, "UNAVAILABLE"),
        monetizationActive: rb.monetizationActive === true ? true : null,
        totalRevenueVnd: typeof rb.totalRevenueVnd === "number" ? rb.totalRevenueVnd : null,
        note: safeStr(rb.note, "Chưa triển khai ghi nhận doanh thu và thanh toán."),
      },
      enterprisePartnerships: {
        status: safeStr(ep.status, "UNAVAILABLE"),
        activePartnershipsCount: typeof ep.activePartnershipsCount === "number" ? ep.activePartnershipsCount : null,
        note: safeStr(ep.note, "Chưa triển khai ghi nhận chương trình đối tác."),
      },
    },
  };
}

export function normalizeCompanyRecruitmentReport(raw: unknown): CompanyRecruitmentReportDto {
  const r = (raw && typeof raw === "object" ? raw : {}) as any;
  const p = (r.period && typeof r.period === "object" ? r.period : {}) as any;
  const jf = (r.jobFilter && typeof r.jobFilter === "object" ? r.jobFilter : {}) as any;
  const js = (r.jobsSummary && typeof r.jobsSummary === "object" ? r.jobsSummary : {}) as any;
  const pipe = (r.pipeline && typeof r.pipeline === "object" ? r.pipeline : {}) as any;
  const hires = (pipe.hires && typeof pipe.hires === "object" ? pipe.hires : {}) as any;
  const int = (r.interviewsSummary && typeof r.interviewsSummary === "object" ? r.interviewsSummary : {}) as any;
  const cp = (r.commercialPackage && typeof r.commercialPackage === "object" ? r.commercialPackage : {}) as any;

  return {
    companyId: safeStr(r.companyId),
    companyName: safeStr(r.companyName, "Doanh nghiệp"),
    period: {
      key: safeStr(p.key, "30d"),
      startDate: p.startDate ? safeStr(p.startDate) : null,
      endDate: safeStr(p.endDate, new Date().toISOString()),
      generatedAt: safeStr(p.generatedAt, new Date().toISOString()),
    },
    jobFilter: {
      jobId: jf.jobId ? safeStr(jf.jobId) : null,
      title: safeStr(jf.title, "Tất cả tin tuyển dụng"),
    },
    jobsSummary: {
      total: safeNum(js.total),
      published: safeNum(js.published),
      draft: safeNum(js.draft),
      paused: safeNum(js.paused),
      closed: safeNum(js.closed),
      expired: safeNum(js.expired),
      archived: safeNum(js.archived),
    },
    pipeline: {
      currentCounts: normalizePipelineCounts(pipe.currentCounts),
      periodSubmissions: safeNum(pipe.periodSubmissions),
      hires: {
        status: safeStr(hires.status, "UNAVAILABLE"),
        count: typeof hires.count === "number" ? hires.count : null,
        note: safeStr(hires.note, "Chưa ghi nhận kết quả tuyển dụng (Lời mời nhận việc chưa phải kết quả tuyển)."),
      },
    },
    interviewsSummary: {
      total: safeNum(int.total),
      scheduled: safeNum(int.scheduled),
      rescheduled: safeNum(int.rescheduled),
      completed: safeNum(int.completed),
      cancelled: safeNum(int.cancelled),
    },
    commercialPackage: {
      status: safeStr(cp.status, "UNAVAILABLE"),
      tier: cp.tier ? safeStr(cp.tier) : null,
      activeJobsLimit: typeof cp.activeJobsLimit === "number" ? cp.activeJobsLimit : null,
      paymentActive: cp.paymentActive === true ? true : null,
      note: safeStr(cp.note, "Chưa triển khai gói dịch vụ thu phí hoặc hạn mức đăng tin."),
    },
  };
}

export function buildAdminReportCsv(report: AdminReportSummaryDto | AdminDashboardCounts): string {
  const isFullReport = "periodEvents" in report;
  const full = isFullReport ? (report as AdminReportSummaryDto) : null;
  const d = isFullReport ? (report as AdminReportSummaryDto).snapshot : (report as AdminDashboardCounts);

  const generatedAt = full?.period.generatedAt ?? new Date().toISOString();
  const periodKey = full?.period.key ?? "all";
  const periodLabel = REPORT_PERIOD_LABELS[periodKey as ReportPeriodKey] ?? periodKey;

  const users = "users" in d && typeof d.users === "object" ? d.users : { total: (d as any).users ?? 0, active: (d as any).activeUsers ?? 0, suspended: 0, disabled: 0 };
  const companies = "companies" in d && typeof d.companies === "object" ? d.companies : { total: (d as any).companies ?? 0, active: (d as any).activeCompanies ?? 0, pendingVerification: (d as any).pendingCompanies ?? 0, suspended: 0, archived: 0, verified: 0, rejectedVerification: 0, unverified: 0 };
  const jobs = "jobs" in d && typeof d.jobs === "object" ? d.jobs : { total: (d as any).jobs ?? 0, published: (d as any).publishedJobs ?? 0, draft: 0, paused: 0, closed: 0, expired: 0, archived: 0 };
  const applications = "applications" in d && typeof d.applications === "object" ? (d.applications as any).total ?? 0 : (d as any).applications ?? 0;

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
      pipeline?: any;
      interviews?: any;
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
