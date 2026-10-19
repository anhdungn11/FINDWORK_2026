import { useState, type FormEvent } from "react";
import { Card, PageHeader, ui } from "@/components/ui";
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
    <div style={{ maxWidth: 640, margin: "40px auto", padding: "0 16px" }}>
      <PageHeader
        title="Đăng ký thành lập doanh nghiệp"
        subtitle="Khởi tạo không gian doanh nghiệp để đăng tin tuyển dụng và tìm kiếm nhân sự trên FINDWORK."
      />

      {!writes && (
        <div className={`${ui.notice} ${ui.noticeWarn}`} role="note" style={{ marginBottom: 16 }}>
          Chế độ chỉ xem: cổng ghi dữ liệu doanh nghiệp đang khóa. Thao tác đăng ký doanh nghiệp mới cần bật cờ thao tác ghi.
        </div>
      )}

      {error && (
        <div className={`${ui.notice} ${ui.noticeWarn}`} role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <Card title="Thông tin tổ chức">
        <form onSubmit={handleSubmit} noValidate>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="company-name">
              Tên doanh nghiệp *
            </label>
            <input
              id="company-name"
              className={ui.input}
              placeholder="Ví dụ: Công ty Cổ phần Công nghệ FINDWORK"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={submitting}
              required
            />
            {fieldErrors.name && (
              <span className={ui.fieldError} role="alert">
                {fieldErrors.name}
              </span>
            )}
          </div>

          <div className={ui.field}>
            <label className={ui.label} htmlFor="company-slug">
              Đường dẫn định danh (Slug) *
            </label>
            <input
              id="company-slug"
              className={ui.input}
              placeholder="vi-du-cong-ty-findwork"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              disabled={submitting}
              required
            />
            <span className={ui.hint}>
              Đường dẫn công khai của doanh nghiệp: <code>/companies/{slug || "slug-cua-ban"}</code>
            </span>
            {fieldErrors.slug && (
              <span className={ui.fieldError} role="alert">
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
              title={writes ? undefined : "Thao tác ghi đang tắt"}
            >
              {submitting ? "Đang thành lập..." : "Thành lập doanh nghiệp"}
            </button>
          </div>
        </form>
      </Card>

      <div style={{ marginTop: 24, padding: "16px 20px", background: "var(--color-surface-soft, #f8fafc)", borderRadius: 12, border: "1px solid var(--color-border)" }}>
        <h4 style={{ margin: "0 0 6px", fontSize: "0.9375rem" }}>Bạn được mời tham gia vào doanh nghiệp khác?</h4>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
          Nếu bạn đã nhận được email mời tham gia từ chủ doanh nghiệp, hãy nhấp vào đường dẫn trong thư mời để kích hoạt tư cách thành viên.
        </p>
      </div>
    </div>
  );
};
