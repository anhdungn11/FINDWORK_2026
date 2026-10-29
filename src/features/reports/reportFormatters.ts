import type { AdminDashboardCounts } from "../../services/api/adminApi";

export interface EmployerJobCountsSummary {
  total: number;
  published: number;
  draft: number;
  paused: number;
  closed: number;
}

export interface PipelineSummary {
  SUBMITTED: number;
  REVIEWING: number;
  SHORTLISTED: number;
  INTERVIEW: number;
  OFFERED: number;
  REJECTED: number;
  total: number;
}

export interface InterviewSummary {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}

export function buildAdminReportCsv(data: AdminDashboardCounts): string {
  const generatedAt = new Date().toISOString();
  const inactiveUsers = Math.max(0, data.users - data.activeUsers);
  const inactiveCompanies = Math.max(0, data.companies - data.activeCompanies);
  const nonPublishedJobs = Math.max(0, data.jobs - data.publishedJobs);

  const rows = [
    ["BÁO CÁO TIẾN ĐỘ & VẬN HÀNH NỀN TẢNG FINDWORK", ""],
    ["Thời gian xuất báo cáo", generatedAt],
    ["Phạm vi dữ liệu", "Hiện trạng tích lũy toàn sàn (All-Time Snapshot)"],
    ["", ""],
    ["PHÂN MỤC", "CHỈ SỐ HIỆN TRẠNG (REAL DATA)"],
    ["Tổng số tài khoản người dùng", data.users.toString()],
    ["Người dùng đang hoạt động (ACTIVE)", data.activeUsers.toString()],
    ["Người dùng bị khóa hoặc chưa kích hoạt", inactiveUsers.toString()],
    ["Tổng số doanh nghiệp đăng ký", data.companies.toString()],
    ["Doanh nghiệp đang hoạt động", data.activeCompanies.toString()],
    ["Doanh nghiệp chờ xác minh pháp lý", data.pendingCompanies.toString()],
    ["Doanh nghiệp tạm dừng hoặc lưu trữ", inactiveCompanies.toString()],
    ["Tổng số tin tuyển dụng sàn", data.jobs.toString()],
    ["Tin tuyển dụng đang công khai (PUBLISHED)", data.publishedJobs.toString()],
    ["Tin tuyển dụng nháp / tạm dừng / đã đóng", nonPublishedJobs.toString()],
    ["Tổng lượt hồ sơ ứng tuyển toàn hệ thống", data.applications.toString()],
    ["", ""],
    ["HÀNG ĐỢI VẬN HÀNH CẦN XỬ LÝ", "SỐ LƯỢNG CHỜ DUYỆT"],
    ["Doanh nghiệp chờ xét duyệt pháp lý", data.pendingCompanies.toString()],
    ["Tài khoản người dùng cần rà soát", inactiveUsers.toString()],
    ["", ""],
    ["PHÂN HỆ KINH DOANH THƯƠNG MẠI", "TRẠNG THÁI TRIỂN KHAI"],
    ["Doanh thu & Giao dịch thanh toán", "Chưa triển khai gói thu phí trên phiên bản hiện tại"],
    ["Hợp tác đối tác doanh nghiệp", "Kế hoạch mở rộng giai đoạn tiếp theo"],
  ];

  return "\uFEFF" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

export function buildAdminReportJson(data: AdminDashboardCounts): object {
  return {
    reportType: "FINDWORK_ADMIN_PROGRESS_REPORT",
    generatedAt: new Date().toISOString(),
    scope: "PLATFORM_ALL_TIME_SNAPSHOT",
    snapshot: {
      users: {
        total: data.users,
        active: data.activeUsers,
        inactiveOrSuspended: Math.max(0, data.users - data.activeUsers),
      },
      companies: {
        total: data.companies,
        active: data.activeCompanies,
        pendingVerification: data.pendingCompanies,
        suspendedOrArchived: Math.max(0, data.companies - data.activeCompanies),
      },
      jobs: {
        total: data.jobs,
        published: data.publishedJobs,
        draftOrPausedOrClosed: Math.max(0, data.jobs - data.publishedJobs),
      },
      applications: {
        total: data.applications,
      },
    },
    operationalBacklog: {
      pendingCompaniesToVerify: data.pendingCompanies,
      usersUnderReview: Math.max(0, data.users - data.activeUsers),
    },
    commercialModules: {
      revenueAndBilling: {
        monetizationActive: false,
        status: "UNIMPLEMENTED",
        note: "Chưa triển khai gói dịch vụ thu phí hoặc cổng thanh toán trên phiên bản hiện tại (Theo lộ trình thương mại hóa)",
      },
      partnerships: {
        status: "PLANNED",
        note: "Chương trình đối tác liên kết doanh nghiệp đang trong kế hoạch mở rộng",
      },
    },
  };
}

export function buildEmployerReportCsv(params: {
  companyName: string;
  selectedJobTitle: string;
  jobCounts: EmployerJobCountsSummary;
  pipeline: PipelineSummary | null;
  interviews: InterviewSummary | null;
}): string {
  const generatedAt = new Date().toISOString();
  const rows = [
    ["BÁO CÁO TIẾN ĐỘ TUYỂN DỤNG DOANH NGHIỆP - FINDWORK", ""],
    ["Doanh nghiệp", params.companyName],
    ["Thời gian xuất báo cáo", generatedAt],
    ["Phạm vi tin tuyển dụng", params.selectedJobTitle],
    ["", ""],
    ["CHỈ SỐ TIN TUYỂN DỤNG (XÁC THỰC TỪ MÁY CHỦ)", "SỐ LƯỢNG"],
    ["Tổng số tin tuyển dụng của công ty", params.jobCounts.total.toString()],
    ["Tin đang công khai (PUBLISHED)", params.jobCounts.published.toString()],
    ["Tin nháp (DRAFT)", params.jobCounts.draft.toString()],
    ["Tin tạm dừng (PAUSED)", params.jobCounts.paused.toString()],
    ["Tin đã đóng (CLOSED)", params.jobCounts.closed.toString()],
    ["", ""],
    ["LUỒNG HỒ SƠ ỨNG VIÊN (PIPELINE)", "TRẠNG THÁI"],
    ...(params.pipeline
      ? [
          ["Tổng lượt hồ sơ tiếp nhận", params.pipeline.total.toString()],
          ["Hồ sơ mới nộp (SUBMITTED)", params.pipeline.SUBMITTED.toString()],
          ["Đang xem xét & đánh giá (REVIEWING)", params.pipeline.REVIEWING.toString()],
          ["Đã qua vòng lọc (SHORTLISTED)", params.pipeline.SHORTLISTED.toString()],
          ["Vòng phỏng vấn (INTERVIEW)", params.pipeline.INTERVIEW.toString()],
          ["Đã gửi đề nghị nhận việc (OFFERED)", params.pipeline.OFFERED.toString()],
          ["Không phù hợp / Từ chối (REJECTED)", params.pipeline.REJECTED.toString()],
        ]
      : [
          ["Tổng hợp luồng hồ sơ", "Chưa khả dụng — Đang chờ API tổng hợp báo cáo"],
        ]),
    ["", ""],
    ["LỊCH PHỎNG VẤN ỨNG VIÊN", "TRẠNG THÁI"],
    ...(params.interviews
      ? [
          ["Tổng số lịch phỏng vấn đã thiết lập", params.interviews.total.toString()],
          ["Lịch phỏng vấn sắp tới (SCHEDULED)", params.interviews.scheduled.toString()],
          ["Phỏng vấn đã hoàn thành (COMPLETED)", params.interviews.completed.toString()],
          ["Lịch phỏng vấn đã hủy (CANCELLED)", params.interviews.cancelled.toString()],
        ]
      : [
          ["Tổng hợp lịch phỏng vấn", "Chưa khả dụng — Đang chờ API tổng hợp báo cáo"],
        ]),
    ["", ""],
    ["GÓI DỊCH VỤ DOANH NGHIỆP", "TRẠNG THÁI"],
    ["Gói sử dụng", "Gói tiêu chuẩn FINDWORK (Miễn phí)"],
    ["Chi phí phát sinh", "0 VND (Chưa thương mại hóa dịch vụ thu phí)"],
  ];

  return "\uFEFF" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

export function buildEmployerReportJson(params: {
  companyId: string;
  companyName: string;
  selectedJobId: string | null;
  selectedJobTitle: string;
  jobCounts: EmployerJobCountsSummary;
  pipeline: PipelineSummary | null;
  interviews: InterviewSummary | null;
}): object {
  return {
    reportType: "FINDWORK_EMPLOYER_RECRUITMENT_REPORT",
    generatedAt: new Date().toISOString(),
    company: {
      id: params.companyId,
      name: params.companyName,
    },
    filter: {
      job: {
        id: params.selectedJobId,
        title: params.selectedJobTitle,
      },
    },
    jobSummary: params.jobCounts,
    applicationPipeline: params.pipeline ?? { status: "UNAVAILABLE_ON_SERVER" },
    interviewsSummary: params.interviews ?? { status: "UNAVAILABLE_ON_SERVER" },
    commercialTier: {
      tierName: "FREE_STANDARD",
      billingActive: false,
      note: "Gói cơ bản FINDWORK (Miễn phí trong giai đoạn hiện tại).",
    },
  };
}
