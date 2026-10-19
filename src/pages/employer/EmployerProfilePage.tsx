import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi, type UpdateCompanyProfileInput } from "@/services/api/companyWorkspaceApi";
import { publicApi } from "@/services/api/publicApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

const EMPLOYEE_SIZE_OPTIONS = [
  "1-10 nhân viên",
  "11-50 nhân viên",
  "51-200 nhân viên",
  "201-500 nhân viên",
  "501-1000 nhân viên",
  "1000+ nhân viên",
];

const EmployerProfilePage = () => {
  const { active } = useCompanyWorkspace();
  const profile = useAsyncData((s) => companyWorkspaceApi.getProfile(active.id, s), [active.id]);
  const categories = useAsyncData((s) => publicApi.listJobCategories(s), []);

  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<UpdateCompanyProfileInput>({});
  const [saving, setSaving] = useState(false);
  const [requestingVerify, setRequestingVerify] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const writes = isWorkspaceWritesEnabled();

  useEffect(() => {
    if (profile.data) {
      setFormValues({
        name: profile.data.name || "",
        legalName: profile.data.legalName || "",
        taxCode: profile.data.taxCode || "",
        industryId: profile.data.industryId || "",
        description: profile.data.description || "",
        website: profile.data.website || "",
        employeeSizeRange: profile.data.employeeSizeRange || "",
        foundedYear: profile.data.foundedYear ?? undefined,
      });
    }
  }, [profile.data]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const payload: UpdateCompanyProfileInput = {
        name: formValues.name?.trim() || undefined,
        legalName: formValues.legalName?.trim() || null,
        taxCode: formValues.taxCode?.trim() || null,
        industryId: formValues.industryId || null,
        description: formValues.description?.trim() || null,
        website: formValues.website?.trim() || null,
        employeeSizeRange: formValues.employeeSizeRange || null,
        foundedYear: formValues.foundedYear ? Number(formValues.foundedYear) : null,
      };

      await companyWorkspaceApi.updateProfile(active.id, payload);
      setMessage({ tone: "ok", text: "Đã cập nhật hồ sơ doanh nghiệp thành công." });
      setIsEditing(false);
      profile.reload();
    } catch (err) {
      setMessage({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestVerification = async () => {
    setMessage(null);
    setRequestingVerify(true);
    try {
      await companyWorkspaceApi.requestVerification(active.id);
      setMessage({
        tone: "ok",
        text: "Đã gửi yêu cầu xác minh doanh nghiệp. Ban quản trị sẽ tiến hành kiểm duyệt.",
      });
      profile.reload();
    } catch (err) {
      setMessage({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setRequestingVerify(false);
    }
  };

  const canRequestVerification =
    Boolean(profile.data?.legalName && profile.data?.taxCode) &&
    (profile.data?.verificationStatus === "UNVERIFIED" || profile.data?.verificationStatus === "REJECTED");

  return (
    <>
      <PageHeader
        title="Hồ sơ doanh nghiệp"
        subtitle="Thông tin pháp lý, thương hiệu và thông tin liên hệ của công ty."
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!isEditing && (
              <button
                type="button"
                className={`${ui.btn} ${ui.btnPrimary}`}
                onClick={() => setIsEditing(true)}
              >
                Chỉnh sửa hồ sơ
              </button>
            )}
            <Link className={ui.btn} to="/employer/locations">
              Quản lý địa điểm →
            </Link>
          </div>
        }
      />
      <WritesDisabledNotice />

      {message && (
        <div
          className={`${ui.notice} ${message.tone === "error" ? ui.noticeWarn : ""}`}
          role={message.tone === "error" ? "alert" : "status"}
          style={{ marginBottom: 16 }}
        >
          {message.text}
        </div>
      )}

      {profile.loading ? (
        <LoadingBlock rows={4} label="Đang tải hồ sơ doanh nghiệp" />
      ) : profile.error ? (
        <ApiErrorState error={profile.error} onRetry={profile.reload} />
      ) : !profile.data ? (
        <EmptyState title="Chưa có dữ liệu hồ sơ" text="Không tìm thấy thông tin hồ sơ của doanh nghiệp." />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Card: Verification Status & Actions */}
          <Card title="Trạng thái xác minh pháp lý">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ margin: "0 0 6px" }}>
                  Tình trạng hiện tại:{" "}
                  <Badge
                    tone={
                      profile.data.verificationStatus === "VERIFIED"
                        ? "success"
                        : profile.data.verificationStatus === "REJECTED"
                        ? "danger"
                        : profile.data.verificationStatus === "PENDING"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {profile.data.verificationStatus === "VERIFIED"
                      ? "Đã xác minh"
                      : profile.data.verificationStatus === "REJECTED"
                      ? "Bị từ chối xác minh"
                      : profile.data.verificationStatus === "PENDING"
                      ? "Đang chờ quản trị viên xét duyệt"
                      : "Chưa xác minh"}
                  </Badge>
                </p>
                <span className={ui.hint}>
                  Doanh nghiệp được xác minh sẽ hiển thị huy hiệu uy tín công khai đối với tất cả ứng viên.
                </span>
              </div>

              {profile.data.verificationStatus !== "VERIFIED" && profile.data.verificationStatus !== "PENDING" && (
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnPrimary}`}
                  disabled={!canRequestVerification || requestingVerify || !writes}
                  aria-disabled={!canRequestVerification || !writes}
                  title={
                    !writes
                      ? "Cổng ghi dữ liệu đang khóa"
                      : !canRequestVerification
                      ? "Cần có Tên pháp lý và Mã số thuế để gửi yêu cầu"
                      : undefined
                  }
                  onClick={handleRequestVerification}
                >
                  {requestingVerify ? "Đang gửi..." : "Gửi yêu cầu xác minh"}
                </button>
              )}
            </div>

            {!profile.data.legalName || !profile.data.taxCode ? (
              <p style={{ margin: "12px 0 0", fontSize: "0.875rem", color: "var(--color-warning, #d97706)" }}>
                * Lưu ý: Bạn cần cập nhật đầy đủ <strong>Tên pháp lý</strong> và <strong>Mã số thuế</strong> ở biểu mẫu bên dưới trước khi có thể gửi yêu cầu xác minh.
              </p>
            ) : null}
          </Card>

          {/* Card: Profile Details / Form */}
          {isEditing ? (
            <Card title="Chỉnh sửa thông tin doanh nghiệp">
              <form onSubmit={handleSaveProfile} noValidate>
                <div className={ui.formGrid}>
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="prof-name">
                      Tên hiển thị doanh nghiệp *
                    </label>
                    <input
                      id="prof-name"
                      className={ui.input}
                      value={formValues.name || ""}
                      onChange={(e) => setFormValues((v) => ({ ...v, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="prof-legalName">
                      Tên pháp lý doanh nghiệp
                    </label>
                    <input
                      id="prof-legalName"
                      className={ui.input}
                      placeholder="Tên đầy đủ trên giấy phép kinh doanh"
                      value={formValues.legalName || ""}
                      onChange={(e) => setFormValues((v) => ({ ...v, legalName: e.target.value }))}
                    />
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="prof-taxCode">
                      Mã số thuế
                    </label>
                    <input
                      id="prof-taxCode"
                      className={ui.input}
                      placeholder="Ví dụ: 0101234567"
                      value={formValues.taxCode || ""}
                      onChange={(e) => setFormValues((v) => ({ ...v, taxCode: e.target.value }))}
                    />
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="prof-industry">
                      Lĩnh vực hoạt động
                    </label>
                    <select
                      id="prof-industry"
                      className={ui.select}
                      value={formValues.industryId || ""}
                      onChange={(e) => setFormValues((v) => ({ ...v, industryId: e.target.value }))}
                    >
                      <option value="">Chọn lĩnh vực</option>
                      {(categories.data ?? []).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="prof-size">
                      Quy mô nhân sự
                    </label>
                    <select
                      id="prof-size"
                      className={ui.select}
                      value={formValues.employeeSizeRange || ""}
                      onChange={(e) => setFormValues((v) => ({ ...v, employeeSizeRange: e.target.value }))}
                    >
                      <option value="">Chọn quy mô</option>
                      {EMPLOYEE_SIZE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="prof-year">
                      Năm thành lập
                    </label>
                    <input
                      id="prof-year"
                      type="number"
                      className={ui.input}
                      placeholder="Ví dụ: 2020"
                      min={1800}
                      max={9999}
                      value={formValues.foundedYear ?? ""}
                      onChange={(e) => setFormValues((v) => ({ ...v, foundedYear: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </div>

                  <div className={ui.field} style={{ gridColumn: "1 / -1" }}>
                    <label className={ui.label} htmlFor="prof-website">
                      Địa chỉ Website (URL)
                    </label>
                    <input
                      id="prof-website"
                      type="url"
                      className={ui.input}
                      placeholder="https://example.com"
                      value={formValues.website || ""}
                      onChange={(e) => setFormValues((v) => ({ ...v, website: e.target.value }))}
                    />
                  </div>
                </div>

                <div className={ui.field} style={{ marginTop: 16 }}>
                  <label className={ui.label} htmlFor="prof-desc">
                    Giới thiệu tổng quan về công ty
                  </label>
                  <textarea
                    id="prof-desc"
                    className={ui.textarea}
                    rows={5}
                    placeholder="Giới thiệu sứ mệnh, văn hóa làm việc và các giá trị cốt lõi..."
                    value={formValues.description || ""}
                    onChange={(e) => setFormValues((v) => ({ ...v, description: e.target.value }))}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                  <button
                    type="submit"
                    className={`${ui.btn} ${ui.btnPrimary}`}
                    disabled={saving || !writes}
                    aria-disabled={!writes}
                    title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                  <button
                    type="button"
                    className={ui.btn}
                    onClick={() => {
                      setIsEditing(false);
                      setMessage(null);
                    }}
                  >
                    Hủy bỏ
                  </button>
                </div>
              </form>
            </Card>
          ) : (
            <>
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
                    <span className={ui.label}>Mã số thuế</span>
                    <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                      {profile.data.taxCode || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className={ui.field}>
                    <span className={ui.label}>Đường dẫn (Slug)</span>
                    <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                      {profile.data.slug || "—"}
                    </span>
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
                  <div className={ui.field}>
                    <span className={ui.label}>Năm thành lập</span>
                    <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                      {profile.data.foundedYear || "Chưa cập nhật"}
                    </span>
                  </div>
                </div>
              </Card>

              <Card title="Giới thiệu công ty">
                <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                  {profile.data.description || "Doanh nghiệp chưa bổ sung mô tả giới thiệu."}
                </p>
              </Card>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default EmployerProfilePage;
