import { Link, Outlet } from "react-router-dom";
import { Badge, Card, JobStatusBadge, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { CompanyWorkspaceProvider, useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";

export const EmployerWorkspaceOutlet = () => <Outlet />;

export const WritesDisabledNotice = () =>
  isWorkspaceWritesEnabled() ? null : (
    <div className={`${ui.notice} ${ui.noticeWarn}`} role="note" data-testid="writes-disabled-notice">
      Chế độ chỉ xem: thao tác ghi dữ liệu (tạo, sửa, đăng tin…) đang tắt nên không có yêu cầu nào được gửi tới máy chủ.
    </div>
  );

const ROLE_LABEL: Record<string, string> = {
  COMPANY_OWNER: "Chủ sở hữu",
  ADMIN: "Quản trị viên",
  HR_MANAGER: "Trưởng phòng nhân sự",
  RECRUITER: "Chuyên viên tuyển dụng",
  HIRING_MANAGER: "Quản lý tuyển dụng",
  VIEWER: "Người xem",
};

const formatRole = (r: string) => ROLE_LABEL[r] || r.replace(/_/g, " ");

const EmployerDashboardPage = () => {
  const { active, companies } = useCompanyWorkspace();
  const jobs = useAsyncData((s) => companyWorkspaceApi.listJobs(active.id, { pageSize: 100 }, s), [active.id]);
  const members = useAsyncData((s) => companyWorkspaceApi.listMembers(active.id, s), [active.id]);
  const invitations = useAsyncData((s) => companyWorkspaceApi.listInvitations(active.id, s), [active.id]);
  const locations = useAsyncData((s) => companyWorkspaceApi.listLocations(active.id, s), [active.id]);

  const counts = (jobs.data?.data ?? []).reduce<Record<string, number>>((acc, j) => {
    const k = j.status ?? "UNKNOWN";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const totalJobs = jobs.data?.pagination.total ?? 0;
  const activeMembers = (members.data ?? []).filter((m) => m.status === "ACTIVE").length;
  const pendingInvitations = (invitations.data ?? []).filter((inv) => inv.status === "PENDING").length;
  const totalLocations = locations.data?.length ?? 0;

  return (
    <>
      <PageHeader
        title={active.name}
        subtitle={companies.length > 1 ? `Bạn thuộc ${companies.length} doanh nghiệp; đang xem doanh nghiệp đầu tiên.` : "Tổng quan hoạt động tuyển dụng và nhân sự của doanh nghiệp."}
        actions={<Link className={`${ui.btn} ${ui.btnPrimary}`} to="/employer/jobs/new">Đăng tin mới</Link>}
      />
      <WritesDisabledNotice />
      <div className={ui.grid}>
        {/* Company Overview */}
        <Card title="Hồ sơ doanh nghiệp">
          <p style={{ margin: "0 0 8px" }}>
            <Badge tone={active.status === "ACTIVE" ? "success" : "warning"}>
              {active.status === "ACTIVE" ? "Đang hoạt động" : active.status || "—"}
            </Badge>{" "}
            <Badge tone={active.verificationStatus === "VERIFIED" ? "success" : "neutral"}>
              {active.verificationStatus === "VERIFIED"
                ? "Đã xác minh"
                : active.verificationStatus === "PENDING"
                ? "Chờ duyệt xác minh"
                : active.verificationStatus === "REJECTED"
                ? "Bị từ chối xác minh"
                : "Chưa xác minh"}
            </Badge>
          </p>
          <p className={ui.hint} style={{ margin: "0 0 12px" }}>
            Vai trò của bạn: {active.memberRoleNames.length ? active.memberRoleNames.map(formatRole).join(", ") : "Chưa xác định"}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className={ui.link} to="/employer/profile">
              Chỉnh sửa hồ sơ →
            </Link>
            <Link className={ui.link} to="/employer/locations">
              Địa điểm làm việc ({totalLocations}) →
            </Link>
          </div>
        </Card>

        {/* Jobs Metrics */}
        <Card title="Tin tuyển dụng">
          {jobs.loading ? (
            <LoadingBlock rows={1} />
          ) : jobs.error ? (
            <ApiErrorState error={jobs.error} onRetry={jobs.reload} />
          ) : totalJobs === 0 ? (
            <p className={ui.hint}>Chưa có tin tuyển dụng nào. Hãy tạo tin đầu tiên.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              <li>
                <strong>{totalJobs}</strong> tin tổng cộng
              </li>
              {Object.entries(counts).map(([status, n]) => (
                <li key={status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <JobStatusBadge status={status} />
                  <strong>{n}</strong>
                </li>
              ))}
            </ul>
          )}
          <p style={{ marginTop: 12 }}>
            <Link className={ui.link} to="/employer/jobs">
              Quản lý tin tuyển dụng →
            </Link>
          </p>
        </Card>

        {/* Team & Members */}
        <Card title="Nhân sự & Thành viên">
          {members.loading || invitations.loading ? (
            <LoadingBlock rows={1} />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Thành viên hoạt động:</span>
                <strong>{activeMembers}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Lời mời đang chờ:</span>
                <strong>{pendingInvitations}</strong>
              </div>
            </div>
          )}
          <p style={{ marginTop: 12 }}>
            <Link className={ui.link} to="/employer/members">
              Quản lý thành viên & lời mời →
            </Link>
          </p>
        </Card>

        {/* Candidate Applications */}
        <Card title="Hồ sơ ứng viên">
          <p style={{ margin: "0 0 8px", color: "var(--color-text-secondary)" }}>
            Tiếp nhận, sàng lọc câu trả lời và chuyển trạng thái đánh giá ứng viên cho từng vị trí tuyển dụng.
          </p>
          <p style={{ marginTop: 12 }}>
            <Link className={ui.link} to="/employer/applicants">
              Xem danh sách ứng viên →
            </Link>
          </p>
        </Card>
      </div>
    </>
  );
};

export default EmployerDashboardPage;
