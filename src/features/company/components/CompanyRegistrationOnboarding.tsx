import { useState, type FormEvent } from "react";
import { Building2, Globe, ArrowRight } from "lucide-react";
import { Card, ui } from "@/components/ui";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

export const CompanyRegistrationOnboarding = ({ onCreated }: { onCreated: () => void }) => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; slug?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const writes = isWorkspaceWritesEnabled();

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(val));
    }
    if (fieldErrors.name) {
      setFieldErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlugManuallyEdited(true);
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    if (fieldErrors.slug) {
      setFieldErrors((prev) => ({ ...prev, slug: undefined }));
    }
  };

  const validate = (): boolean => {
    const errs: { name?: string; slug?: string } = {};
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (!trimmedName || trimmedName.length < 2) {
      errs.name = "Tên doanh nghiệp phải có ít nhất 2 ký tự.";
    } else if (trimmedName.length > 255) {
      errs.name = "Tên doanh nghiệp không được vượt quá 255 ký tự.";
    }

    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!trimmedSlug || trimmedSlug.length < 3) {
      errs.slug = "Mã định danh đường dẫn (slug) phải có ít nhất 3 ký tự.";
    } else if (trimmedSlug.length > 220) {
      errs.slug = "Slug không được vượt quá 220 ký tự.";
    } else if (!slugRegex.test(trimmedSlug)) {
      errs.slug = "Slug chỉ được chứa chữ cái thường, số và dấu gạch nối đơn.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await companyWorkspaceApi.createCompany({
        name: name.trim(),
        slug: slug.trim(),
      });
      onCreated();
    } catch (err) {
      const f = toApiFailure(err);
      if (f.code === "COMPANY_SLUG_CONFLICT" || f.status === 409) {
        setError("Đường dẫn này đã được một doanh nghiệp khác sử dụng. Vui lòng chọn đường dẫn khác.");
      } else {
        setError(f.message || "Không thể tạo doanh nghiệp lúc này. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Thông tin tổ chức">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 4px", color: "var(--color-text-primary, #1e293b)" }}>
          Đăng ký thông tin tổ chức
        </h2>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary, #64748b)" }}>
          Cung cấp tên công ty và đường dẫn công khai để thiết lập trang tuyển dụng thương hiệu.
        </p>
      </div>

      {error && (
        <div className={`${ui.notice} ${ui.noticeWarn}`} role="alert" style={{ marginBottom: 18 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="company-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 size={15} color="var(--color-primary, #4f6ef7)" />
            <span>Tên doanh nghiệp chính thức *</span>
          </label>
          <input
            id="company-name"
            className={ui.input}
            placeholder="Ví dụ: Công ty Cổ phần Công nghệ FINDWORK"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            disabled={submitting}
            required
            autoComplete="organization"
          />
          {fieldErrors.name ? (
            <span className={ui.fieldError} role="alert">
              {fieldErrors.name}
            </span>
          ) : (
            <span className={ui.hint}>Tên công ty sẽ hiển thị cho ứng viên trên các bài đăng tuyển dụng.</span>
          )}
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="company-slug" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Globe size={15} color="var(--color-primary, #4f6ef7)" />
            <span>Mã định danh doanh nghiệp (Slug) *</span>
          </label>
          <input
            id="company-slug"
            className={ui.input}
            placeholder="cong-ty-findwork"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            disabled={submitting}
            required
          />
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.8125rem",
              color: "var(--color-text-secondary, #64748b)",
              marginTop: 6,
              padding: "4px 8px",
              background: "var(--color-surface-soft, #f1f5f9)",
              borderRadius: 6,
              wordBreak: "break-all",
            }}
          >
            <span>Định danh hệ thống:</span>
            <code style={{ color: "var(--color-primary, #4f6ef7)", fontWeight: 600 }}>
              @{slug || "slug-doanh-nghiep"}
            </code>
          </div>
          {fieldErrors.slug && (
            <span className={ui.fieldError} role="alert" style={{ display: "block", marginTop: 4 }}>
              {fieldErrors.slug}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="submit"
            className={`${ui.btn} ${ui.btnPrimary}`}
            disabled={submitting || !writes}
            aria-disabled={!writes}
            title={writes ? undefined : "Cổng ghi dữ liệu đang khóa trong chế độ chỉ xem"}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 20px", fontWeight: 600 }}
          >
            <span>{submitting ? "Đang thành lập..." : "Thành lập doanh nghiệp"}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Card>
  );
};
