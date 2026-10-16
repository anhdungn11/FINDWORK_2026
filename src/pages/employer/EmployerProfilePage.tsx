import { Link } from "react-router-dom";
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

const EmployerProfilePage = () => {
  const { active } = useCompanyWorkspace();
  const profile = useAsyncData((s) => companyWorkspaceApi.getProfile(active.id, s), [active.id]);

  return (
    <>
      <PageHeader
        title="Hồ sơ doanh nghiệp"
        subtitle="Thông tin pháp lý, thương hiệu và thông tin liên hệ của công ty."
        actions={
          <Link className={ui.btn} to="/employer/locations">
            Quản lý địa điểm →
          </Link>
        }
      />
      <WritesDisabledNotice />

      {profile.loading ? (
        <LoadingBlock rows={4} label="Đang tải hồ sơ doanh nghiệp" />
      ) : profile.error ? (
        <ApiErrorState error={profile.error} onRetry={profile.reload} />
      ) : !profile.data ? (
        <EmptyState title="Chưa có dữ liệu hồ sơ" text="Không tìm thấy thông tin hồ sơ của doanh nghiệp." />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <Card title="Thông tin chung">
            <div className={ui.formGrid}>
              <div className={ui.field}>
                <span className={ui.label}>Tên doanh nghiệp</span>
                <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                  {profile.data.name || "—"}
                </span>
              </div>
              <div className={ui.field}>
                <span className={ui.label}>Tên pháp lý</span>
                <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                  {profile.data.legalName || "Chưa cập nhật"}
                </span>
              </div>
              <div className={ui.field}>
                <span className={ui.label}>Đường dẫn (Slug)</span>
                <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                  {profile.data.slug || "—"}
                </span>
              </div>
              <div className={ui.field}>
                <span className={ui.label}>Trạng thái xác minh</span>
                <div style={{ paddingTop: 6 }}>
                  <Badge tone={profile.data.verificationStatus === "VERIFIED" ? "success" : "neutral"}>
                    {profile.data.verificationStatus || "Chưa xác minh"}
                  </Badge>
                </div>
              </div>
              <div className={ui.field}>
                <span className={ui.label}>Website</span>
                <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                  {profile.data.website ? (
                    <a href={profile.data.website} target="_blank" rel="noopener noreferrer" className={ui.link}>
                      {profile.data.website}
                    </a>
                  ) : (
                    "Chưa cập nhật"
                  )}
                </span>
              </div>
              <div className={ui.field}>
                <span className={ui.label}>Quy mô nhân sự</span>
                <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                  {profile.data.employeeSizeRange || "Chưa xác định"}
                </span>
              </div>
            </div>
          </Card>

          <Card title="Giới thiệu công ty">
            <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              {profile.data.description || "Doanh nghiệp chưa bổ sung mô tả giới thiệu."}
            </p>
          </Card>
        </div>
      )}
    </>
  );
};

export default EmployerProfilePage;
