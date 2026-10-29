import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import {
  Briefcase,
  Users,
  Building2,
  FileCheck2,
  AlertCircle,
  ArrowRight,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  ShieldAlert,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { Badge, Card, JobStatusBadge, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import {
  canManageJobs,
  canReviewApplications,
  canInviteMembers,
  canUpdateCompany,
  formatCompanyRole,
} from "@/features/company/companyWorkspacePermissions";

export const EmployerWorkspaceOutlet = () => <Outlet />;

export const WritesDisabledNotice = () =>
  isWorkspaceWritesEnabled() ? null : (
    <div
      className={`${ui.notice} ${ui.noticeWarn}`}
      role="note"
      data-testid="writes-disabled-notice"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        borderRadius: 10,
        marginBottom: 24,
      }}
    >
      <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: "0.875rem", color: "#78350f" }}>
        <strong style={{ color: "#92400e" }}>Chế độ chỉ xem (Safe Read-Only Mode):</strong> Thao tác ghi dữ liệu (tạo, sửa, đăng tin, chuyển vòng ứng viên) đang tạm tắt để bảo toàn môi trường kiểm thử.
      </span>
    </div>
  );

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

const EmployerDashboardPage = () => {
  const { active, companies } = useCompanyWorkspace();

  const jobs = useAsyncData(
    (s) => companyWorkspaceApi.listJobs(active.id, { pageSize: 50 }, s),
    [active.id],
  );
  const members = useAsyncData((s) => companyWorkspaceApi.listMembers(active.id, s), [active.id]);
  const invitations = useAsyncData((s) => companyWorkspaceApi.listInvitations(active.id, s), [active.id]);
  const locations = useAsyncData((s) => companyWorkspaceApi.listLocations(active.id, s), [active.id]);

  // Real Application Pipeline Metrics
  const [pipelineCounts, setPipelineCounts] = useState<{
    SUBMITTED: number;
    REVIEWING: number;
    SHORTLISTED: number;
    INTERVIEW: number;
    OFFERED: number;
    REJECTED: number;
    total: number;
  }>({
    SUBMITTED: 0,
    REVIEWING: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    OFFERED: 0,
    REJECTED: 0,
    total: 0,
  });
  const [pipelineLoading, setPipelineLoading] = useState(false);

  // Fetch real applications from the first few jobs to calculate aggregate pipeline
  useEffect(() => {
    const jobList = jobs.data?.data || [];
    if (jobList.length === 0 || !canReviewApplications(active.memberRoleNames)) {
      setPipelineCounts({
        SUBMITTED: 0,
        REVIEWING: 0,
        SHORTLISTED: 0,
        INTERVIEW: 0,
        OFFERED: 0,
        REJECTED: 0,
        total: 0,
      });
      return;
    }

    let isMounted = true;
    setPipelineLoading(true);

    // Sample applications across up to top 5 jobs
    const sampleJobs = jobList.slice(0, 5);
    Promise.all(
      sampleJobs.map((j) =>
        companyWorkspaceApi.listJobApplications(active.id, j.id, { pageSize: 50 }).catch(() => null),
      ),
    )
      .then((results) => {
        if (!isMounted) return;
        const counts = {
          SUBMITTED: 0,
          REVIEWING: 0,
          SHORTLISTED: 0,
          INTERVIEW: 0,
          OFFERED: 0,
          REJECTED: 0,
          total: 0,
        };

        for (const res of results) {
          if (!res) continue;
          counts.total += res.pagination.total;
          for (const app of res.data) {
            if (app.status in counts) {
              counts[app.status as keyof typeof counts]++;
            }
          }
        }
        setPipelineCounts(counts);
      })
      .finally(() => {
        if (isMounted) setPipelineLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [jobs.data?.data, active.id, active.memberRoleNames]);

  const allJobs = jobs.data?.data ?? [];
  const totalJobs = jobs.data?.pagination.total ?? 0;
  const publishedCount = allJobs.filter((j) => j.status === "PUBLISHED").length;
  const draftCount = allJobs.filter((j) => j.status === "DRAFT").length;

  const activeMembers = (members.data ?? []).filter((m) => m.status === "ACTIVE").length;
  const pendingInvitations = (invitations.data ?? []).filter((inv) => inv.status === "PENDING").length;
  const totalLocations = locations.data?.length ?? 0;

  const userRoleText = active.memberRoleNames.length
    ? active.memberRoleNames.map(formatCompanyRole).join(", ")
    : "Chưa phân vai trò";

  const isVerified = active.verificationStatus === "VERIFIED";
  const isPendingVerification = active.verificationStatus === "PENDING";
  const isRejectedVerification = active.verificationStatus === "REJECTED";

  return (
    <>
      <PageHeader
        title={active.name}
        subtitle={
          companies.length > 1
            ? `Bạn là thành viên của ${companies.length} doanh nghiệp; đang quản lý “${active.name}”.`
            : "Trung tâm quản trị hoạt động tuyển dụng, theo dõi ứng viên và quản lý nhân sự doanh nghiệp."
        }
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Link className={`${ui.btn} ${ui.btnOutline}`} to="/employer/reports">
              <BarChart3 size={16} style={{ marginRight: 6 }} />
              <span>Báo cáo tuyển dụng</span>
            </Link>
            {canManageJobs(active.memberRoleNames) && (
              <Link className={`${ui.btn} ${ui.btnPrimary}`} to="/employer/jobs/new">
                <Plus size={16} style={{ marginRight: 6 }} />
                <span>Đăng tin tuyển dụng mới</span>
              </Link>
            )}
          </div>
        }
      />

      <WritesDisabledNotice />

      {/* VERIFICATION STATUS CALLOUT BANNER */}
      <div
        style={{
          background: isVerified
            ? "#f0fdf4"
            : isPendingVerification
            ? "#fffbeb"
            : isRejectedVerification
            ? "#fef2f2"
            : "#eff6ff",
          border: `1px solid ${
            isVerified
              ? "#bbf7d0"
              : isPendingVerification
              ? "#fde68a"
              : isRejectedVerification
              ? "#fca5a5"
              : "#bfdbfe"
          }`,
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {isVerified ? (
            <CheckCircle2 size={24} color="#16a34a" />
          ) : isPendingVerification ? (
            <Clock size={24} color="#d97706" />
          ) : isRejectedVerification ? (
            <XCircle size={24} color="#dc2626" />
          ) : (
            <ShieldAlert size={24} color="#2563eb" />
          )}

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
                {isVerified
                  ? "Doanh nghiệp đã được xác minh pháp lý chính thức"
                  : isPendingVerification
                  ? "Hồ sơ pháp lý đang chờ Super Admin phê duyệt"
                  : isRejectedVerification
                  ? "Hồ sơ pháp lý bị từ chối phê duyệt"
                  : "Doanh nghiệp chưa hoàn thiện xác thực pháp lý"}
              </span>
              <Badge tone={isVerified ? "success" : isPendingVerification ? "warning" : isRejectedVerification ? "danger" : "info"}>
                {active.verificationStatus || "UNVERIFIED"}
              </Badge>
            </div>
            <p style={{ margin: 0, fontSize: "0.825rem", color: "#64748b" }}>
              {isVerified
                ? "Hồ sơ pháp lý đã được xác minh. Quyền công khai tin tuyển dụng do Super Admin cấp riêng."
                : isPendingVerification
                ? "Super Admin đang thẩm định Giấy phép ĐKKD và Mã số thuế. Quá trình xét duyệt thường diễn ra trong 24 giờ."
                : isRejectedVerification
                ? "Vui lòng xem lại lý do từ chối và tải lên giấy tờ pháp lý hợp lệ để tiếp tục xác minh doanh nghiệp."
                : "Hoàn tất nộp Giấy chứng nhận ĐKKD và Mã số thuế để xác minh doanh nghiệp. Quyền công khai tin tuyển dụng do Super Admin cấp riêng."}
            </p>
          </div>
        </div>

        {canUpdateCompany(active.memberRoleNames) && (
          <Link
            to="/employer/profile?tab=legal"
            className={`${ui.btn} ${ui.btnOutline}`}
            style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span>{isVerified ? "Xem hồ sơ pháp lý" : "Cập nhật hồ sơ pháp lý"}</span>
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* RECRUITMENT KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* KPI 1: Active Jobs */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--color-border, #e2e8f0)",
            borderRadius: 12,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--color-text-secondary, #64748b)" }}>
              TIN ĐANG TUYỂN DỤNG
            </span>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Briefcase size={17} color="#16a34a" />
            </span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#16a34a", lineHeight: 1.1, marginBottom: 6 }}>
            {publishedCount}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "auto" }}>
            <span>Trên tổng số <strong>{totalJobs}</strong> tin đăng</span>
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
            <Link to="/employer/jobs" style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-primary, #4f6ef7)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span>Quản lý tin đăng ({totalJobs})</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* KPI 2: Candidate Applications */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--color-border, #e2e8f0)",
            borderRadius: 12,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--color-text-secondary, #64748b)" }}>
              HỒ SƠ ỨNG VIÊN
            </span>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileCheck2 size={17} color="#0284c7" />
            </span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0284c7", lineHeight: 1.1, marginBottom: 6 }}>
            {pipelineLoading ? "…" : pipelineCounts.total}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "auto" }}>
            <span><strong>{pipelineCounts.SUBMITTED}</strong> hồ sơ mới chờ xem xét</span>
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
            <Link to="/employer/applicants" style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-primary, #4f6ef7)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span>Xem danh sách ứng viên</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* KPI 3: Team Members */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--color-border, #e2e8f0)",
            borderRadius: 12,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--color-text-secondary, #64748b)" }}>
              NHÂN SỰ & THÀNH VIÊN
            </span>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={17} color="#7c3aed" />
            </span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#7c3aed", lineHeight: 1.1, marginBottom: 6 }}>
            {activeMembers}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "auto" }}>
            <span><strong>{pendingInvitations}</strong> lời mời đang chờ phản hồi</span>
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
            <Link to="/employer/members" style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-primary, #4f6ef7)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span>Quản lý thành viên ({activeMembers})</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* KPI 4: Company Profile & Locations */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--color-border, #e2e8f0)",
            borderRadius: 12,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--color-text-secondary, #64748b)" }}>
              ĐỊA ĐIỂM HOẠT ĐỘNG
            </span>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MapPin size={17} color="#d97706" />
            </span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#d97706", lineHeight: 1.1, marginBottom: 6 }}>
            {totalLocations}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "auto" }}>
            <span>Vai trò của bạn: <strong>{userRoleText}</strong></span>
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
            <Link to="/employer/locations" style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-primary, #4f6ef7)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span>Cấu hình văn phòng ({totalLocations})</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* APPLICANT PIPELINE FUNNEL (REAL DERIVED METRICS) */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid var(--color-border, #e2e8f0)",
          borderRadius: 12,
          padding: "22px 24px",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
              Phễu tuyển dụng ứng viên (Recruitment Pipeline)
            </h2>
            <span style={{ fontSize: "0.825rem", color: "#64748b" }}>
              Thống kê ứng viên theo từng giai đoạn xử lý hồ sơ từ các vị trí tuyển dụng đang hoạt động.
            </span>
          </div>

          <Link
            to="/employer/applicants"
            className={`${ui.btn} ${ui.btnOutline}`}
            style={{ fontSize: "0.825rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span>Quy trình ứng viên</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12,
          }}
        >
          <div style={{ padding: 14, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4 }}>MỚI NỘP</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0284c7" }}>
              {pipelineCounts.SUBMITTED}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>Chờ xem xét</div>
          </div>

          <div style={{ padding: 14, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4 }}>ĐANG XEM XÉT</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#4f6ef7" }}>
              {pipelineCounts.REVIEWING}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>Đang đánh giá</div>
          </div>

          <div style={{ padding: 14, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4 }}>SƠ TUYỂN</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#7c3aed" }}>
              {pipelineCounts.SHORTLISTED}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>Phù hợp vị trí</div>
          </div>

          <div style={{ padding: 14, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4 }}>PHỎNG VẤN</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d97706" }}>
              {pipelineCounts.INTERVIEW}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>Lên lịch gặp</div>
          </div>

          <div style={{ padding: 14, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4 }}>ĐỀ NGHỊ (OFFER)</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a" }}>
              {pipelineCounts.OFFERED}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>Chờ ứng viên</div>
          </div>

          <div style={{ padding: 14, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4 }}>TỪ CHỐI</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#64748b" }}>
              {pipelineCounts.REJECTED}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>Không phù hợp</div>
          </div>
        </div>
      </div>

      {/* ACTION PRIORITIES & RECENT JOBS SECTION */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Action Priority Center */}
        <Card title="Hành động ưu tiên (Action Priorities)">
          <div style={{ display: "grid", gap: 12 }}>
            {draftCount > 0 && canManageJobs(active.memberRoleNames) && (
              <div style={{ padding: 14, background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "0.9rem", color: "#92400e" }}>
                      Có {draftCount} tin tuyển dụng đang ở trạng thái nháp
                    </strong>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#b45309" }}>
                      Hoàn thiện nội dung và công khai tin để thu hút ứng viên nộp hồ sơ.
                    </p>
                  </div>
                  <Link to="/employer/jobs?status=DRAFT" className={`${ui.btn} ${ui.btnOutline}`} style={{ fontSize: "0.8rem", borderColor: "#fde68a", color: "#92400e" }}>
                    Xem bản nháp
                  </Link>
                </div>
              </div>
            )}

            {pipelineCounts.SUBMITTED > 0 && canReviewApplications(active.memberRoleNames) && (
              <div style={{ padding: 14, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "0.9rem", color: "#166534" }}>
                      {pipelineCounts.SUBMITTED} ứng viên mới đang chờ phản hồi
                    </strong>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#15803d" }}>
                      Phản hồi ứng viên trong 48h để tăng 40% tỷ lệ tuyển dụng thành công.
                    </p>
                  </div>
                  <Link to="/employer/applicants" className={`${ui.btn} ${ui.btnPrimary}`} style={{ fontSize: "0.8rem" }}>
                    Duyệt ngay
                  </Link>
                </div>
              </div>
            )}

            {pendingInvitations > 0 && canInviteMembers(active.memberRoleNames) && (
              <div style={{ padding: 14, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "0.9rem", color: "#1e293b" }}>
                      {pendingInvitations} lời mời tham gia nhóm chưa phản hồi
                    </strong>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                      Kiểm tra địa chỉ email hoặc gửi lại liên kết lời mời cho đồng nghiệp.
                    </p>
                  </div>
                  <Link to="/employer/members?tab=invitations" className={`${ui.btn} ${ui.btnOutline}`} style={{ fontSize: "0.8rem" }}>
                    Quản lý lời mời
                  </Link>
                </div>
              </div>
            )}

            {/* Quick entry links */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
              {canManageJobs(active.memberRoleNames) && (
                <Link
                  to="/employer/jobs/new"
                  style={{
                    padding: "10px 14px",
                    background: "var(--color-surface-soft, #f1f5f9)",
                    borderRadius: 8,
                    textDecoration: "none",
                    color: "var(--color-text-primary, #1e293b)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Tạo tin mới</span>
                  <Plus size={16} />
                </Link>
              )}

              {canInviteMembers(active.memberRoleNames) && (
                <Link
                  to="/employer/members?tab=invitations"
                  style={{
                    padding: "10px 14px",
                    background: "var(--color-surface-soft, #f1f5f9)",
                    borderRadius: 8,
                    textDecoration: "none",
                    color: "var(--color-text-primary, #1e293b)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Mời thành viên</span>
                  <Users size={16} />
                </Link>
              )}

              <Link
                to="/employer/profile"
                style={{
                  padding: "10px 14px",
                  background: "var(--color-surface-soft, #f1f5f9)",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "var(--color-text-primary, #1e293b)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Hồ sơ công ty</span>
                <Building2 size={16} />
              </Link>

              <Link
                to="/employer/locations"
                style={{
                  padding: "10px 14px",
                  background: "var(--color-surface-soft, #f1f5f9)",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "var(--color-text-primary, #1e293b)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Địa điểm ({totalLocations})</span>
                <MapPin size={16} />
              </Link>
            </div>
          </div>
        </Card>

        {/* Recent Jobs Preview */}
        <Card title="Tin tuyển dụng gần đây">
          {jobs.loading ? (
            <LoadingBlock rows={3} />
          ) : jobs.error ? (
            <ApiErrorState error={jobs.error} onRetry={jobs.reload} />
          ) : allJobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 16px" }}>
              <Briefcase size={32} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "0 0 12px" }}>
                Doanh nghiệp chưa tạo tin tuyển dụng nào.
              </p>
              {canManageJobs(active.memberRoleNames) && (
                <Link to="/employer/jobs/new" className={`${ui.btn} ${ui.btnPrimary}`} style={{ fontSize: "0.85rem" }}>
                  Đăng tin đầu tiên
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {allJobs.slice(0, 4).map((j) => (
                <div
                  key={j.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "#f8fafc",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, marginRight: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <strong
                        style={{
                          fontSize: "0.875rem",
                          color: "#1e293b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {j.title}
                      </strong>
                      <JobStatusBadge status={j.status ?? "DRAFT"} />
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      Hạn nộp: {formatDate(j.applicationDeadline)}
                    </span>
                  </div>

                  <Link
                    to={`/employer/applicants?jobId=${j.id}`}
                    className={`${ui.btn} ${ui.btnOutline}`}
                    style={{ padding: "4px 8px", fontSize: "0.75rem", whiteSpace: "nowrap" }}
                  >
                    Xem hồ sơ
                  </Link>
                </div>
              ))}

              <div style={{ textAlign: "right", marginTop: 4 }}>
                <Link to="/employer/jobs" style={{ fontSize: "0.825rem", color: "var(--color-primary, #4f6ef7)", fontWeight: 600, textDecoration: "none" }}>
                  Xem tất cả ({totalJobs} tin) →
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default EmployerDashboardPage;
