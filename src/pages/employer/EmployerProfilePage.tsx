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
  FileCheck2,
  FileText,
  UserCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, ConfirmationModal, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import {
  companyWorkspaceApi,
  type UpdateCompanyProfileInput,
  type UpdateCompanyLegalInput,
} from "@/services/api/companyWorkspaceApi";
import { publicApi } from "@/services/api/publicApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { canUpdateCompany } from "@/features/company/companyWorkspacePermissions";
import { WritesDisabledNotice } from "./EmployerDashboardPage";
import { useAuthStore } from "@/store/authStore";

const EMPLOYEE_SIZE_OPTIONS = [
  "1-10 nhân viên",
  "11-50 nhân viên",
  "51-200 nhân viên",
  "201-500 nhân viên",
  "501-1000 nhân viên",
  "1000+ nhân viên",
];

const EVIDENCE_KIND_LABELS: Record<string, string> = {
  BUSINESS_REGISTRATION: "Giấy phép đăng ký kinh doanh (GPKD / ERC)",
  TAX_CERTIFICATE: "Giấy chứng nhận đăng ký thuế",
  REPRESENTATIVE_AUTHORIZATION: "Văn bản ủy quyền người đại diện pháp luật",
};

interface FormErrors {
  name?: string;
  website?: string;
  foundedYear?: string;
  description?: string;
  legalName?: string;
  taxCode?: string;
  registeredAddress?: string;
  representativeName?: string;
  contactEmail?: string;
  contactPhone?: string;
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
    img.src = objectUrl;
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
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.role?.toUpperCase() === "ADMIN";

  const [params, setParams] = useSearchParams();
  const currentTab = params.get("tab") === "legal" ? "legal" : "brand";

