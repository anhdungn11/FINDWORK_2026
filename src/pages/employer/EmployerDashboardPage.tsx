import { Link, Outlet } from "react-router-dom";
import { Badge, Card, JobStatusBadge, LoadingBlock, PageHeader, UnavailableState, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { CompanyWorkspaceProvider, useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";

export const EmployerWorkspaceOutlet = () => (
  <CompanyWorkspaceProvider>
    <Outlet />
  </CompanyWorkspaceProvider>
);

export const WritesDisabledNotice = () =>
  isWorkspaceWritesEnabled() ? null : (
    <div className={`${ui.notice} ${ui.noticeWarn}`} role="note" data-testid="writes-disabled-notice">
      Chế độ chỉ xem: thao tác ghi dữ liệu (tạo, sửa, đăng tin…) đang tắt nên không có yêu cầu nào được gửi tới máy chủ.
    </div>
  );

const ROLE_LABEL = (r: string) => r.replace(/_/g, " ");

const EmployerDashboardPage = () => {
  const { active, companies } = useCompanyWorkspace();
  const jobs = useAsyncData((s) => companyWorkspaceApi.listJobs(active.id, { pageSize: 100 }, s), [active.id]);

  const counts = (jobs.data?.data ?? []).reduce<Record<string, number>>((acc, j) => {
    const k = j.status ?? "UNKNOWN";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const total = jobs.data?.pagination.total ?? 0;

  return (
    <>
      <PageHeader
        title={active.name}
        subtitle={companies.length > 1 ? `Bạn thuộc ${companies.length} doanh nghiệp; đang xem doanh nghiệp đầu tiên.` : "Tổng quan hoạt động tuyển dụng của doanh nghiệp."}
        actions={<Link className={`${ui.btn} ${ui.btnPrimary}`} to="/employer/jobs/new">Đăng tin mới</Link>}
      />
      <WritesDisabledNotice />
      <div className={ui.grid}>
        <Card title="Doanh nghiệp">
          <p style={{ margin: "0 0 8px" }}>
            <Badge tone={active.status === "ACTIVE" ? "success" : "warning"}>{active.status || "—"}</Badge>{" "}
            <Badge tone={active.verificationStatus === "VERIFIED" ? "success" : "neutral"}>{active.verificationStatus || "Chưa xác minh"}</Badge>
          </p>
          <p className={ui.hint}>Vai trò của bạn: {active.memberRoleNames.length ? active.memberRoleNames.map(ROLE_LABEL).join(", ") : "Chưa xác định"}</p>
          <Link className={ui.link} to="/employer/profile">Xem hồ sơ công ty →</Link>
        </Card>
        <Card title="Tin tuyển dụng">
          {jobs.loading ? <LoadingBlock rows={1} /> : jobs.error ? <ApiErrorState error={jobs.error} onRetry={jobs.reload} /> : total === 0 ? (
            <p className={ui.hint}>Chưa có tin tuyển dụng nào. Hãy tạo tin đầu tiên.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              <li><strong>{total}</strong> tin tổng cộng</li>
              {Object.entries(counts).map(([status, n]) => (
                <li key={status} style={{ display: "flex", justifyContent: "space-between" }}><JobStatusBadge status={status} /><strong>{n}</strong></li>
              ))}
            </ul>
          )}
          <p style={{ marginTop: 12 }}><Link className={ui.link} to="/employer/jobs">Quản lý tin →</Link></p>
        </Card>
        <Card title="Ứng viên ứng tuyển">
          <UnavailableState title="Chưa có dữ liệu ứng tuyển" text="Backend chưa cung cấp API đơn ứng tuyển nên hệ thống không hiển thị số liệu ứng viên." />
        </Card>
      </div>
    </>
  );
};

export default EmployerDashboardPage;
