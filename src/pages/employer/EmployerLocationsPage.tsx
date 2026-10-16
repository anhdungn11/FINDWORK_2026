import { Badge, Card, EmptyState, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

const EmployerLocationsPage = () => {
  const { active } = useCompanyWorkspace();
  const locations = useAsyncData((s) => companyWorkspaceApi.listLocations(active.id, s), [active.id]);

  return (
    <>
      <PageHeader
        title="Địa điểm làm việc"
        subtitle="Danh sách các chi nhánh, văn phòng và trụ sở chính của doanh nghiệp."
      />
      <WritesDisabledNotice />

      {locations.loading ? (
        <LoadingBlock rows={3} label="Đang tải danh sách địa điểm" />
      ) : locations.error ? (
        <ApiErrorState error={locations.error} onRetry={locations.reload} />
      ) : !locations.data || locations.data.length === 0 ? (
        <EmptyState
          title="Chưa có địa điểm nào"
          text="Doanh nghiệp chưa thiết lập địa điểm hoặc trụ sở làm việc."
        />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <caption className={ui.srOnly}>Danh sách địa điểm làm việc của doanh nghiệp</caption>
            <thead>
              <tr>
                <th scope="col">Địa chỉ</th>
                <th scope="col">Khu vực</th>
                <th scope="col">Quốc gia</th>
                <th scope="col">Phân loại</th>
              </tr>
            </thead>
            <tbody>
              {locations.data.map((loc) => (
                <tr key={loc.id}>
                  <td>
                    <strong>{loc.addressLine || "Chưa có địa chỉ chi tiết"}</strong>
                  </td>
                  <td>
                    {[loc.wardName, loc.provinceName].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td>{loc.countryCode || "VN"}</td>
                  <td>
                    {loc.isHeadquarters ? (
                      <Badge tone="success">Trụ sở chính</Badge>
                    ) : (
                      <Badge tone="neutral">Chi nhánh</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default EmployerLocationsPage;