  const profile = useAsyncData((s) => companyWorkspaceApi.getProfile(active.id, s), [active.id]);
  const legalData = useAsyncData((s) => companyWorkspaceApi.getLegalData(active.id, s), [active.id]);
  const categories = useAsyncData((s) => publicApi.listJobCategories(s), []);
  const locations = useAsyncData((s) => companyWorkspaceApi.listLocations(active.id, s), [active.id]);
  const jobs = useAsyncData((s) => companyWorkspaceApi.listJobs(active.id, { pageSize: 50 }, s), [active.id]);

  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [isEditingLegal, setIsEditingLegal] = useState(false);
  const [formValues, setFormValues] = useState<UpdateCompanyProfileInput>({});
  const [legalFormValues, setLegalFormValues] = useState<UpdateCompanyLegalInput>({
    registeredAddress: "",
    representativeName: "",
    representativeTitle: "",
    contactEmail: "",
    contactPhone: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [requestingVerify, setRequestingVerify] = useState(false);
  const [adminReviewing, setAdminReviewing] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const [selectedEvidenceKind, setSelectedEvidenceKind] = useState<
    "BUSINESS_REGISTRATION" | "TAX_CERTIFICATE" | "REPRESENTATIVE_AUTHORIZATION"
  >("BUSINESS_REGISTRATION");
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const [logoBust, setLogoBust] = useState<number>(Date.now());
  const [coverBust, setCoverBust] = useState<number>(Date.now());
  const [hasCustomLogo, setHasCustomLogo] = useState<boolean>(false);
  const [hasCustomCover, setHasCustomCover] = useState<boolean>(false);
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

  const writes = isWorkspaceWritesEnabled();
  const canUpdate = canUpdateCompany(active.memberRoleNames);

  // Initialize media flags from profile
  useEffect(() => {
    if (profile.data) {
      setHasCustomLogo(Boolean(profile.data.logoAssetKey));
      setHasCustomCover(Boolean(profile.data.coverAssetKey));
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

  // Initialize legal values from legalData
  useEffect(() => {
    if (legalData.data?.legalProfile) {
      setLegalFormValues({
        registeredAddress: legalData.data.legalProfile.registeredAddress || "",
        representativeName: legalData.data.legalProfile.representativeName || "",
        representativeTitle: legalData.data.legalProfile.representativeTitle || "",
        contactEmail: legalData.data.legalProfile.contactEmail || "",
        contactPhone: legalData.data.legalProfile.contactPhone || "",
      });
    }
  }, [legalData.data]);

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
    const lName = formValues.legalName?.trim() || "";
    if (!lName) {
      errs.legalName = "Vui lòng nhập Tên pháp lý đầy đủ của doanh nghiệp.";
    } else if (lName.length < 2) {
      errs.legalName = "Tên pháp lý phải có ít nhất 2 ký tự.";
    } else if (lName.length > 220) {
      errs.legalName = "Tên pháp lý không được vượt quá 220 ký tự.";
    }

    const tCode = formValues.taxCode?.trim() || "";
    if (!tCode) {
      errs.taxCode = "Vui lòng nhập Mã số thuế doanh nghiệp.";
    } else if (!/^\d{10}(?:-?\d{3})?$/.test(tCode)) {
      errs.taxCode = "Mã số thuế không đúng định dạng chuẩn (10 chữ số hoặc 13 chữ số có dấu gạch ngang, ví dụ: 0101234567 hoặc 0312345678-001).";
    }

    const rAddr = legalFormValues.registeredAddress?.trim() || "";
    if (!rAddr) {
      errs.registeredAddress = "Vui lòng nhập địa chỉ trụ sở chính theo ĐKKD.";
    } else if (rAddr.length < 8) {
      errs.registeredAddress = "Địa chỉ trụ sở chính phải có ít nhất 8 ký tự.";
    } else if (rAddr.length > 500) {
      errs.registeredAddress = "Địa chỉ trụ sở chính không được vượt quá 500 ký tự.";
    }

    const repName = legalFormValues.representativeName?.trim() || "";
    if (!repName) {
      errs.representativeName = "Vui lòng nhập tên người đại diện pháp luật.";
    } else if (repName.length < 2) {
      errs.representativeName = "Tên người đại diện phải có ít nhất 2 ký tự.";
    }

    const email = legalFormValues.contactEmail?.trim() || "";
    if (!email) {
      errs.contactEmail = "Vui lòng nhập email liên hệ pháp lý.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.contactEmail = "Email liên hệ không hợp lệ.";
    }

    const phone = legalFormValues.contactPhone?.trim() || "";
    if (!phone) {
      errs.contactPhone = "Vui lòng nhập số điện thoại liên hệ.";
    } else if (!/^\+?[0-9][0-9 .()-]{6,30}$/.test(phone)) {
      errs.contactPhone = "Số điện thoại không đúng định dạng.";
    }

    return errs;
  };

  const handleSaveBrand = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const formErrs = validateBrandForm();
    setErrors(formErrs);
    if (Object.keys(formErrs).length > 0) return;

    setSaving(true);
    try {
      const payload: UpdateCompanyProfileInput = {
        name: formValues.name?.trim(),
        website: formValues.website?.trim() || null,
        description: formValues.description?.trim() || null,
        industryId: formValues.industryId || null,
        employeeSizeRange: formValues.employeeSizeRange || null,
        foundedYear: formValues.foundedYear ? Number(formValues.foundedYear) : null,
      };
      await companyWorkspaceApi.updateProfile(active.id, payload);
      setMessage({ tone: "ok", text: "Cập nhật thông tin thương hiệu tuyển dụng thành công." });
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
    const formErrs = validateLegalForm();
    setErrors(formErrs);
    if (Object.keys(formErrs).length > 0) return;

    setSaving(true);
    try {
      // 1. Update company basic legal fields (legalName, taxCode)
      await companyWorkspaceApi.updateProfile(active.id, {
        legalName: formValues.legalName?.trim() || null,
        taxCode: formValues.taxCode?.trim() || null,
      });

      // 2. Update company dedicated legal profile
      await companyWorkspaceApi.updateLegalProfile(active.id, {
        registeredAddress: legalFormValues.registeredAddress.trim(),
        representativeName: legalFormValues.representativeName.trim(),
        representativeTitle: legalFormValues.representativeTitle?.trim() || null,
        contactEmail: legalFormValues.contactEmail.trim(),
        contactPhone: legalFormValues.contactPhone.trim(),
      });

      setMessage({ tone: "ok", text: "Đã lưu và cập nhật đầy đủ hồ sơ pháp lý doanh nghiệp thành công." });
      setIsEditingLegal(false);
      profile.reload();
      legalData.reload();
      reloadWorkspace();
    } catch (err) {
      setMessage({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setSaving(false);
    }
  };

  const handleEvidenceUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ tone: "error", text: "Dung lượng tệp chứng từ vượt quá giới hạn 10MB." });
      return;
    }

    setUploadingEvidence(true);
    setMessage(null);
    try {
      await companyWorkspaceApi.uploadLegalEvidence(active.id, selectedEvidenceKind, file);
      setMessage({ tone: "ok", text: "Tải lên tài liệu chứng từ pháp lý thành công." });
      legalData.reload();
    } catch (err) {
      setMessage({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setUploadingEvidence(false);
    }
  };

  const triggerDeleteEvidence = (evidenceId: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận xóa tài liệu pháp lý",
      description: `Bạn có chắc chắn muốn xóa tài liệu chứng từ "${name}"? Thao tác này không thể hoàn tác.`,
      confirmLabel: "Xóa tài liệu",
      tone: "danger",
      action: async () => {
        setDialogLoading(true);
        try {
          await companyWorkspaceApi.deleteLegalEvidence(active.id, evidenceId);
          setMessage({ tone: "ok", text: "Đã xóa tài liệu chứng từ pháp lý thành công." });
          legalData.reload();
        } catch (err) {
          setMessage({ tone: "error", text: toApiFailure(err).message });
        } finally {
          setDialogLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

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
            setHasCustomLogo(false);
            setLogoBust(Date.now());
          } else {
            setHasCustomCover(false);
            setCoverBust(Date.now());
          }
          setMediaNotice({
            tone: "ok",
            text: isLogo ? "Đã xóa logo thành công." : "Đã xóa ảnh bìa thành công.",
          });
          profile.reload();
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
      const mediaUrl = companyWorkspaceApi.getMediaUrl(active.id, kind, now);

      // Verify actual bytes can be fetched cleanly
      try {
        await fetch(mediaUrl, { cache: "no-store" });
      } catch {
        // Fallback gracefully
      }

      if (kind === "logo") {
        setHasCustomLogo(true);
        setLogoBust(now);
      } else {
        setHasCustomCover(true);
        setCoverBust(now);
      }
      setMediaNotice({
        tone: "ok",
        text: kind === "logo" ? "Tải lên logo doanh nghiệp thành công." : "Tải lên ảnh bìa doanh nghiệp thành công.",
      });
      profile.reload();
    } catch (err) {
      setMediaNotice({
        tone: "error",
        text: mapMediaError(err),
      });
    } finally {
      setUploadingKind(null);
    }
  };

  // Legal verification criteria verification
  const evidenceList = legalData.data?.legalEvidence || [];
  const hasBusinessRegDoc = evidenceList.some((e) => e.kind === "BUSINESS_REGISTRATION");
  const hasLegalName = Boolean(profile.data?.legalName?.trim());
  const hasTaxCode = Boolean(profile.data?.taxCode && /^\d{10}(?:-?\d{3})?$/.test(profile.data.taxCode.trim()));
  const hasLegalProfileFilled = Boolean(legalData.data?.legalProfile?.registeredAddress && legalData.data?.legalProfile?.representativeName);

  const canRequestVerification =
    hasLegalName &&
    hasTaxCode &&
    hasLegalProfileFilled &&
    hasBusinessRegDoc;

  const handleRequestVerification = async () => {
    if (!canRequestVerification) return;
    setRequestingVerify(true);
    setMessage(null);
    try {
      await companyWorkspaceApi.requestVerification(active.id);
      setMessage({
        tone: "ok",
        text: "Hồ sơ pháp lý đã được nộp thành công! Ban quản trị FINDWORK sẽ kiểm tra đối soát trong 1-2 ngày làm việc.",
      });
      profile.reload();
      legalData.reload();
      reloadWorkspace();
    } catch (err) {
      setMessage({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setRequestingVerify(false);
    }
  };

  const handleAdminVerify = async (status: "VERIFIED" | "REJECTED") => {
    setAdminReviewing(true);
    setMessage(null);
    try {
      await companyWorkspaceApi.adminSetCompanyVerification(active.id, status);
      setMessage({
        tone: "ok",
        text: status === "VERIFIED" ? "Đã phê duyệt xác minh doanh nghiệp thành công." : "Đã từ chối yêu cầu xác minh doanh nghiệp.",
      });
      profile.reload();
      legalData.reload();
      reloadWorkspace();
    } catch (err) {
      setMessage({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setAdminReviewing(false);
    }
  };

  const industryObj = categories.data?.find((c) => c.id === profile.data?.industryId);
  const headquarters = locations.data?.find((l) => l.isHeadquarters);
  const publishedJobs = (jobs.data?.data ?? []).filter((j) => j.status === "PUBLISHED");
  const companyInitials = (profile.data?.name || active.name || "DN")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isLegalLocked = profile.data?.verificationStatus === "PENDING" || profile.data?.verificationStatus === "VERIFIED";

  return (
    <>
      <PageHeader
        title="Hồ sơ doanh nghiệp"
        subtitle="Quản lý toàn diện thương hiệu tuyển dụng công khai và hồ sơ pháp lý xác minh doanh nghiệp."
        actions={
          <Link
            className={`${ui.btn}`}
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
          className={`${ui.notice} ${message.tone === "error" ? ui.noticeWarn : ui.noticeOk}`}
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
          <Badge tone={active.verificationStatus === "VERIFIED" ? "success" : active.verificationStatus === "PENDING" ? "warning" : "neutral"} style={{ fontSize: "0.75rem" }}>
            {active.verificationStatus === "VERIFIED" ? "Đã duyệt" : active.verificationStatus === "PENDING" ? "Chờ duyệt" : "Chưa duyệt"}
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
                background: hasCustomLogo ? "#ffffff" : "linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%)",
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
              {hasCustomLogo ? (
                <img
                  src={companyWorkspaceApi.getMediaUrl(active.id, "logo", logoBust)}
                  alt={`Logo ${profile.data.name}`}
                  onError={() => setHasCustomLogo(false)}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                companyInitials
              )}
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "1.375rem", fontWeight: 700 }}>{profile.data.name}</h2>
                <Badge tone={profile.data.verificationStatus === "VERIFIED" ? "success" : profile.data.verificationStatus === "PENDING" ? "warning" : "neutral"}>
                  {profile.data.verificationStatus === "VERIFIED" ? "Doanh nghiệp đã xác minh" : profile.data.verificationStatus === "PENDING" ? "Đang chờ duyệt" : "Chưa xác minh"}
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
              {hasCustomCover ? (
                <img
                  src={companyWorkspaceApi.getMediaUrl(active.id, "cover", coverBust)}
                  alt={`Ảnh bìa ${profile.data.name}`}
                  onError={() => setHasCustomCover(false)}
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
                  {uploadingKind === "cover" ? "Đang tải ảnh bìa..." : hasCustomCover ? "Đổi ảnh bìa" : "Tải ảnh bìa mới"}
                </button>
                {hasCustomCover && (
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
                {hasCustomLogo ? (
                  <img
                    src={companyWorkspaceApi.getMediaUrl(active.id, "logo", logoBust)}
                    alt={`Logo ${profile.data.name}`}
                    onError={() => setHasCustomLogo(false)}
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
                  {hasCustomLogo ? (
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
                  {uploadingKind === "logo" ? "Đang tải logo..." : hasCustomLogo ? "Đổi logo mới" : "Tải logo mới"}
                </button>
                {hasCustomLogo && (
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
              <strong>Lưu ý về định dạng nhận diện thương hiệu:</strong> Dữ liệu logo và ảnh bìa được lưu trữ an toàn trên dịch vụ Media Storage của hệ thống với tiêu đề phản hồi Cache-Control: no-store (cập nhật tức thì sau khi tải lên, không sử dụng bộ đệm công khai trung gian). Kích thước ảnh bìa tối đa 2MB (4096px), logo tối đa 1MB (2048px). Khi chưa tải ảnh tùy chỉnh, hệ thống sử dụng huy hiệu nhận diện tự động từ tên doanh nghiệp.
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
                      aria-describedby={errors.name ? "b-name-err" : undefined}
                    />
                    {errors.name && (
                      <span id="b-name-err" className={ui.fieldError} role="alert">
                        {errors.name}
                      </span>
                    )}
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="b-industry">
                      Ngành nghề chính
                    </label>
                    <select
                      id="b-industry"
                      className={ui.input}
                      value={formValues.industryId || ""}
                      onChange={(e) => setFormValues((v) => ({ ...v, industryId: e.target.value }))}
                    >
                      <option value="">-- Chọn ngành nghề --</option>
                      {(categories.data ?? []).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="b-size">
                      Quy mô nhân viên
                    </label>
                    <select
                      id="b-size"
                      className={ui.input}
                      value={formValues.employeeSizeRange || ""}
                      onChange={(e) => setFormValues((v) => ({ ...v, employeeSizeRange: e.target.value }))}
                    >
                      <option value="">-- Chọn quy mô nhân viên --</option>
                      {EMPLOYEE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="b-founded">
                      Năm thành lập
                    </label>
                    <input
                      id="b-founded"
                      className={ui.input}
                      type="number"
                      min={1800}
                      max={new Date().getFullYear()}
                      placeholder="Ví dụ: 2018"
                      value={formValues.foundedYear ?? ""}
                      onChange={(e) => {
                        setFormValues((v) => ({ ...v, foundedYear: e.target.value ? Number(e.target.value) : undefined }));
                        if (errors.foundedYear) setErrors((err) => ({ ...err, foundedYear: undefined }));
                      }}
                      aria-invalid={Boolean(errors.foundedYear) || undefined}
                      aria-describedby={errors.foundedYear ? "b-founded-err" : undefined}
                    />
                    {errors.foundedYear && (
                      <span id="b-founded-err" className={ui.fieldError} role="alert">
                        {errors.foundedYear}
                      </span>
                    )}
                  </div>

                  <div className={ui.field} style={{ gridColumn: "1 / -1" }}>
                    <label className={ui.label} htmlFor="b-website">
                      Địa chỉ Website chính thức
                    </label>
                    <input
                      id="b-website"
                      className={ui.input}
                      type="url"
                      placeholder="https://example.com"
                      value={formValues.website || ""}
                      onChange={(e) => {
                        setFormValues((v) => ({ ...v, website: e.target.value }));
                        if (errors.website) setErrors((err) => ({ ...err, website: undefined }));
                      }}
                      aria-invalid={Boolean(errors.website) || undefined}
                      aria-describedby={errors.website ? "b-website-err" : undefined}
                    />
                    {errors.website && (
                      <span id="b-website-err" className={ui.fieldError} role="alert">
                        {errors.website}
                      </span>
                    )}
                  </div>

                  <div className={ui.field} style={{ gridColumn: "1 / -1" }}>
                    <label className={ui.label} htmlFor="b-desc">
                      Giới thiệu tổng quan & Văn hóa làm việc
                    </label>
                    <textarea
                      id="b-desc"
                      className={ui.textarea}
                      rows={5}
                      placeholder="Mô tả về doanh nghiệp, sứ mệnh, giá trị cốt lõi và môi trường làm việc..."
                      value={formValues.description || ""}
                      onChange={(e) => {
                        setFormValues((v) => ({ ...v, description: e.target.value }));
                        if (errors.description) setErrors((err) => ({ ...err, description: undefined }));
                      }}
                      aria-invalid={Boolean(errors.description) || undefined}
                      aria-describedby={errors.description ? "b-desc-err" : undefined}
                    />
                    {errors.description && (
                      <span id="b-desc-err" className={ui.fieldError} role="alert">
                        {errors.description}
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
                  <ShieldCheck size={24} color={profile.data.verificationStatus === "VERIFIED" ? "var(--color-success, #22c55e)" : profile.data.verificationStatus === "PENDING" ? "var(--color-warning, #f59e0b)" : "var(--color-text-secondary, #64748b)"} />
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
                      ? "Bạn cần hoàn tất Tên pháp lý, Mã số thuế, Thông tin người đại diện và Tải lên giấy phép kinh doanh trước khi gửi yêu cầu"
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

            {/* Verification checklist notice */}
            {!canRequestVerification && profile.data.verificationStatus !== "VERIFIED" && profile.data.verificationStatus !== "PENDING" && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 8,
                  background: "var(--color-warning-soft, #fef3c7)",
                  color: "#92400e",
                  fontSize: "0.875rem",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <span>Điều kiện để kích hoạt nút gửi yêu cầu xác minh:</span>
                </div>
                <ul style={{ margin: "0 0 0 24px", padding: 0, lineHeight: 1.6 }}>
                  <li>{hasLegalName ? "✔ Tên pháp lý đã điền" : "✖ Chưa điền Tên pháp lý doanh nghiệp"}</li>
                  <li>{hasTaxCode ? "✔ Mã số thuế hợp lệ (10 hoặc 13 chữ số)" : "✖ Chưa điền Mã số thuế đúng chuẩn"}</li>
                  <li>{hasLegalProfileFilled ? "✔ Thông tin trụ sở và người đại diện đã điền" : "✖ Chưa điền địa chỉ trụ sở và người đại diện theo ĐKKD"}</li>
                  <li>{hasBusinessRegDoc ? "✔ Đã tải lên Giấy phép kinh doanh (GPKD)" : "✖ Chưa tải lên tệp Giấy phép đăng ký kinh doanh (GPKD / ERC)"}</li>
                </ul>
              </div>
            )}

            {/* AUTHORIZED ADMIN REVIEW PANEL */}
            {isAdmin && profile.data.verificationStatus === "PENDING" && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 8,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#1e40af", display: "flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={18} />
                    <span>Bảng điều khiển Quản trị viên (Authorized Admin Review)</span>
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#3b82f6", marginTop: 2 }}>
                    Tài khoản của bạn có quyền hệ thống phê duyệt hoặc từ chối yêu cầu xác minh doanh nghiệp này.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.btnPrimary}`}
                    disabled={adminReviewing || !writes}
                    onClick={() => handleAdminVerify("VERIFIED")}
                    style={{ background: "var(--color-success, #22c55e)", borderColor: "var(--color-success, #22c55e)" }}
                  >
                    <CheckCircle2 size={15} style={{ marginRight: 6 }} />
                    {adminReviewing ? "Đang xử lý..." : "Phê duyệt xác minh (Approve)"}
                  </button>
                  <button
                    type="button"
                    className={ui.btn}
                    disabled={adminReviewing || !writes}
                    onClick={() => handleAdminVerify("REJECTED")}
                    style={{ color: "var(--color-danger, #ef4444)" }}
                  >
                    <XCircle size={15} style={{ marginRight: 6 }} />
                    {adminReviewing ? "Đang xử lý..." : "Từ chối (Reject)"}
                  </button>
                </div>
              </div>
            )}
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

          {/* LEGAL EVIDENCE DOCUMENTS MANAGEMENT */}
          <Card title="Tài liệu & Chứng từ đăng ký doanh nghiệp">
            <p style={{ margin: "0 0 16px", color: "var(--color-text-secondary, #64748b)", fontSize: "0.875rem" }}>
              Tải lên các tài liệu pháp lý chính thức (Giấy chứng nhận ĐKKD, Giấy chứng nhận thuế, Ủy quyền người đại diện). Định dạng hỗ trợ: PDF, PNG, JPEG, WebP (Tối đa 10MB/tệp).
            </p>

            {/* Document Upload Area */}
            {!isLegalLocked && canUpdate && writes && (
              <div
                style={{
                  padding: 16,
                  border: "1px dashed var(--color-border, #cbd5e1)",
                  borderRadius: 10,
                  backgroundColor: "var(--color-surface-soft, #f8fafc)",
                  marginBottom: 20,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 260 }}>
                  <label className={ui.label} htmlFor="evidence-kind" style={{ marginBottom: 4 }}>
                    Loại chứng từ pháp lý tải lên *
                  </label>
                  <select
                    id="evidence-kind"
                    className={ui.input}
                    value={selectedEvidenceKind}
                    onChange={(e) => setSelectedEvidenceKind(e.target.value as any)}
                    disabled={uploadingEvidence}
                  >
                    <option value="BUSINESS_REGISTRATION">Giấy chứng nhận đăng ký doanh nghiệp (GPKD / ERC)</option>
                    <option value="TAX_CERTIFICATE">Giấy chứng nhận đăng ký thuế</option>
                    <option value="REPRESENTATIVE_AUTHORIZATION">Văn bản ủy quyền người đại diện pháp luật</option>
                  </select>
                </div>

                <div style={{ alignSelf: "flex-end" }}>
                  <input
                    ref={evidenceInputRef}
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    style={{ display: "none" }}
                    onChange={handleEvidenceUpload}
                  />
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.btnPrimary}`}
                    disabled={uploadingEvidence}
                    onClick={() => evidenceInputRef.current?.click()}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Upload size={15} />
                    <span>{uploadingEvidence ? "Đang tải tệp lên..." : "Chọn tệp chứng từ"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Evidence List */}
            {legalData.loading ? (
              <LoadingBlock rows={2} label="Đang tải chứng từ pháp lý" />
            ) : evidenceList.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "var(--color-text-secondary, #64748b)" }}>
                <FileText size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                <div>Chưa có tài liệu chứng từ nào được tải lên.</div>
              </div>
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <caption className={ui.srOnly}>Danh sách chứng từ pháp lý đã tải lên</caption>
                  <thead>
                    <tr>
                      <th scope="col">Tên tệp</th>
                      <th scope="col">Phân loại chứng từ</th>
                      <th scope="col">Dung lượng</th>
                      <th scope="col">Ngày tải lên</th>
                      <th scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidenceList.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                            <FileCheck2 size={16} color="var(--color-primary, #4f6ef7)" />
                            <span>{doc.originalName}</span>
                          </div>
                        </td>
                        <td>
                          <Badge tone={doc.kind === "BUSINESS_REGISTRATION" ? "success" : "neutral"}>
                            {EVIDENCE_KIND_LABELS[doc.kind] || doc.kind}
                          </Badge>
                        </td>
                        <td>{(doc.byteSize / 1024).toFixed(1)} KB</td>
                        <td>{new Date(doc.createdAt).toLocaleDateString("vi-VN")}</td>
                        <td>
                          {!isLegalLocked && canUpdate && writes ? (
                            <button
                              type="button"
                              className={ui.btn}
                              onClick={() => triggerDeleteEvidence(doc.id, doc.originalName)}
                              title="Xóa chứng từ này"
                              style={{ color: "var(--color-danger, #ef4444)" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <span className={ui.hint}>Đã khóa trong quá trình duyệt</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

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

                  <div className={ui.field} style={{ gridColumn: "1 / -1" }}>
                    <label className={ui.label} htmlFor="l-regAddress">
                      Địa chỉ trụ sở chính theo ĐKKD *
                    </label>
                    <input
                      id="l-regAddress"
                      className={ui.input}
                      placeholder="Ví dụ: Tầng 6, Tòa nhà ABC, 123 Đường Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
                      value={legalFormValues.registeredAddress || ""}
                      onChange={(e) => {
                        setLegalFormValues((v) => ({ ...v, registeredAddress: e.target.value }));
                        if (errors.registeredAddress) setErrors((err) => ({ ...err, registeredAddress: undefined }));
                      }}
                      required
                      aria-invalid={Boolean(errors.registeredAddress) || undefined}
                      aria-describedby={errors.registeredAddress ? "l-regAddress-err" : undefined}
                    />
                    {errors.registeredAddress && (
                      <span id="l-regAddress-err" className={ui.fieldError} role="alert">
                        {errors.registeredAddress}
                      </span>
                    )}
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="l-repName">
                      Người đại diện pháp luật *
                    </label>
                    <input
                      id="l-repName"
                      className={ui.input}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={legalFormValues.representativeName || ""}
                      onChange={(e) => {
                        setLegalFormValues((v) => ({ ...v, representativeName: e.target.value }));
                        if (errors.representativeName) setErrors((err) => ({ ...err, representativeName: undefined }));
                      }}
                      required
                      aria-invalid={Boolean(errors.representativeName) || undefined}
                      aria-describedby={errors.representativeName ? "l-repName-err" : undefined}
                    />
                    {errors.representativeName && (
                      <span id="l-repName-err" className={ui.fieldError} role="alert">
                        {errors.representativeName}
                      </span>
                    )}
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="l-repTitle">
                      Chức danh người đại diện
                    </label>
                    <input
                      id="l-repTitle"
                      className={ui.input}
                      placeholder="Ví dụ: Tổng Giám đốc / Giám đốc điều hành"
                      value={legalFormValues.representativeTitle || ""}
                      onChange={(e) => setLegalFormValues((v) => ({ ...v, representativeTitle: e.target.value }))}
                    />
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="l-contactEmail">
                      Email liên hệ đối soát pháp lý *
                    </label>
                    <input
                      id="l-contactEmail"
                      className={ui.input}
                      type="email"
                      placeholder="legal@company.com"
                      value={legalFormValues.contactEmail || ""}
                      onChange={(e) => {
                        setLegalFormValues((v) => ({ ...v, contactEmail: e.target.value }));
                        if (errors.contactEmail) setErrors((err) => ({ ...err, contactEmail: undefined }));
                      }}
                      required
                      aria-invalid={Boolean(errors.contactEmail) || undefined}
                      aria-describedby={errors.contactEmail ? "l-contactEmail-err" : undefined}
                    />
                    {errors.contactEmail && (
                      <span id="l-contactEmail-err" className={ui.fieldError} role="alert">
                        {errors.contactEmail}
                      </span>
                    )}
                  </div>

                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="l-contactPhone">
                      Số điện thoại liên hệ pháp lý *
                    </label>
                    <input
                      id="l-contactPhone"
                      className={ui.input}
                      type="tel"
                      placeholder="+84 28 1234 5678"
                      value={legalFormValues.contactPhone || ""}
                      onChange={(e) => {
                        setLegalFormValues((v) => ({ ...v, contactPhone: e.target.value }));
                        if (errors.contactPhone) setErrors((err) => ({ ...err, contactPhone: undefined }));
                      }}
                      required
                      aria-invalid={Boolean(errors.contactPhone) || undefined}
                      aria-describedby={errors.contactPhone ? "l-contactPhone-err" : undefined}
                    />
                    {errors.contactPhone && (
                      <span id="l-contactPhone-err" className={ui.fieldError} role="alert">
                        {errors.contactPhone}
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
                      {legalData.data?.legalProfile?.registeredAddress || headquarters?.addressLine || "Chưa cập nhật địa chỉ trụ sở theo ĐKKD"}
                    </span>
                  </div>

                  <div className={ui.field}>
                    <span className={ui.label}>Người đại diện pháp luật</span>
                    <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                      {legalData.data?.legalProfile?.representativeName ? `${legalData.data.legalProfile.representativeName} (${legalData.data.legalProfile.representativeTitle || "Đại diện pháp luật"})` : "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className={ui.field}>
                    <span className={ui.label}>Liên hệ pháp lý</span>
                    <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                      {legalData.data?.legalProfile?.contactEmail ? `${legalData.data.legalProfile.contactEmail} • ${legalData.data.legalProfile.contactPhone}` : "Chưa cập nhật"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  {canUpdate && !isLegalLocked && (
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
