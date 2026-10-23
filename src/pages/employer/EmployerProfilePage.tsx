import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Building2,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  MapPin,
  Image as ImageIcon,
  Upload,
  Trash2,
  Camera,
} from "lucide-react";
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, ConfirmationModal, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi, type UpdateCompanyProfileInput } from "@/services/api/companyWorkspaceApi";
import { publicApi } from "@/services/api/publicApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { canUpdateCompany } from "@/features/company/companyWorkspacePermissions";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

const EMPLOYEE_SIZE_OPTIONS = [
  "1-10 nhân viên",
  "11-50 nhân viên",
  "51-200 nhân viên",
  "201-500 nhân viên",
  "501-1000 nhân viên",
  "1000+ nhân viên",
];

interface FormErrors {
  name?: string;
  website?: string;
  foundedYear?: string;
  description?: string;
  legalName?: string;
  taxCode?: string;
}

interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

const validateImageFile = (
  file: File,
  kind: "logo" | "cover"
): Promise<ImageValidationResult> => {
  const type = file.type.toLowerCase();
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!validTypes.includes(type)) {
    return Promise.resolve({
      valid: false,
      error: "Định dạng tệp ảnh không được hỗ trợ. Vui lòng chỉ tải lên ảnh PNG, JPEG hoặc WebP.",
    });
  }

  const maxBytes = kind === "logo" ? 1024 * 1024 : 2 * 1024 * 1024;
  const maxLabel = kind === "logo" ? "1MB" : "2MB";
  if (file.size > maxBytes) {
    return Promise.resolve({
      valid: false,
      error: `Dung lượng tệp (${(file.size / (1024 * 1024)).toFixed(2)}MB) vượt quá giới hạn tối đa ${maxLabel}.`,
    });
  }

  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof Image === "undefined") {
      resolve({ valid: true });
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = kind === "logo" ? 2048 : 4096;
      if (img.naturalWidth > maxDim || img.naturalHeight > maxDim) {
        resolve({
          valid: false,
          error: `Kích thước ảnh (${img.naturalWidth}x${img.naturalHeight}px) vượt quá giới hạn tối đa ${maxDim}x${maxDim}px.`,
        });
        return;
      }
      if (img.naturalWidth * img.naturalHeight > 8388608) {
        resolve({
          valid: false,
          error: `Tổng số điểm ảnh (${img.naturalWidth * img.naturalHeight}) vượt quá giới hạn 8,388,608 pixel.`,
        });
        return;
      }
      resolve({ valid: true });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        valid: false,
        error: "Không thể đọc nội dung tệp hình ảnh. Tệp có thể bị hỏng.",
      });
    };
  });
};

const mapMediaError = (err: unknown): string => {
  if (err && typeof err === "object") {
    const errorObj = err as { code?: string; status?: number; message?: string };
    if (errorObj.status === 503 || errorObj.code === "COMPANY_MEDIA_STORAGE_UNAVAILABLE") {
      return "Dịch vụ lưu trữ media tập trung chưa được cấu hình trên máy chủ (503 COMPANY_MEDIA_STORAGE_UNAVAILABLE). Vui lòng liên hệ quản trị viên.";
    }
    if (errorObj.status === 413 || errorObj.code === "COMPANY_MEDIA_SIZE_INVALID") {
      return "Tệp ảnh vượt quá dung lượng tối đa cho phép của máy chủ (HTTP 413 Payload Too Large).";
    }
    if (errorObj.status === 415 || errorObj.code === "COMPANY_MEDIA_TYPE_INVALID") {
      return "Định dạng tệp ảnh không được máy chủ hỗ trợ. Vui lòng tải lên ảnh PNG, JPEG hoặc WebP.";
    }
    if (errorObj.code === "COMPANY_MEDIA_DIMENSIONS_INVALID") {
      return "Kích thước chiều ảnh vượt quá giới hạn máy chủ cho phép.";
    }
    if (errorObj.code === "COMPANY_MEDIA_FILE_REQUIRED") {
      return "Vui lòng chọn tệp hình ảnh hợp lệ để tải lên.";
    }
    if (errorObj.status === 403) {
      return "Bạn không có quyền cập nhật phương tiện nhận diện của doanh nghiệp này.";
    }
    if (errorObj.status === 401) {
      return "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.";
    }
    if (errorObj.message) {
      return errorObj.message;
    }
  }
  return "Không thể thao tác với tệp ảnh. Vui lòng thử lại sau.";
};

