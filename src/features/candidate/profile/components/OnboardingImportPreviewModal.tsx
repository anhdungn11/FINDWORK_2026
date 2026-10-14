/**
 * FINDWORK CP8B — ONBOARDING IMPORT PREVIEW MODAL
 * 
 * Modal xem trước và xác nhận chuyển giao dữ liệu từ Onboarding sang Hồ sơ chính thức.
 * ĐẢM BẢO RÀNG BUỘC:
 * - Gọi mutation với contract đề xuất: { version, confirmPrivacy }.
 * - Cảnh báo minh bạch về ảnh đại diện và PDF CV là file cục bộ (blob) chưa lưu trên máy chủ.
 * - Hiển thị lỗi xác thực (validation errors) và giữ lại thông tin người dùng.
 * - Hỗ trợ phát hiện xung đột phiên bản (version conflict).
 */

import { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, X } from "lucide-react";
import type { OnboardingImportPreviewModalProps } from "../types/uiProfileProps.types";
import { useModalAccessibility } from "../utils/useModalAccessibility";
import formStyles from "../styles/ProfileForms.module.css";

export const OnboardingImportPreviewModal = ({
  isOpen,
  draftSummary,
  isImporting = false,
  importError,
  validationErrors,
  onClose,
  onConfirmImport,
  onGoToOnboarding,
}: OnboardingImportPreviewModalProps) => {
  const [confirmPrivacy, setConfirmPrivacy] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Accessible focus trap, Escape key, initial focus, focus restoration, and scroll lock
  useModalAccessibility({
    isOpen,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: confirmBtnRef,
  });

  useEffect(() => {
    if (isOpen) {
      setConfirmPrivacy(true);
      setClientError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!confirmPrivacy) {
      setClientError("Bạn cần đồng ý với thiết lập quyền riêng tư để khởi tạo hồ sơ.");
      return;
    }
    setClientError(null);
    await onConfirmImport({
      version: draftSummary.version,
      confirmPrivacy,
    });
  };

  return (
    <div
      className={formStyles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isImporting) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={formStyles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-preview-title"
        tabIndex={-1}
      >
        <header className={formStyles.modalHeader}>
          <h3 id="import-preview-title" className={formStyles.modalTitle}>
            Xem lại thông tin trước khi tạo hồ sơ
          </h3>
          <button
            type="button"
            className={formStyles.modalCloseBtn}
            onClick={onClose}
            disabled={isImporting}
            aria-label="Đóng cửa sổ"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={formStyles.modalBody}>
          {/* Lỗi server hoặc client */}
          {(importError || clientError) && (
            <div id="import-error-summary" className={formStyles.errorSummary} role="alert" tabIndex={-1}>
              <div className={formStyles.errorSummaryTitle}>
                <AlertCircle size={15} aria-hidden="true" />
                <span>Không thể hoàn tất khởi tạo hồ sơ:</span>
              </div>
              <span>{clientError || importError}</span>
            </div>
          )}

          {/* Lỗi xác thực chi tiết từng trường (Validation errors) */}
          {validationErrors && Object.keys(validationErrors).length > 0 && (
            <div className={formStyles.errorSummary} role="alert">
              <div className={formStyles.errorSummaryTitle}>
                <AlertCircle size={15} aria-hidden="true" />
                <span>Dữ liệu bản nháp cần được điều chỉnh:</span>
              </div>
              <ul style={{ margin: "4px 0 0 1rem", padding: 0 }}>
                {Object.entries(validationErrors).map(([field, msgs]) => (
                  <li key={field}>
                    <strong>{field}:</strong> {Array.isArray(msgs) ? msgs.join(", ") : msgs}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CẢNH BÁO MINH BẠCH VỀ TỆP CỤC BỘ */}
          {(draftSummary.hasLocalAvatarFile || draftSummary.hasLocalResumeFile) && (
            <aside
              style={{
                background: "var(--color-warning-soft, #fef3c7)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: "10px",
                padding: "0.75rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                fontSize: "0.75rem",
                color: "#92400e",
                lineHeight: 1.4,
              }}
              role="note"
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div>
                <strong>Lưu ý về Tệp ảnh và CV:</strong>
                <p style={{ margin: "2px 0 0 0" }}>
                  Ảnh đại diện và tệp PDF CV chọn từ máy tính trong lúc làm Onboarding là tệp xem trước tạm thời trong trình duyệt và <strong>chưa từng được lưu lên máy chủ</strong>. Do đó, các tệp này <strong>sẽ không được chuyển giao</strong> vào hồ sơ. Bạn có thể cập nhật tệp CV bất cứ lúc nào tại <strong>CV Center</strong>.
                </p>
              </div>
            </aside>
          )}

          {/* Tóm tắt các khối dữ liệu sẽ được nhập */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>
              Dữ liệu sẽ được chuyển giao vào hồ sơ chính thức:
            </h4>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0.5rem",
                background: "var(--color-surface-soft, #f1f5f9)",
                padding: "0.75rem",
                borderRadius: "10px",
                fontSize: "0.75rem",
              }}
            >
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Họ và tên:</span>{" "}
                <strong>{draftSummary.fullName || "Chưa có"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Số điện thoại:</span>{" "}
                <strong>{draftSummary.phone || "Chưa có"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Học vấn:</span>{" "}
                <strong>{draftSummary.educationCount} mục</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Kinh nghiệm:</span>{" "}
                <strong>{draftSummary.experienceCount} mục</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Kỹ năng:</span>{" "}
                <strong>{draftSummary.skillsCount} kỹ năng</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Ngoại ngữ:</span>{" "}
                <strong>{draftSummary.languagesCount} ngoại ngữ</strong>
              </div>
            </div>
          </div>

          {/* Checkbox Đồng ý Quyền riêng tư mặc định */}
          <div
            style={{
              padding: "0.75rem",
              border: "1px solid var(--color-border, #e2e8f0)",
              borderRadius: "10px",
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <label className={formStyles.checkboxRow} htmlFor="import-confirm-privacy">
              <input
                id="import-confirm-privacy"
                type="checkbox"
                className={formStyles.checkboxInput}
                checked={confirmPrivacy}
                onChange={(e) => {
                  setConfirmPrivacy(e.target.checked);
                  if (clientError) setClientError(null);
                }}
                aria-invalid={!confirmPrivacy && Boolean(clientError)}
                aria-describedby={clientError ? "import-error-summary" : undefined}
              />
              <span style={{ fontWeight: 600 }}>
                Áp dụng thiết lập quyền riêng tư mặc định (Khuyên dùng)
              </span>
            </label>
            <p style={{ margin: "0 0 0 26px", fontSize: "0.6875rem", color: "var(--color-text-secondary)" }}>
              Hồ sơ mặc định sẽ <strong>không công khai</strong> và ẩn email/số điện thoại để bảo vệ tối đa dữ liệu cá nhân của bạn.
            </p>
          </div>
        </div>

        <footer className={formStyles.modalFooter}>
          <button
            type="button"
            className={formStyles.btnSecondary}
            onClick={onGoToOnboarding}
            disabled={isImporting}
          >
            Quay lại Onboarding
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={formStyles.btnPrimary}
            onClick={handleConfirm}
            disabled={isImporting}
          >
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>{isImporting ? "Đang tạo hồ sơ..." : "Xác nhận tạo hồ sơ"}</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
