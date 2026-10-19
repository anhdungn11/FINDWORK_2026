import { useState, type FormEvent } from "react";
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi, type CompanyLocationInput } from "@/services/api/companyWorkspaceApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

const EmployerLocationsPage = () => {
  const { active } = useCompanyWorkspace();
  const locations = useAsyncData((s) => companyWorkspaceApi.listLocations(active.id, s), [active.id]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addressLine, setAddressLine] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const writes = isWorkspaceWritesEnabled();

  const handleCreateLocation = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!addressLine.trim()) return;

    setSubmitting(true);
    try {
      const payload: CompanyLocationInput = {
        addressLine: addressLine.trim(),
        countryCode: "VN",
      };
      await companyWorkspaceApi.createLocation(active.id, payload);
      setNotice({ tone: "ok", text: "Đã thêm địa điểm làm việc mới thành công." });
      setAddressLine("");
      setShowAddForm(false);
      locations.reload();
    } catch (err) {
      setNotice({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromoteHeadquarters = async (locId: string) => {
    setBusyId(locId);
    setNotice(null);
    try {
      await companyWorkspaceApi.promoteHeadquarters(active.id, locId);
      setNotice({ tone: "ok", text: "Đã chuyển trụ sở chính doanh nghiệp." });
      locations.reload();
    } catch (err) {
      setNotice({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteLocation = async (locId: string) => {
    if (!window.confirm("Xác nhận xóa địa điểm làm việc này?")) return;
    setBusyId(locId);
    setNotice(null);
    try {
      await companyWorkspaceApi.deleteLocation(active.id, locId);
      setNotice({ tone: "ok", text: "Đã xóa địa điểm làm việc thành công." });
      locations.reload();
    } catch (err) {
      setNotice({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Địa điểm làm việc"
        subtitle="Danh sách các chi nhánh, văn phòng và trụ sở chính của doanh nghiệp."
        actions={
          !showAddForm && (
            <button
              type="button"
              className={`${ui.btn} ${ui.btnPrimary}`}
              onClick={() => setShowAddForm(true)}
            >
              + Thêm địa điểm
            </button>
          )
        }
      />
      <WritesDisabledNotice />

      {notice && (
        <div
          className={`${ui.notice} ${notice.tone === "error" ? ui.noticeWarn : ""}`}
          role={notice.tone === "error" ? "alert" : "status"}
          style={{ marginBottom: 16 }}
        >
          {notice.text}
        </div>
      )}

      {showAddForm && (
        <Card title="Thêm địa điểm làm việc mới" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreateLocation} noValidate>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="loc-address">
                Địa chỉ chi tiết *
              </label>
              <input
                id="loc-address"
                className={ui.input}
                placeholder="Ví dụ: Tầng 5, Tòa nhà ABC, 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                type="submit"
                className={`${ui.btn} ${ui.btnPrimary}`}
                disabled={submitting || !addressLine.trim() || !writes}
                aria-disabled={!writes}
                title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
              >
                {submitting ? "Đang lưu..." : "Lưu địa điểm"}
              </button>
              <button
                type="button"
                className={ui.btn}
                onClick={() => {
                  setShowAddForm(false);
                  setAddressLine("");
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </Card>
      )}

      {locations.loading ? (
        <LoadingBlock rows={3} label="Đang tải danh sách địa điểm" />
      ) : locations.error ? (
        <ApiErrorState error={locations.error} onRetry={locations.reload} />
      ) : !locations.data || locations.data.length === 0 ? (
        <EmptyState
          title="Chưa có địa điểm nào"
          text="Doanh nghiệp chưa thiết lập địa điểm hoặc trụ sở làm việc."
          actionLabel="+ Thêm địa điểm đầu tiên"
          onAction={() => setShowAddForm(true)}
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
                <th scope="col">Thao tác</th>
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
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {!loc.isHeadquarters && (
                        <button
                          type="button"
                          className={ui.btn}
                          disabled={!writes || busyId === loc.id}
                          title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                          onClick={() => handlePromoteHeadquarters(loc.id)}
                        >
                          Đặt làm trụ sở chính
                        </button>
                      )}
                      <button
                        type="button"
                        className={ui.btn}
                        disabled={!writes || busyId === loc.id}
                        title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                        onClick={() => handleDeleteLocation(loc.id)}
                      >
                        Xóa
                      </button>
                    </div>
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
