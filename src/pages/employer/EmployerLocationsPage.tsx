import { useState, useEffect, type FormEvent, useMemo } from "react";
import { MapPin, Building, Edit3, ShieldCheck, Search, Check, AlertCircle } from "lucide-react";
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, ConfirmationModal, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi, type CompanyLocationInput } from "@/services/api/companyWorkspaceApi";
import { publicApi } from "@/services/api/publicApi";
import type { CompanyLocationDto, ProvinceDto, WardDto } from "@/services/api/apiTypes";
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
  const provinces = useAsyncData((s) => publicApi.listProvinces(s), []);
  const countries = useAsyncData((s) => publicApi.listCountries(s), []);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CompanyLocationDto | null>(null);

  // Form states (Add)
  const [countryCode, setCountryCode] = useState("VN");
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedWardId, setSelectedWardId] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [provinceSearch, setProvinceSearch] = useState("");
  const [wardsList, setWardsList] = useState<WardDto[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  // Form states (Edit)
  const [editCountryCode, setEditCountryCode] = useState("VN");
  const [editProvinceId, setEditProvinceId] = useState("");
  const [editWardId, setEditWardId] = useState("");
  const [editAddressLine, setEditAddressLine] = useState("");
  const [editProvinceSearch, setEditProvinceSearch] = useState("");
  const [editWardsList, setEditWardsList] = useState<WardDto[]>([]);
  const [editLoadingWards, setEditLoadingWards] = useState(false);

  // Form error states
  const [formErrors, setFormErrors] = useState<{ province?: string; address?: string }>({});
  const [editFormErrors, setEditFormErrors] = useState<{ province?: string; address?: string }>({});

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

  // Filtered provinces for Add
  const filteredProvinces = useMemo(() => {
    const list = provinces.data ?? [];
    if (!provinceSearch.trim()) return list;
    const q = provinceSearch.toLowerCase().trim();
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.code.includes(q));
  }, [provinces.data, provinceSearch]);

  // Filtered provinces for Edit
  const editFilteredProvinces = useMemo(() => {
    const list = provinces.data ?? [];
    if (!editProvinceSearch.trim()) return list;
    const q = editProvinceSearch.toLowerCase().trim();
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.code.includes(q));
  }, [provinces.data, editProvinceSearch]);

  // Load wards when province changes in Add form
  useEffect(() => {
    if (!selectedProvinceId || !provinces.data) {
      setWardsList([]);
      setSelectedWardId("");
      return;
    }
    const prov = provinces.data.find((p) => p.id === selectedProvinceId);
    if (!prov) return;

    let activeFetch = true;
    setLoadingWards(true);
    publicApi
      .listWards(prov.code)
      .then((wards) => {
        if (activeFetch) {
          setWardsList(wards);
        }
      })
      .catch(() => {
        if (activeFetch) setWardsList([]);
      })
      .finally(() => {
        if (activeFetch) setLoadingWards(false);
      });

    return () => {
      activeFetch = false;
    };
  }, [selectedProvinceId, provinces.data]);

  // Load wards when province changes in Edit form
  useEffect(() => {
    if (!editProvinceId || !provinces.data) {
      setEditWardsList([]);
      setEditWardId("");
      return;
    }
    const prov = provinces.data.find((p) => p.id === editProvinceId);
    if (!prov) return;

    let activeFetch = true;
    setEditLoadingWards(true);
    publicApi
      .listWards(prov.code)
      .then((wards) => {
        if (activeFetch) {
          setEditWardsList(wards);
        }
      })
      .catch(() => {
        if (activeFetch) setEditWardsList([]);
      })
      .finally(() => {
        if (activeFetch) setEditLoadingWards(false);
      });

    return () => {
      activeFetch = false;
    };
  }, [editProvinceId, provinces.data]);

  const validateForm = (provId: string, addr: string): { valid: boolean; errors: { province?: string; address?: string } } => {
    const errs: { province?: string; address?: string } = {};
    const trimmedAddr = addr.trim();

    if (!provId && !trimmedAddr) {
      errs.address = "Vui lòng chọn Tỉnh/Thành phố hoặc nhập địa chỉ chi tiết.";
    } else if (trimmedAddr && trimmedAddr.length > 255) {
      errs.address = "Địa chỉ chi tiết không được vượt quá 255 ký tự.";
    }

    return { valid: Object.keys(errs).length === 0, errors: errs };
  };

  const handleCreateLocation = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const { valid, errors } = validateForm(selectedProvinceId, addressLine);
    setFormErrors(errors);
    if (!valid) return;

    setSubmitting(true);
    try {
      const payload: CompanyLocationInput = {
        countryCode: countryCode || "VN",
        provinceId: selectedProvinceId || null,
        wardId: selectedWardId || null,
        addressLine: addressLine.trim() || null,
      };
      await companyWorkspaceApi.createLocation(active.id, payload);
      setNotice({ tone: "ok", text: "Đã thêm địa điểm làm việc mới thành công." });
      setAddressLine("");
      setSelectedProvinceId("");
      setSelectedWardId("");
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
    setEditCountryCode(loc.countryCode || "VN");
    setEditProvinceId(loc.provinceId || loc.province?.id || "");
    setEditWardId(loc.wardId || loc.ward?.id || "");
    setEditAddressLine(loc.addressLine || "");
    setEditFormErrors({});
    setShowAddForm(false);
    setNotice(null);
  };

  const handleUpdateLocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;
    setNotice(null);
    const { valid, errors } = validateForm(editProvinceId, editAddressLine);
    setEditFormErrors(errors);
    if (!valid) return;

    setSubmitting(true);
    try {
      const payload: CompanyLocationInput = {
        countryCode: editCountryCode || "VN",
        provinceId: editProvinceId || null,
        wardId: editWardId || null,
        addressLine: editAddressLine.trim() || null,
      };
      await companyWorkspaceApi.updateLocation(active.id, editingLocation.id, payload);
      setNotice({ tone: "ok", text: "Đã cập nhật thông tin địa điểm làm việc thành công." });
      setEditingLocation(null);
      setEditAddressLine("");
      setEditProvinceId("");
      setEditWardId("");
      locations.reload();
    } catch (apiErr) {
      setNotice({ tone: "error", text: toApiFailure(apiErr).message });
    } finally {
      setSubmitting(false);
    }
  };

  const promptPromoteHeadquarters = (loc: CompanyLocationDto) => {
    const locTitle = loc.addressLine || loc.provinceName || "địa điểm này";
    setConfirmDialog({
      isOpen: true,
      title: "Chuyển trụ sở chính doanh nghiệp",
      description: `Bạn có chắc chắn muốn chuyển trụ sở chính của doanh nghiệp sang địa điểm: "${locTitle}"? Các tin tuyển dụng và hồ sơ pháp lý sẽ cập nhật theo trụ sở mới.`,
      confirmLabel: "Chuyển trụ sở chính",
      tone: "primary",
      action: async () => {
        setBusyId(loc.id);
        setNotice(null);
        try {
          await companyWorkspaceApi.promoteHeadquarters(active.id, loc.id);
          setNotice({ tone: "ok", text: `Đã chuyển trụ sở chính doanh nghiệp sang "${locTitle}".` });
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

    let description = `Bạn có chắc chắn muốn xóa địa điểm: "${loc.addressLine || loc.provinceName || loc.id}"?`;
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

  return (
    <>
      <PageHeader
        title="Địa điểm làm việc"
        subtitle="Quản lý mạng lưới trụ sở chính và chi nhánh văn phòng theo danh mục đơn vị hành chính chuẩn hóa."
        actions={
          !showAddForm && !editingLocation && canUpdate && (
            <button
              type="button"
              className={`${ui.btn} ${ui.btnPrimary}`}
              onClick={() => {
                setShowAddForm(true);
                setEditingLocation(null);
                setFormErrors({});
                setSelectedProvinceId("");
                setSelectedWardId("");
                setAddressLine("");
                setCountryCode("VN");
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
              {/* COUNTRY SELECTOR */}
              <div className={ui.field}>
                <label className={ui.label} htmlFor="loc-country">
                  Quốc gia *
                </label>
                <select
                  id="loc-country"
                  className={ui.input}
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  disabled={submitting}
                >
                  <option value="VN">Việt Nam (VN)</option>
                  {(countries.data || []).filter((c) => c.code !== "VN").map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* SEARCHABLE PROVINCE SELECTOR */}
              <div className={ui.field}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className={ui.label} htmlFor="loc-province">
                    Tỉnh / Thành phố *
                  </label>
                  <span className={ui.hint} style={{ fontSize: "0.75rem" }}>
                    {filteredProvinces.length} lựa chọn
                  </span>
                </div>
                <div style={{ position: "relative", marginBottom: 6 }}>
                  <input
                    type="text"
                    className={ui.input}
                    placeholder="Lọc tỉnh/thành phố..."
                    value={provinceSearch}
                    onChange={(e) => setProvinceSearch(e.target.value)}
                    style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                    aria-label="Lọc danh sách tỉnh thành"
                  />
                </div>
                {provinces.loading ? (
                  <div className={ui.hint} style={{ padding: "8px 0" }}>Đang tải 34 tỉnh thành...</div>
                ) : (
                  <select
                    id="loc-province"
                    className={ui.input}
                    value={selectedProvinceId}
                    onChange={(e) => {
                      setSelectedProvinceId(e.target.value);
                      if (formErrors.province) setFormErrors((err) => ({ ...err, province: undefined }));
                    }}
                    disabled={submitting}
                    aria-describedby={formErrors.province ? "loc-province-error" : undefined}
                  >
                    <option value="">-- Chọn Tỉnh / Thành phố --</option>
                    {filteredProvinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.divisionType === "centrally-governed-city" ? "Thành phố trực thuộc TW" : "Tỉnh"})
                      </option>
                    ))}
                  </select>
                )}
                {formErrors.province && (
                  <span id="loc-province-error" className={ui.fieldError} role="alert">
                    {formErrors.province}
                  </span>
                )}
              </div>

              {/* WARD / COMMUNE SELECTOR */}
              <div className={ui.field}>
                <label className={ui.label} htmlFor="loc-ward">
                  Phường / Xã / Đặc khu
                </label>
                {loadingWards ? (
                  <div className={ui.hint} style={{ padding: "8px 0" }}>Đang tải phường/xã...</div>
                ) : wardsList.length > 0 ? (
                  <select
                    id="loc-ward"
                    className={ui.input}
                    value={selectedWardId}
                    onChange={(e) => setSelectedWardId(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">-- Chọn Phường / Xã --</option>
                    {wardsList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                ) : selectedProvinceId ? (
                  <div
                    style={{
                      padding: "8px 10px",
                      background: "#fffbeb",
                      border: "1px solid #fef3c7",
                      borderRadius: 6,
                      fontSize: "0.8125rem",
                      color: "#92400e",
                      lineHeight: 1.4,
                    }}
                    role="status"
                  >
                    <strong>Thông báo hệ thống danh mục:</strong> Dữ liệu phường/xã chưa có trong cơ sở dữ liệu (0 kết quả từ API <code>/reference/wards</code>). Quý doanh nghiệp vui lòng ghi rõ phường/xã tại ô địa chỉ chi tiết bên dưới.
                  </div>
                ) : (
                  <div style={{ padding: "8px 10px", background: "var(--color-surface-soft, #f8fafc)", borderRadius: 6, border: "1px dashed var(--color-border, #cbd5e1)", fontSize: "0.8125rem", color: "var(--color-text-secondary, #64748b)" }}>
                    Vui lòng chọn Tỉnh/Thành phố trước.
                  </div>
                )}
              </div>
            </div>

            {/* DETAILED ADDRESS LINE */}
            <div className={ui.field}>
              <label className={ui.label} htmlFor="loc-address">
                Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà...)
              </label>
              <input
                id="loc-address"
                className={ui.input}
                placeholder="Ví dụ: Tầng 5, Tòa nhà ABC, 123 Đường Nguyễn Huệ, Phường Bến Nghé"
                value={addressLine}
                onChange={(e) => {
                  setAddressLine(e.target.value);
                  if (formErrors.address) setFormErrors((err) => ({ ...err, address: undefined }));
                }}
                disabled={submitting}
                aria-invalid={Boolean(formErrors.address) || undefined}
                aria-describedby={formErrors.address ? "loc-address-error" : "loc-address-hint"}
              />
              {formErrors.address ? (
                <span id="loc-address-error" className={ui.fieldError} role="alert">
                  {formErrors.address}
                </span>
              ) : (
                <span id="loc-address-hint" className={ui.hint}>
                  Nhập số nhà, tên đường hoặc địa chỉ cụ thể để ứng viên dễ dàng định vị khi đến phỏng vấn và làm việc.
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                type="submit"
                className={`${ui.btn} ${ui.btnPrimary}`}
                disabled={submitting || (!selectedProvinceId && !addressLine.trim()) || !writes}
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
                  setSelectedProvinceId("");
                  setSelectedWardId("");
                  setFormErrors({});
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
              {/* COUNTRY SELECTOR */}
              <div className={ui.field}>
                <label className={ui.label} htmlFor="edit-loc-country">
                  Quốc gia *
                </label>
                <select
                  id="edit-loc-country"
                  className={ui.input}
                  value={editCountryCode}
                  onChange={(e) => setEditCountryCode(e.target.value)}
                  disabled={submitting}
                >
                  <option value="VN">Việt Nam (VN)</option>
                  {(countries.data || []).filter((c) => c.code !== "VN").map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* SEARCHABLE PROVINCE SELECTOR */}
              <div className={ui.field}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className={ui.label} htmlFor="edit-loc-province">
                    Tỉnh / Thành phố
                  </label>
                  <span className={ui.hint} style={{ fontSize: "0.75rem" }}>
                    {editFilteredProvinces.length} lựa chọn
                  </span>
                </div>
                <div style={{ position: "relative", marginBottom: 6 }}>
                  <input
                    type="text"
                    className={ui.input}
                    placeholder="Lọc tỉnh/thành phố..."
                    value={editProvinceSearch}
                    onChange={(e) => setEditProvinceSearch(e.target.value)}
                    style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                    aria-label="Lọc danh sách tỉnh thành chỉnh sửa"
                  />
                </div>
                {provinces.loading ? (
                  <div className={ui.hint} style={{ padding: "8px 0" }}>Đang tải danh mục...</div>
                ) : (
                  <select
                    id="edit-loc-province"
                    className={ui.input}
                    value={editProvinceId}
                    onChange={(e) => {
                      setEditProvinceId(e.target.value);
                      if (editFormErrors.province) setEditFormErrors((err) => ({ ...err, province: undefined }));
                    }}
                    disabled={submitting}
                  >
                    <option value="">-- Chọn Tỉnh / Thành phố --</option>
                    {editFilteredProvinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.divisionType === "centrally-governed-city" ? "Thành phố trực thuộc TW" : "Tỉnh"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* WARD SELECTOR */}
              <div className={ui.field}>
                <label className={ui.label} htmlFor="edit-loc-ward">
                  Phường / Xã / Đặc khu
                </label>
                {editLoadingWards ? (
                  <div className={ui.hint} style={{ padding: "8px 0" }}>Đang tải phường/xã...</div>
                ) : editWardsList.length > 0 ? (
                  <select
                    id="edit-loc-ward"
                    className={ui.input}
                    value={editWardId}
                    onChange={(e) => setEditWardId(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">-- Chọn Phường / Xã --</option>
                    {editWardsList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                ) : editProvinceId ? (
                  <div
                    style={{
                      padding: "8px 10px",
                      background: "#fffbeb",
                      border: "1px solid #fef3c7",
                      borderRadius: 6,
                      fontSize: "0.8125rem",
                      color: "#92400e",
                      lineHeight: 1.4,
                    }}
                    role="status"
                  >
                    <strong>Thông báo hệ thống danh mục:</strong> Dữ liệu phường/xã chưa có trong cơ sở dữ liệu (0 kết quả từ API <code>/reference/wards</code>). Quý doanh nghiệp vui lòng ghi rõ phường/xã tại ô địa chỉ chi tiết bên dưới.
                  </div>
                ) : (
                  <div style={{ padding: "8px 10px", background: "var(--color-surface-soft, #f8fafc)", borderRadius: 6, border: "1px dashed var(--color-border, #cbd5e1)", fontSize: "0.8125rem", color: "var(--color-text-secondary, #64748b)" }}>
                    Vui lòng chọn Tỉnh/Thành phố trước.
                  </div>
                )}
              </div>
            </div>

            {/* DETAILED ADDRESS LINE */}
            <div className={ui.field}>
              <label className={ui.label} htmlFor="edit-loc-address">
                Địa chỉ chi tiết *
              </label>
              <input
                id="edit-loc-address"
                className={ui.input}
                placeholder="Ví dụ: Tầng 5, Tòa nhà ABC, 123 Đường Nguyễn Huệ, Phường Bến Nghé"
                value={editAddressLine}
                onChange={(e) => {
                  setEditAddressLine(e.target.value);
                  if (editFormErrors.address) setEditFormErrors((err) => ({ ...err, address: undefined }));
                }}
                disabled={submitting}
                aria-invalid={Boolean(editFormErrors.address) || undefined}
                aria-describedby={editFormErrors.address ? "edit-loc-address-error" : undefined}
              />
              {editFormErrors.address && (
                <span id="edit-loc-address-error" className={ui.fieldError} role="alert">
                  {editFormErrors.address}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                type="submit"
                className={`${ui.btn} ${ui.btnPrimary}`}
                disabled={submitting || (!editProvinceId && !editAddressLine.trim()) || !writes}
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
                  setEditProvinceId("");
                  setEditWardId("");
                  setEditFormErrors({});
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
                <th scope="col">Địa chỉ & Tên cơ sở</th>
                <th scope="col">Khu vực hành chính</th>
                <th scope="col">Quốc gia</th>
                <th scope="col">Phân loại</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {locations.data.map((loc) => {
                const isHQ = loc.isHeadquarters;
                const cannotDeleteHQ = isHQ && totalLocations > 1;
                const areaLabel = [loc.ward?.name || loc.wardName, loc.province?.name || loc.provinceName].filter(Boolean).join(", ");
                const isLegacy = !loc.provinceId && !loc.province && Boolean(loc.addressLine);

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
                          {isLegacy && (
                            <div style={{ marginTop: 4 }}>
                              <Badge tone="neutral" style={{ fontSize: "0.7rem" }}>Địa chỉ truyền thống</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {areaLabel || (isLegacy ? <span className={ui.hint}>Chưa chuẩn hóa tỉnh/thành</span> : "—")}
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

      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        tone={confirmDialog.tone}
        loading={dialogLoading}
        onConfirm={async () => {
          setDialogLoading(true);
          try {
            await confirmDialog.action();
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          } finally {
            setDialogLoading(false);
          }
        }}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

export default EmployerLocationsPage;
