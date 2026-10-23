import { useState, type FormEvent } from "react";
import { MapPin, Building, Edit3, ShieldCheck } from "lucide-react";
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, ConfirmationModal, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi, type CompanyLocationInput } from "@/services/api/companyWorkspaceApi";
import type { CompanyLocationDto } from "@/services/api/apiTypes";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { canUpdateCompany } from "@/features/company/companyWorkspacePermissions";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "primary" | "warning";
  action: () => Promise<void>;
}

const EmployerLocationsPage = () => {
  const { active } = useCompanyWorkspace();
  const locations = useAsyncData((s) => companyWorkspaceApi.listLocations(active.id, s), [active.id]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CompanyLocationDto | null>(null);

  const [addressLine, setAddressLine] = useState("");
  const [editAddressLine, setEditAddressLine] = useState("");
  const [addressError, setAddressError] = useState("");
  const [editAddressError, setEditAddressError] = useState("");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: "",
    description: "",
    confirmLabel: "Xác nhận",
    tone: "primary",
    action: async () => {},
  });
  const [dialogLoading, setDialogLoading] = useState(false);

  const writes = isWorkspaceWritesEnabled();
  const canUpdate = canUpdateCompany(active.memberRoleNames);
  const totalLocations = locations.data?.length ?? 0;

  const validateAddress = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return "Vui lòng nhập địa chỉ chi tiết.";
    if (trimmed.length < 5) return "Địa chỉ phải có tối thiểu 5 ký tự.";
    if (trimmed.length > 255) return "Địa chỉ không được vượt quá 255 ký tự.";
    return "";
  };

  const handleCreateLocation = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const err = validateAddress(addressLine);
    setAddressError(err);
    if (err) return;

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
    } catch (apiErr) {
      setNotice({ tone: "error", text: toApiFailure(apiErr).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (loc: CompanyLocationDto) => {
    setEditingLocation(loc);
    setEditAddressLine(loc.addressLine || "");
    setEditAddressError("");
    setShowAddForm(false);
    setNotice(null);
  };

  const handleUpdateLocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;
    setNotice(null);
    const err = validateAddress(editAddressLine);
    setEditAddressError(err);
    if (err) return;

    setSubmitting(true);
    try {
      const payload: CompanyLocationInput = {
        addressLine: editAddressLine.trim(),
        countryCode: "VN",
      };
      await companyWorkspaceApi.updateLocation(active.id, editingLocation.id, payload);
      setNotice({ tone: "ok", text: "Đã cập nhật thông tin địa điểm làm việc thành công." });
      setEditingLocation(null);
      setEditAddressLine("");
      locations.reload();
    } catch (apiErr) {
      setNotice({ tone: "error", text: toApiFailure(apiErr).message });
    } finally {
      setSubmitting(false);
    }
  };

  const promptPromoteHeadquarters = (loc: CompanyLocationDto) => {
    setConfirmDialog({
      isOpen: true,
      title: "Chuyển trụ sở chính doanh nghiệp",
      description: `Bạn có chắc chắn muốn chuyển trụ sở chính của doanh nghiệp sang địa điểm: "${loc.addressLine || "địa điểm này"}"? Các tin tuyển dụng và hồ sơ pháp lý sẽ cập nhật theo trụ sở mới.`,
      confirmLabel: "Chuyển trụ sở chính",
      tone: "primary",
      action: async () => {
        setBusyId(loc.id);
        setNotice(null);
        try {
          await companyWorkspaceApi.promoteHeadquarters(active.id, loc.id);
          setNotice({ tone: "ok", text: `Đã chuyển trụ sở chính doanh nghiệp sang "${loc.addressLine}".` });
          locations.reload();
        } catch (err) {
          setNotice({ tone: "error", text: toApiFailure(err).message });
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const promptDeleteLocation = (loc: CompanyLocationDto) => {
    const isHQ = loc.isHeadquarters;
    const isOnly = totalLocations <= 1;

    let description = `Bạn có chắc chắn muốn xóa địa điểm: "${loc.addressLine || loc.id}"?`;
    if (isHQ && isOnly) {
      description += " Lưu ý: Đây là địa điểm duy nhất của doanh nghiệp. Sau khi xóa, doanh nghiệp sẽ không còn bất kỳ địa chỉ đăng ký nào trên hệ thống.";
    }

    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận xóa địa điểm làm việc",
      description,
      confirmLabel: "Xóa địa điểm",
      tone: "danger",
      action: async () => {
        setBusyId(loc.id);
        setNotice(null);
        try {
          await companyWorkspaceApi.deleteLocation(active.id, loc.id);
          setNotice({ tone: "ok", text: "Đã xóa địa điểm làm việc thành công." });
          locations.reload();
        } catch (err) {
          setNotice({ tone: "error", text: toApiFailure(err).message });
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const handleExecuteDialog = async () => {
    setDialogLoading(true);
    try {
      await confirmDialog.action();
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    } finally {
      setDialogLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Địa điểm làm việc"
        subtitle="Danh sách các chi nhánh, văn phòng và trụ sở chính của doanh nghiệp."
        actions={
          !showAddForm && !editingLocation && canUpdate && (
            <button
              type="button"
              className={`${ui.btn} ${ui.btnPrimary}`}
              onClick={() => {
                setShowAddForm(true);
                setEditingLocation(null);
                setAddressError("");
                setAddressLine("");
              }}
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

      {/* ADD LOCATION FORM */}
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
                onChange={(e) => {
                  setAddressLine(e.target.value);
                  if (addressError) setAddressError("");
                }}
                required
                disabled={submitting}
                aria-invalid={Boolean(addressError) || undefined}
                aria-describedby={addressError ? "loc-address-error" : "loc-address-hint"}
              />
              {addressError ? (
                <span id="loc-address-error" className={ui.fieldError} role="alert">
                  {addressError}
                </span>
              ) : (
                <span id="loc-address-hint" className={ui.hint}>
                  Nhập số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố để ứng viên dễ dàng nhận biết địa điểm làm việc.
                </span>
              )}
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
                disabled={submitting}
                onClick={() => {
                  setShowAddForm(false);
                  setAddressLine("");
                  setAddressError("");
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* EDIT LOCATION FORM */}
      {editingLocation && (
        <Card title="Chỉnh sửa địa điểm làm việc" style={{ marginBottom: 20 }}>
          <form onSubmit={handleUpdateLocation} noValidate>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="edit-loc-address">
                Địa chỉ chi tiết *
              </label>
              <input
                id="edit-loc-address"
                className={ui.input}
                placeholder="Ví dụ: Tầng 5, Tòa nhà ABC, 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
                value={editAddressLine}
                onChange={(e) => {
                  setEditAddressLine(e.target.value);
                  if (editAddressError) setEditAddressError("");
                }}
                required
                disabled={submitting}
                aria-invalid={Boolean(editAddressError) || undefined}
                aria-describedby={editAddressError ? "edit-loc-address-error" : undefined}
              />
              {editAddressError && (
                <span id="edit-loc-address-error" className={ui.fieldError} role="alert">
                  {editAddressError}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                type="submit"
                className={`${ui.btn} ${ui.btnPrimary}`}
                disabled={submitting || !editAddressLine.trim() || !writes}
                aria-disabled={!writes}
                title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
              >
                {submitting ? "Đang lưu..." : "Cập nhật địa điểm"}
              </button>
              <button
                type="button"
                className={ui.btn}
                disabled={submitting}
                onClick={() => {
                  setEditingLocation(null);
                  setEditAddressLine("");
                  setEditAddressError("");
                }}
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* LOCATIONS LIST */}
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
              {locations.data.map((loc) => {
                const isHQ = loc.isHeadquarters;
                const cannotDeleteHQ = isHQ && totalLocations > 1;

                return (
                  <tr key={loc.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <MapPin
                          size={16}
                          color={isHQ ? "var(--color-primary, #4f6ef7)" : "var(--color-text-secondary, #64748b)"}
                          style={{ marginTop: 2, flexShrink: 0 }}
                        />
                        <div>
                          <strong>{loc.addressLine || "Chưa có địa chỉ chi tiết"}</strong>
                          {isHQ && (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-primary, #4f6ef7)", marginTop: 2, fontWeight: 600 }}>
                              Trụ sở làm việc chính thức
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {[loc.wardName, loc.provinceName].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td>{loc.countryCode || "VN"}</td>
                    <td>
                      {isHQ ? (
                        <Badge tone="success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <ShieldCheck size={12} />
                          <span>Trụ sở chính</span>
                        </Badge>
                      ) : (
                        <Badge tone="neutral" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Building size={12} />
                          <span>Chi nhánh</span>
                        </Badge>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {canUpdate && (
                          <button
                            type="button"
                            className={ui.btn}
                            disabled={!writes || busyId === loc.id || submitting}
                            aria-disabled={!writes}
                            title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                            onClick={() => handleStartEdit(loc)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            <Edit3 size={13} />
                            <span>Sửa</span>
                          </button>
                        )}

                        {!isHQ && (
                          <button
                            type="button"
                            className={ui.btn}
                            disabled={!writes || !canUpdate || busyId === loc.id}
                            aria-disabled={!writes || !canUpdate}
                            title={
                              !canUpdate
                                ? "Tài khoản không có quyền thay đổi trụ sở chính"
                                : !writes
                                ? "Cổng ghi dữ liệu đang khóa"
                                : "Chuyển địa điểm này làm trụ sở chính của doanh nghiệp"
                            }
                            onClick={() => promptPromoteHeadquarters(loc)}
                          >
                            Đặt làm trụ sở chính
                          </button>
                        )}

                        <button
                          type="button"
                          className={ui.btn}
                          disabled={!writes || !canUpdate || busyId === loc.id || cannotDeleteHQ}
                          aria-disabled={!writes || !canUpdate || cannotDeleteHQ}
                          title={
                            cannotDeleteHQ
                              ? "Không thể xóa trụ sở chính khi còn chi nhánh khác. Hãy chuyển trụ sở chính sang địa điểm khác trước."
                              : !canUpdate
                              ? "Tài khoản không có quyền xóa địa điểm"
                              : !writes
                              ? "Cổng ghi dữ liệu đang khóa"
                              : "Xóa địa điểm này khỏi doanh nghiệp"
                          }
                          onClick={() => promptDeleteLocation(loc)}
                          style={cannotDeleteHQ ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SAFE CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleExecuteDialog}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        tone={confirmDialog.tone}
        loading={dialogLoading}
      />
    </>
  );
};

export default EmployerLocationsPage;