const EmployerProfilePage = () => {
  const { active, reload: reloadWorkspace } = useCompanyWorkspace();
  const [params, setParams] = useSearchParams();
  const currentTab = params.get("tab") === "legal" ? "legal" : "brand";

  const profile = useAsyncData((s) => companyWorkspaceApi.getProfile(active.id, s), [active.id]);
  const categories = useAsyncData((s) => publicApi.listJobCategories(s), []);
  const locations = useAsyncData((s) => companyWorkspaceApi.listLocations(active.id, s), [active.id]);
  const jobs = useAsyncData((s) => companyWorkspaceApi.listJobs(active.id, { pageSize: 50 }, s), [active.id]);

  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [isEditingLegal, setIsEditingLegal] = useState(false);
  const [formValues, setFormValues] = useState<UpdateCompanyProfileInput>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [requestingVerify, setRequestingVerify] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [logoBust, setLogoBust] = useState<number>(Date.now());
  const [coverBust, setCoverBust] = useState<number>(Date.now());
  const [logoError, setLogoError] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<"logo" | "cover" | null>(null);
  const [mediaNotice, setMediaNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    tone: "danger" | "primary" | "warning";
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmLabel: "Xác nhận",
    tone: "danger",
    action: async () => {},
  });
  const [dialogLoading, setDialogLoading] = useState(false);

  const triggerDeleteMedia = (kind: "logo" | "cover") => {
    const isLogo = kind === "logo";
    setConfirmDialog({
      isOpen: true,
      title: isLogo ? "Xác nhận xóa logo doanh nghiệp" : "Xác nhận xóa ảnh bìa doanh nghiệp",
      description: isLogo
        ? "Bạn có chắc chắn muốn xóa logo doanh nghiệp? Giao diện sẽ quay về huy hiệu nhận diện mặc định theo tên viết tắt."
        : "Bạn có chắc chắn muốn xóa ảnh bìa doanh nghiệp? Giao diện sẽ hiển thị màu nền mặc định.",
      confirmLabel: isLogo ? "Xóa logo" : "Xóa ảnh bìa",
      tone: "danger",
      action: async () => {
        setDialogLoading(true);
        try {
          await companyWorkspaceApi.deleteMedia(active.id, kind);
          if (isLogo) {
            setLogoError(true);
            setLogoBust(Date.now());
          } else {
            setCoverError(true);
            setCoverBust(Date.now());
          }
          setMediaNotice({
            tone: "ok",
            text: isLogo ? "Đã xóa logo thành công." : "Đã xóa ảnh bìa thành công.",
          });
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          setMediaNotice({ tone: "error", text: mapMediaError(err) });
        } finally {
          setDialogLoading(false);
        }
      },
    });
  };

  const handleFileChange = async (
    kind: "logo" | "cover",
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setMediaNotice(null);

    const validation = await validateImageFile(file, kind);
    if (!validation.valid) {
      setMediaNotice({
        tone: "error",
        text: validation.error || "Tệp hình ảnh không hợp lệ.",
      });
      return;
    }

    setUploadingKind(kind);
    try {
      await companyWorkspaceApi.uploadMedia(active.id, kind, file);
      const now = Date.now();
      if (kind === "logo") {
        setLogoError(false);
        setLogoBust(now);
      } else {
        setCoverError(false);
        setCoverBust(now);
      }
      setMediaNotice({
        tone: "ok",
        text: kind === "logo" ? "Tải lên logo doanh nghiệp thành công." : "Tải lên ảnh bìa doanh nghiệp thành công.",
      });
    } catch (err) {
      setMediaNotice({
        tone: "error",
        text: mapMediaError(err),
      });
    } finally {
      setUploadingKind(null);
    }
  };

  const writes = isWorkspaceWritesEnabled();
  const canUpdate = canUpdateCompany(active.memberRoleNames);

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

  const setTab = (tab: "brand" | "legal") => {
    const next = new URLSearchParams(params);
    if (tab === "legal") next.set("tab", "legal");
    else next.delete("tab");
    setParams(next);
    setMessage(null);
    setErrors({});
  };

  const validateBrandForm = (): FormErrors => {
    const errs: FormErrors = {};
    const name = formValues.name?.trim() || "";
    if (!name) {
      errs.name = "Vui lòng nhập tên thương hiệu doanh nghiệp.";
    } else if (name.length < 2) {
      errs.name = "Tên doanh nghiệp phải có ít nhất 2 ký tự.";
    } else if (name.length > 255) {
      errs.name = "Tên doanh nghiệp không được vượt quá 255 ký tự.";
    }

    if (formValues.website) {
      const w = formValues.website.trim();
      if (!/^https?:\/\//i.test(w)) {
        errs.website = "Địa chỉ website phải bắt đầu bằng http:// hoặc https://";
      } else {
        try {
          new URL(w);
        } catch {
          errs.website = "Địa chỉ website không hợp lệ.";
        }
      }
    }

    if (formValues.foundedYear != null && formValues.foundedYear !== ("" as unknown as number)) {
      const year = Number(formValues.foundedYear);
      const curYear = new Date().getFullYear();
      if (isNaN(year) || year < 1800 || year > curYear) {
        errs.foundedYear = `Năm thành lập phải từ 1800 đến năm hiện tại (${curYear}).`;
      }
    }

    if (formValues.description && formValues.description.length > 20000) {
      errs.description = "Mô tả doanh nghiệp không được vượt quá 20,000 ký tự.";
    }

    return errs;
  };

  const validateLegalForm = (): FormErrors => {
    const errs: FormErrors = {};
    const legalName = formValues.legalName?.trim() || "";
    if (!legalName) {
      errs.legalName = "Vui lòng nhập tên pháp lý doanh nghiệp.";
    } else if (legalName.length < 2) {
      errs.legalName = "Tên pháp lý phải có ít nhất 2 ký tự.";
    } else if (legalName.length > 220) {
      errs.legalName = "Tên pháp lý không được vượt quá 220 ký tự.";
    }

    const taxCode = formValues.taxCode?.trim() || "";
    if (!taxCode) {
      errs.taxCode = "Vui lòng nhập mã số thuế doanh nghiệp.";
    } else if (taxCode.length < 10) {
      errs.taxCode = "Mã số thuế doanh nghiệp phải có tối thiểu 10 ký tự.";
    } else if (taxCode.length > 80) {
      errs.taxCode = "Mã số thuế không được vượt quá 80 ký tự.";
    } else if (!/^[0-9A-Za-z-]+$/.test(taxCode)) {
      errs.taxCode = "Mã số thuế chỉ được chứa số, chữ cái và dấu gạch nối.";
    }

    return errs;
  };

  const handleSaveBrand = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const errs = validateBrandForm();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload: UpdateCompanyProfileInput = {
        name: formValues.name?.trim() || undefined,
        industryId: formValues.industryId || null,
        description: formValues.description?.trim() || null,
        website: formValues.website?.trim() || null,
        employeeSizeRange: formValues.employeeSizeRange || null,
        foundedYear: formValues.foundedYear ? Number(formValues.foundedYear) : null,
      };

      await companyWorkspaceApi.updateProfile(active.id, payload);
      setMessage({ tone: "ok", text: "Đã cập nhật thông tin thương hiệu tuyển dụng thành công." });
      setIsEditingBrand(false);
      profile.reload();
      reloadWorkspace();
    } catch (err) {
      setMessage({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLegal = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const errs = validateLegalForm();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload: UpdateCompanyProfileInput = {
        legalName: formValues.legalName?.trim() || null,
        taxCode: formValues.taxCode?.trim() || null,
      };

      await companyWorkspaceApi.updateProfile(active.id, payload);
      setMessage({ tone: "ok", text: "Đã lưu thông tin pháp lý doanh nghiệp thành công." });
      setIsEditingLegal(false);
      profile.reload();
      reloadWorkspace();
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
        text: "Đã gửi yêu cầu xác minh doanh nghiệp thành công. Quản trị viên sẽ kiểm duyệt hồ sơ trong vòng 24–48 giờ.",
      });
      profile.reload();
      reloadWorkspace();
    } catch (err) {
      setMessage({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setRequestingVerify(false);
    }
  };

  const headquarters = (locations.data ?? []).find((l) => l.isHeadquarters) || locations.data?.[0];
  const publishedJobs = (jobs.data?.data ?? []).filter((j) => j.status === "PUBLISHED");
  const industryObj = (categories.data ?? []).find((c) => c.id === profile.data?.industryId);

  const canRequestVerification =
    Boolean(profile.data?.legalName && profile.data?.taxCode) &&
    (profile.data?.verificationStatus === "UNVERIFIED" || profile.data?.verificationStatus === "REJECTED");

  const companyInitials = (profile.data?.name || active.name || "DN")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <PageHeader
        title="Quản trị hồ sơ doanh nghiệp"
        subtitle="Quản lý toàn diện hồ sơ thương hiệu tuyển dụng công khai và hồ sơ pháp lý bảo mật của doanh nghiệp."
        actions={
          <Link
            className={`${ui.btn} ${ui.btnPrimary}`}
            to={`/companies/${active.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span>Xem trang công khai đối với ứng viên</span>
            <ExternalLink size={14} />
          </Link>
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

      {/* NAVIGATION TABS */}
      <div
        role="tablist"
        aria-label="Phân loại hồ sơ doanh nghiệp"
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--color-border, #e2e8f0)",
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={currentTab === "brand"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: currentTab === "brand" ? "var(--color-primary, #4f6ef7)" : "var(--color-text-secondary, #64748b)",
            borderBottom: currentTab === "brand" ? "2px solid var(--color-primary, #4f6ef7)" : "2px solid transparent",
            marginBottom: -1,
            transition: "all 140ms ease",
          }}
          onClick={() => setTab("brand")}
        >
          <Building2 size={18} />
          <span>Thương hiệu tuyển dụng công khai</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={currentTab === "legal"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: currentTab === "legal" ? "var(--color-primary, #4f6ef7)" : "var(--color-text-secondary, #64748b)",
            borderBottom: currentTab === "legal" ? "2px solid var(--color-primary, #4f6ef7)" : "2px solid transparent",
            marginBottom: -1,
            transition: "all 140ms ease",
          }}
          onClick={() => setTab("legal")}
        >
          <ShieldCheck size={18} />
          <span>Hồ sơ pháp lý & Xác minh</span>
          <Badge tone={active.verificationStatus === "VERIFIED" ? "success" : "neutral"} style={{ fontSize: "0.75rem" }}>
            {active.verificationStatus === "VERIFIED" ? "Đã duyệt" : "Chưa duyệt"}
          </Badge>
        </button>
      </div>

      {profile.loading ? (
        <LoadingBlock rows={4} label="Đang tải hồ sơ doanh nghiệp" />
      ) : profile.error ? (
        <ApiErrorState error={profile.error} onRetry={profile.reload} />
      ) : !profile.data ? (
        <EmptyState title="Chưa có dữ liệu hồ sơ" text="Không tìm thấy thông tin hồ sơ của doanh nghiệp." />
      ) : currentTab === "brand" ? (
        /* ========================================================================= */
        /* TAB 1: PUBLIC EMPLOYER BRAND                                             */
        /* ========================================================================= */
        <div style={{ display: "grid", gap: 20 }}>
          {/* BRAND HERO PREVIEW CARD */}
          <div
            style={{
              background: "var(--color-surface, #ffffff)",
              border: "1px solid var(--color-border, #e2e8f0)",
              borderRadius: 12,
              padding: 24,
              display: "flex",
              gap: 20,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 14,
                background: !logoError ? "#ffffff" : "linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%)",
                border: "2px solid #c7d2fe",
                color: "var(--color-primary, #4f6ef7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                fontWeight: 800,
                flexShrink: 0,
                boxShadow: "0 4px 10px rgba(79, 110, 247, 0.12)",
                overflow: "hidden",
              }}
            >
              {!logoError ? (
                <img
                  src={companyWorkspaceApi.getMediaUrl(active.id, "logo", logoBust)}
                  alt={`Logo ${profile.data.name}`}
                  onError={() => setLogoError(true)}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                companyInitials
              )}
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "1.375rem", fontWeight: 700 }}>{profile.data.name}</h2>
                <Badge tone={profile.data.verificationStatus === "VERIFIED" ? "success" : "neutral"}>
                  {profile.data.verificationStatus === "VERIFIED" ? "Doanh nghiệp đã xác minh" : "Chưa xác minh"}
                </Badge>
              </div>
              <p style={{ margin: "6px 0 0", color: "var(--color-text-secondary, #64748b)", fontSize: "0.875rem" }}>
                {industryObj?.name || "Chưa cập nhật ngành nghề"} • {profile.data.employeeSizeRange || "Chưa xác định quy mô"} •{" "}
                {headquarters?.addressLine ? headquarters.addressLine : "Chưa cập nhật địa chỉ trụ sở"}
              </p>
            </div>
            <div>
              {!isEditingBrand && canUpdate ? (
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnPrimary}`}
                  onClick={() => {
                    setIsEditingBrand(true);
                    setErrors({});
                  }}
                >
                  Chỉnh sửa thông tin thương hiệu
                </button>
              ) : null}
            </div>
          </div>

          {/* TRUTHFUL BRAND IDENTITY & MEDIA CARD */}
          <Card title="Hình ảnh & Nhận diện thương hiệu">
            {mediaNotice && (
              <div
                className={`${ui.notice} ${mediaNotice.tone === "ok" ? ui.noticeOk : ui.noticeError}`}
                role="alert"
                style={{ marginBottom: 16 }}
              >
                {mediaNotice.text}
              </div>
            )}

            {/* Hidden file selectors */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={(e) => handleFileChange("logo", e)}
            />
            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={(e) => handleFileChange("cover", e)}
            />

            {/* COVER IMAGE HERO WRAPPER */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 180,
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: "var(--color-surface-soft, #f1f5f9)",
                border: "1px solid var(--color-border, #e2e8f0)",
                marginBottom: 44,
              }}
            >
              {!coverError ? (
                <img
                  src={companyWorkspaceApi.getMediaUrl(active.id, "cover", coverBust)}
                  alt={`Ảnh bìa ${profile.data.name}`}
                  onError={() => setCoverError(true)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                    color: "#94a3b8",
                    gap: 6,
                  }}
                >
                  <ImageIcon size={28} />
                  <span style={{ fontSize: "0.8125rem", color: "#cbd5e1" }}>
                    Chưa thiết lập ảnh bìa doanh nghiệp (sử dụng nền mặc định)
                  </span>
                </div>
              )}

              {/* Cover Action Buttons Overlay */}
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  display: "flex",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  className={ui.btn}
                  style={{
                    background: "rgba(255, 255, 255, 0.92)",
                    backdropFilter: "blur(4px)",
                    fontSize: "0.8125rem",
                    padding: "6px 12px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                  }}
                  disabled={!canUpdate || !writes || uploadingKind !== null}
                  title={!writes ? "Cổng ghi đang khóa trong chế độ chỉ xem" : !canUpdate ? "Chỉ thành viên quản trị mới có quyền thay đổi ảnh bìa" : undefined}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <Camera size={14} style={{ marginRight: 6 }} />
                  {uploadingKind === "cover" ? "Đang tải ảnh bìa..." : !coverError ? "Đổi ảnh bìa" : "Tải ảnh bìa mới"}
                </button>
                {!coverError && (
                  <button
                    type="button"
                    className={ui.btn}
                    style={{
                      background: "rgba(255, 255, 255, 0.92)",
                      backdropFilter: "blur(4px)",
                      fontSize: "0.8125rem",
                      padding: "6px 10px",
                      color: "var(--color-danger, #ef4444)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                    }}
                    disabled={!canUpdate || !writes || uploadingKind !== null}
                    title={!writes ? "Cổng ghi đang khóa trong chế độ chỉ xem" : "Xóa ảnh bìa hiện tại"}
                    onClick={() => triggerDeleteMedia("cover")}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* OVERLAPPING LOGO BADGE */}
              <div
                style={{
                  position: "absolute",
                  bottom: -24,
                  left: 20,
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  border: "3px solid #ffffff",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!logoError ? (
                  <img
                    src={companyWorkspaceApi.getMediaUrl(active.id, "logo", logoBust)}
                    alt={`Logo ${profile.data.name}`}
                    onError={() => setLogoError(true)}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%)",
                      color: "var(--color-primary, #4f6ef7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "1.5rem",
                    }}
                  >
                    {companyInitials}
                  </div>
                )}
              </div>
            </div>

            {/* LOGO ACTIONS AND LABELS */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
                paddingBottom: 8,
              }}
            >
              <div style={{ marginLeft: 112, flex: 1, minWidth: 220 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}>
                    Logo thương hiệu tuyển dụng
                  </h3>
                  {!logoError ? (
                    <Badge tone="success">Đã tùy chỉnh</Badge>
                  ) : (
                    <Badge tone="neutral">Mặc định từ tên</Badge>
                  )}
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "0.8125rem", color: "var(--color-text-secondary, #64748b)" }}>
                  Logo vuông hoặc chữ nhật, PNG, JPEG hoặc WebP. Dung lượng tối đa 1MB, kích thước tối đa 2048x2048px.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnPrimary}`}
                  disabled={!canUpdate || !writes || uploadingKind !== null}
                  title={!writes ? "Cổng ghi đang khóa trong chế độ chỉ xem" : !canUpdate ? "Chỉ thành viên quản trị mới có quyền thay đổi logo" : undefined}
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload size={14} style={{ marginRight: 6 }} />
                  {uploadingKind === "logo" ? "Đang tải logo..." : !logoError ? "Đổi logo mới" : "Tải logo mới"}
                </button>
                {!logoError && (
                  <button
                    type="button"
                    className={ui.btn}
                    disabled={!canUpdate || !writes || uploadingKind !== null}
                    title={!writes ? "Cổng ghi đang khóa trong chế độ chỉ xem" : "Xóa logo tùy chỉnh"}
                    onClick={() => triggerDeleteMedia("logo")}
                  >
                    <Trash2 size={14} color="var(--color-danger, #ef4444)" />
                  </button>
                )}
              </div>
            </div>

            {/* INFORMATIVE NOTICE SECTION */}
            <div
              className={ui.notice}
              style={{
                fontSize: "0.85rem",
                background: "var(--color-surface-soft, #f8fafc)",
                margin: "16px 0 0",
              }}
            >
              <strong>Lưu ý về định dạng nhận diện thương hiệu:</strong> Dữ liệu logo và ảnh bìa được lưu trữ an toàn trên dịch vụ Media Storage của hệ thống và phân phối có bộ đệm công khai (5 phút). Kích thước ảnh bìa tối đa 2MB (4096px), logo tối đa 1MB (2048px). Khi chưa tải ảnh tùy chỉnh, hệ thống sử dụng huy hiệu nhận diện tự động từ tên doanh nghiệp.
            </div>
          </Card>

          {/* EDIT FORM OR READ-ONLY VIEW */}
          {isEditingBrand ? (
            <Card title="Chỉnh sửa thông tin thương hiệu tuyển dụng">
              <form onSubmit={handleSaveBrand} noValidate>
                <div className={ui.formGrid}>
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="b-name">
                      Tên thương hiệu doanh nghiệp *
                    </label>
                    <input
                      id="b-name"
                      className={ui.input}
                      value={formValues.name || ""}
                      onChange={(e) => {
                        setFormValues((v) => ({ ...v, name: e.target.value }));
                        if (errors.name) setErrors((err) => ({ ...err, name: undefined }));
                      }}
                      required
                      aria-invalid={Boolean(errors.name) || undefined}
                      aria-describedby={errors.name ? "b-name-err" : "b-name-hint"}
                    />
                    {errors.name ? (
                      <span id="b-name-err" className={ui.fieldError} role="alert">
                        {errors.name}
                      </span>
                    ) : (
                      <span id="b-name-hint" className={ui.hint}>
                        Tên hiển thị công khai tới tất cả ứng viên và trên các tin tuyển dụng.
                      </span>
                    )}
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="b-industry">
                      Lĩnh vực hoạt động
                    </label>
                    <select
                      id="b-industry"
                      className={ui.select}
                      value={formValues.industryId || ""}
                      onChange={(e) => setFormValues((v) => ({ ...v, industryId: e.target.value }))}
                    >
                      <option value="">Chọn lĩnh vực kinh doanh</option>
                      {(categories.data ?? []).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="b-size">
                      Quy mô nhân sự
                    </label>
                    <select
                      id="b-size"
                      className={ui.select}
                      value={formValues.employeeSizeRange || ""}
                      onChange={(e) => setFormValues((v) => ({ ...v, employeeSizeRange: e.target.value }))}
                    >
                      <option value="">Chọn quy mô nhân sự</option>
                      {EMPLOYEE_SIZE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="b-year">
                      Năm thành lập
                    </label>
                    <input
                      id="b-year"
                      type="number"
                      className={ui.input}
                      placeholder="Ví dụ: 2018"
                      min={1800}
                      max={new Date().getFullYear()}
                      value={formValues.foundedYear ?? ""}
                      onChange={(e) => {
                        setFormValues((v) => ({
                          ...v,
                          foundedYear: e.target.value ? Number(e.target.value) : undefined,
                        }));
                        if (errors.foundedYear) setErrors((err) => ({ ...err, foundedYear: undefined }));
                      }}
                      aria-invalid={Boolean(errors.foundedYear) || undefined}
                      aria-describedby={errors.foundedYear ? "b-year-err" : undefined}
                    />
                    {errors.foundedYear && (
                      <span id="b-year-err" className={ui.fieldError} role="alert">
                        {errors.foundedYear}
                      </span>
                    )}
                  </div>

                  <div className={ui.field} style={{ gridColumn: "1 / -1" }}>
                    <label className={ui.label} htmlFor="b-website">
                      Địa chỉ Website chính thức (URL)
                    </label>
                    <input
                      id="b-website"
                      type="url"
                      className={ui.input}
                      placeholder="https://company.com"
                      value={formValues.website || ""}
                      onChange={(e) => {
                        setFormValues((v) => ({ ...v, website: e.target.value }));
                        if (errors.website) setErrors((err) => ({ ...err, website: undefined }));
                      }}
                      aria-invalid={Boolean(errors.website) || undefined}
                      aria-describedby={errors.website ? "b-website-err" : "b-website-hint"}
                    />
                    {errors.website ? (
                      <span id="b-website-err" className={ui.fieldError} role="alert">
                        {errors.website}
                      </span>
                    ) : (
                      <span id="b-website-hint" className={ui.hint}>
                        Bắt đầu bằng http:// hoặc https:// (ví dụ: https://findwork.vn)
                      </span>
                    )}
                  </div>
                </div>

                <div className={ui.field} style={{ marginTop: 16 }}>
                  <label className={ui.label} htmlFor="b-desc">
                    Mô tả tổng quan về doanh nghiệp & Văn hóa làm việc
                  </label>
                  <textarea
                    id="b-desc"
                    className={ui.textarea}
                    rows={6}
                    placeholder="Giới thiệu sứ mệnh, các sản phẩm chính, môi trường văn hóa làm việc và cơ hội thăng tiến..."
                    value={formValues.description || ""}
                    onChange={(e) => {
                      setFormValues((v) => ({ ...v, description: e.target.value }));
                      if (errors.description) setErrors((err) => ({ ...err, description: undefined }));
                    }}
                    aria-invalid={Boolean(errors.description) || undefined}
                    aria-describedby={errors.description ? "b-desc-err" : "b-desc-hint"}
                  />
                  {errors.description ? (
                    <span id="b-desc-err" className={ui.fieldError} role="alert">
                      {errors.description}
                    </span>
                  ) : (
                    <span id="b-desc-hint" className={ui.hint}>
                      Được hiển thị tại phần Giới thiệu công ty trên trang tuyển dụng công khai.
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button
                    type="submit"
                    className={`${ui.btn} ${ui.btnPrimary}`}
                    disabled={saving || !writes}
                    aria-disabled={!writes}
                    title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi thương hiệu"}
                  </button>
                  <button
                    type="button"
                    className={ui.btn}
                    onClick={() => {
                      setIsEditingBrand(false);
                      setMessage(null);
                      setErrors({});
                    }}
                  >
                    Hủy bỏ
                  </button>
                </div>
              </form>
            </Card>
          ) : (
            <>
              {/* BRAND OVERVIEW GRID */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                <Card title="Thông tin cơ bản">
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <span className={ui.hint}>Ngành nghề chính:</span>
                      <div style={{ fontWeight: 600 }}>{industryObj?.name || "Chưa cập nhật"}</div>
                    </div>
                    <div>
                      <span className={ui.hint}>Quy mô nhân viên:</span>
                      <div style={{ fontWeight: 600 }}>{profile.data.employeeSizeRange || "Chưa xác định"}</div>
                    </div>
                    <div>
                      <span className={ui.hint}>Năm thành lập:</span>
                      <div style={{ fontWeight: 600 }}>{profile.data.foundedYear || "Chưa cập nhật"}</div>
                    </div>
                    <div>
                      <span className={ui.hint}>Website:</span>
                      <div>
                        {profile.data.website ? (
                          <a
                            href={profile.data.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={ui.link}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            <span>{profile.data.website}</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          "Chưa cập nhật"
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Địa điểm & Trụ sở làm việc">
                  <p style={{ margin: "0 0 10px", color: "var(--color-text-secondary, #64748b)", fontSize: "0.875rem" }}>
                    Hiện có <strong>{locations.data?.length ?? 0}</strong> địa điểm được cấu hình trong hệ thống.
                  </p>
                  {headquarters ? (
                    <div style={{ background: "var(--color-surface-soft, #f8fafc)", padding: 12, borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: "0.875rem", marginBottom: 4 }}>
                        <MapPin size={15} color="var(--color-primary, #4f6ef7)" />
                        <span>Trụ sở chính:</span>
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "var(--color-text-primary, #1e293b)" }}>
                        {headquarters.addressLine || "Chưa có địa chỉ chi tiết"}
                      </div>
                    </div>
                  ) : null}
                  <Link className={ui.link} to="/employer/locations">
                    Quản lý danh sách địa điểm →
                  </Link>
                </Card>

                <Card title="Tin tuyển dụng công khai">
                  <p style={{ margin: "0 0 10px", color: "var(--color-text-secondary, #64748b)", fontSize: "0.875rem" }}>
                    Đang có <strong>{publishedJobs.length}</strong> tin đang tuyển công khai trên hệ thống.
                  </p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                    <Link className={ui.link} to="/employer/jobs">
                      Xem danh sách tin →
                    </Link>
                    <Link className={ui.link} to={`/companies/${active.id}`} target="_blank" rel="noopener noreferrer">
                      Xem trang công khai ↗
                    </Link>
                  </div>
                </Card>
              </div>

              {/* INTRO & CULTURE CARD */}
              <Card title="Giới thiệu doanh nghiệp & Văn hóa làm việc">
                <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--color-text-primary, #1e293b)", lineHeight: 1.7 }}>
                  {profile.data.description || "Doanh nghiệp chưa bổ sung mô tả giới thiệu tổng quan."}
                </p>
              </Card>
            </>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 2: PRIVATE LEGAL PROFILE & VERIFICATION                               */
        /* ========================================================================= */
        <div style={{ display: "grid", gap: 20 }}>
          {/* LEGAL VERIFICATION STATUS HERO */}
          <div
            style={{
              background: "var(--color-surface, #ffffff)",
              border: "1px solid var(--color-border, #e2e8f0)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <ShieldCheck size={24} color={profile.data.verificationStatus === "VERIFIED" ? "var(--color-success, #22c55e)" : "var(--color-warning, #f59e0b)"} />
                  <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Tình trạng xác minh pháp lý</h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
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
                      ? "Doanh nghiệp đã xác minh (Verified)"
                      : profile.data.verificationStatus === "REJECTED"
                      ? "Yêu cầu bị từ chối"
                      : profile.data.verificationStatus === "PENDING"
                      ? "Đang chờ quản trị viên xét duyệt"
                      : "Chưa nộp yêu cầu xác minh"}
                  </Badge>
                </div>
                <p style={{ margin: 0, color: "var(--color-text-secondary, #64748b)", fontSize: "0.875rem", maxWidth: 640, lineHeight: 1.6 }}>
                  Doanh nghiệp được xác minh sẽ hiển thị huy hiệu uy tín trên toàn bộ tin tuyển dụng, giúp tăng tỉ lệ ứng tuyển chất lượng từ ứng viên.
                </p>
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
                      ? "Bạn cần hoàn tất Tên pháp lý và Mã số thuế trước khi gửi yêu cầu"
                      : undefined
                  }
                  onClick={handleRequestVerification}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <ShieldCheck size={16} />
                  <span>{requestingVerify ? "Đang gửi yêu cầu..." : "Gửi yêu cầu xác minh"}</span>
                </button>
              )}
            </div>

            {!profile.data.legalName || !profile.data.taxCode ? (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 8,
                  background: "var(--color-warning-soft, #fef3c7)",
                  color: "#92400e",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Yêu cầu cần thiết:</strong> Vui lòng cập nhật đầy đủ <strong>Tên pháp lý</strong> và <strong>Mã số thuế</strong> trong biểu mẫu bên dưới để kích hoạt nút gửi yêu cầu xác minh.
                </span>
              </div>
            ) : null}
          </div>

          {/* PRIVACY NOTICE */}
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: "var(--color-surface-soft, #f1f5f9)",
              border: "1px solid var(--color-border, #e2e8f0)",
              fontSize: "0.85rem",
              color: "var(--color-text-secondary, #475569)",
              lineHeight: 1.6,
            }}
          >
            🔒 <strong>Bảo mật hồ sơ pháp lý:</strong> Thông tin Tên pháp lý đầy đủ và Mã số thuế chỉ được sử dụng cho công tác kiểm tra, đối soát giấy phép kinh doanh nội bộ của Ban quản trị FINDWORK. Các thông tin này hoàn toàn không được công khai trên giao diện người dùng công cộng hoặc với ứng viên.
          </div>

          {/* LEGAL INFO EDIT OR DETAILS */}
          {isEditingLegal ? (
            <Card title="Cập nhật thông tin pháp lý doanh nghiệp">
              <form onSubmit={handleSaveLegal} noValidate>
                <div className={ui.formGrid}>
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="l-legalName">
                      Tên pháp lý đầy đủ của doanh nghiệp *
                    </label>
                    <input
                      id="l-legalName"
                      className={ui.input}
                      placeholder="Ví dụ: CÔNG TY CỔ PHẦN CÔNG NGHỆ FINDWORK VIỆT NAM"
                      value={formValues.legalName || ""}
                      onChange={(e) => {
                        setFormValues((v) => ({ ...v, legalName: e.target.value }));
                        if (errors.legalName) setErrors((err) => ({ ...err, legalName: undefined }));
                      }}
                      required
                      aria-invalid={Boolean(errors.legalName) || undefined}
                      aria-describedby={errors.legalName ? "l-legalName-err" : "l-legalName-hint"}
                    />
                    {errors.legalName ? (
                      <span id="l-legalName-err" className={ui.fieldError} role="alert">
                        {errors.legalName}
                      </span>
                    ) : (
                      <span id="l-legalName-hint" className={ui.hint}>
                        Tên chính xác như trên Giấy chứng nhận đăng ký doanh nghiệp (GPKD).
                      </span>
                    )}
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="l-taxCode">
                      Mã số thuế doanh nghiệp (Tax Code) *
                    </label>
                    <input
                      id="l-taxCode"
                      className={ui.input}
                      placeholder="Ví dụ: 0101234567 hoặc 0312345678-001"
                      value={formValues.taxCode || ""}
                      onChange={(e) => {
                        setFormValues((v) => ({ ...v, taxCode: e.target.value }));
                        if (errors.taxCode) setErrors((err) => ({ ...err, taxCode: undefined }));
                      }}
                      required
                      aria-invalid={Boolean(errors.taxCode) || undefined}
                      aria-describedby={errors.taxCode ? "l-taxCode-err" : "l-taxCode-hint"}
                    />
                    {errors.taxCode ? (
                      <span id="l-taxCode-err" className={ui.fieldError} role="alert">
                        {errors.taxCode}
                      </span>
                    ) : (
                      <span id="l-taxCode-hint" className={ui.hint}>
                        Mã số thuế 10 hoặc 13 số do Tổng cục Thuế cấp.
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button
                    type="submit"
                    className={`${ui.btn} ${ui.btnPrimary}`}
                    disabled={saving || !writes}
                    aria-disabled={!writes}
                    title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                  >
                    {saving ? "Đang lưu..." : "Lưu thông tin pháp lý"}
                  </button>
                  <button
                    type="button"
                    className={ui.btn}
                    onClick={() => {
                      setIsEditingLegal(false);
                      setMessage(null);
                      setErrors({});
                    }}
                  >
                    Hủy bỏ
                  </button>
                </div>
              </form>
            </Card>
          ) : (
            <Card title="Hồ sơ pháp lý đăng ký kinh doanh">
              <div style={{ display: "grid", gap: 16 }}>
                <div className={ui.formGrid}>
                  <div className={ui.field}>
                    <span className={ui.label}>Tên pháp lý đầy đủ (Legal Name)</span>
                    <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center", fontWeight: 600 }}>
                      {profile.data.legalName || "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className={ui.field}>
                    <span className={ui.label}>Mã số thuế (Tax ID)</span>
                    <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center", fontWeight: 600 }}>
                      {profile.data.taxCode || "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className={ui.field} style={{ gridColumn: "1 / -1" }}>
                    <span className={ui.label}>Địa chỉ trụ sở chính đăng ký</span>
                    <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                      {headquarters?.addressLine || "Chưa thiết lập địa chỉ trụ sở chính (thiết lập tại mục Quản lý địa điểm)"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  {canUpdate && (
                    <button
                      type="button"
                      className={`${ui.btn} ${ui.btnPrimary}`}
                      onClick={() => {
                        setIsEditingLegal(true);
                        setErrors({});
                      }}
                    >
                      Chỉnh sửa thông tin pháp lý
                    </button>
                  )}
                  <Link className={ui.btn} to="/employer/locations">
                    Quản lý trụ sở & địa chỉ →
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        tone={confirmDialog.tone}
        loading={dialogLoading}
        onConfirm={confirmDialog.action}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

export default EmployerProfilePage;
