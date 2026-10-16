import { Badge, Card, EmptyState, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

const EmployerMembersPage = () => {
  const { active } = useCompanyWorkspace();
  const invitations = useAsyncData((s) => companyWorkspaceApi.listInvitations(active.id, s), [active.id]);

  return (
    <>
      <PageHeader
        title="Thành viên & Lời mời"
        subtitle="Quản lý danh sách thành viên nội bộ và trạng thái thư mời gia nhập công ty."
      />
      <WritesDisabledNotice />

      <div style={{ display: "grid", gap: 16 }}>
        <Card title="Vai trò hiện tại của bạn trong công ty">
          <p style={{ margin: "0 0 8px", color: "var(--color-text-secondary)" }}>
            Tài khoản của bạn đang có quyền truy cập vào doanh nghiệp <strong>{active.name}</strong>.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {active.memberRoleNames.map((role) => (
              <Badge key={role} tone="info">
                {role.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </Card>

        <Card title="Lời mời thành viên đang chờ xử lý">
          {invitations.loading ? (
            <LoadingBlock rows={2} label="Đang tải danh sách lời mời" />
          ) : invitations.error ? (
            <ApiErrorState error={invitations.error} onRetry={invitations.reload} />
          ) : !invitations.data || invitations.data.length === 0 ? (
            <EmptyState
              title="Không có lời mời nào đang chờ"
              text="Chưa có lời mời tham gia doanh nghiệp nào được gửi hoặc đang mở."
            />
          ) : (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th scope="col">Email người nhận</th>
                    <th scope="col">Ngày gửi</th>
                    <th scope="col">Hạn lời mời</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.data.map((inv: any, idx: number) => (
                    <tr key={inv.id || idx}>
                      <td><strong>{inv.email || "—"}</strong></td>
                      <td>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("vi-VN") : "—"}</td>
                      <td>{inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString("vi-VN") : "—"}</td>
                      <td>
                        <Badge tone={inv.status === "PENDING" ? "warning" : "neutral"}>
                          {inv.status || "Chờ xử lý"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default EmployerMembersPage;
