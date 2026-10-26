/**
 * FINDWORK CP8C — ONBOARDING IMPORT PREVIEW MODAL
 *
 * Vị trí: src/features/candidate/profile/components/OnboardingImportPreviewModal.tsx
 * Phạm vi: Modal xem trước và xác nhận chuyển giao dữ liệu từ Onboarding sang Hồ sơ chính thức.
 *
 * TUÂN THỦ HỢP ĐỒNG CP8A:
 * POST /api/v1/candidate/profile/import-onboarding
 * Payload:
 * {
 *   "version": number,
 *   "confirmPrivacy": true,
 *   "confirmOmitUnsupportedAssets"?: true
 * }
 *
 * CÁC HÀNH VI BẮT BUỘC (PHASE 6):
 * A. Hiển thị tóm tắt dữ liệu hồ sơ sẽ chuyển giao.
 * B. Hiển thị 5 giá trị quyền riêng tư mặc định của backend:
 *    searchableProfile = false, showEmail = false, showPhone = false,
 *    allowResumeDownload = false, allowJobMatching = true.
 * C. Đọc các trường quyền riêng tư thực tế từ bản nháp.
 * D. Nêu rõ từng khác biệt giữa bản nháp và mặc định sẽ tạo.
 * E. Nhấn mạnh việc xác nhận import KHÔNG công khai hồ sơ.
 * F. Nhận diện tài nguyên chưa hỗ trợ (avatar / resume) từ cấu trúc bản nháp thực tế.
 * G. Hiển thị chính xác nhóm tài nguyên sẽ bị lược bỏ.
 * H. Yêu cầu xác nhận đồng ý bỏ qua tài nguyên trước khi kích hoạt import.
 * I. Giữ nguyên khả năng hủy và quay về trang hiện tại.
 * J. Xử lý chuẩn xác các mã lỗi API (400, 401, 403, 404, 409, 503).
 * K. Không tự động retry POST import.
 * L. Vô hiệu hóa nút bấm và chống gửi trùng lặp khi đang xử lý (pending state).
 * M. Chỉ hiển thị thành công khi API xác nhận thành công.
 * N. Không xóa bản nháp dưới dạng side effect.
 * O. Bảo toàn khả năng tiếp cận bàn phím (focus trap, Escape, scroll lock).
 */

import { useEffect, useRef, useState, useId } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lock,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import type { OnboardingImportPreviewModalProps } from "../types/uiProfileProps.types";
import { useModalAccessibility } from "../utils/useModalAccessibility";
import { prepareImportRequest } from "../utils/importConsent";
import {
  computePrivacyDifferences,
  detectUnsupportedAssets,
  type PrivacyDifferenceItem,
} from "../adapters/candidateProfileNormalizer";
import formStyles from "../styles/ProfileForms.module.css";

export const OnboardingImportPreviewModal = ({
  isOpen,
  draftSummary,
  draftData,
  detectedUnsupportedAssets: propDetectedAssets,
  privacyDifferences: propDifferences,
  isImporting = false,
  importError,
  validationErrors,
  isPreview = false,
  isLiveWritesEnabled = false,
  onClose,
  onConfirmImport,
  onGoToOnboarding,
  onOpenManualCreate,
}: OnboardingImportPreviewModalProps) => {
  const [confirmPrivacy, setConfirmPrivacy] = useState(false);
  const [confirmPrivacyDifferences, setConfirmPrivacyDifferences] = useState(false);
  const [confirmOmitAssets, setConfirmOmitAssets] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // Thật + ghi bị khóa => không được gửi POST. Demo luôn là mô phỏng trong bộ nhớ.
  const importBlocked = !isPreview && (!isLiveWritesEnabled || !draftData);

  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const privacyCheckboxId = useId();
  const privacyDifferencesCheckboxId = useId();
  const omitAssetsCheckboxId = useId();

  // Nhận diện tài nguyên chưa hỗ trợ
  const unsupportedAssets = propDetectedAssets ?? (
    draftData ? detectUnsupportedAssets(draftData) : [
      ...(draftSummary.hasLocalAvatarFile ? ["avatar" as const] : []),
      ...(draftSummary.hasLocalResumeFile ? ["resume" as const] : []),
    ]
  );
  const hasUnsupportedAssets = unsupportedAssets.length > 0;

  // Tính toán khác biệt quyền riêng tư
  const differences: PrivacyDifferenceItem[] = propDifferences ?? (
    draftData?.privacy ? computePrivacyDifferences(draftData.privacy) : []
  );

  // Accessible modal focus management & keyboard navigation
  useModalAccessibility({
    isOpen,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: confirmBtnRef,
  });

  useEffect(() => {
    if (isOpen) {
      setConfirmPrivacy(false);
      setConfirmPrivacyDifferences(false);
      setConfirmOmitAssets(false);
      setClientError(null);
    }
  }, [isOpen, draftSummary.version]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (importBlocked) {
      setClientError(!draftData
        ? "Không thể tải bản nháp đã lưu. Vui lòng tải lại trang trước khi xác nhận."
        : "Tính năng tạo hồ sơ chính thức chưa được bật. Chưa có yêu cầu nào được gửi tới máy chủ.");
      return;
    }

    const prepared = prepareImportRequest({
      version: draftSummary.version,
      confirmPrivacy,
      confirmPrivacyDifferences,
      confirmOmitUnsupportedAssets: confirmOmitAssets,
      hasPrivacyDifferences: differences.length > 0,
      hasUnsupportedAssets,
    });
    if (!prepared.ok) {
      const messages = {
        privacy: "Bạn cần xác nhận đã nắm rõ thiết lập quyền riêng tư ban đầu để tiếp tục.",
        differences: "Bạn cần xác nhận riêng các thay đổi quyền riêng tư so với bản nháp.",
        assets: "Bạn cần xác nhận riêng việc bỏ qua tệp CV hoặc ảnh chưa được lưu trữ.",
      };
      setClientError(messages[prepared.missing]);
      return;
    }

    setClientError(null);
    await onConfirmImport(prepared.payload);
  };


  const assetNames = unsupportedAssets.map((a) =>
    a === "avatar" ? "Ảnh đại diện" : "Tệp đính kèm CV (Resume)"
  );

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
        aria-describedby="import-preview-desc"
        tabIndex={-1}
        style={{ maxWidth: "680px" }}
      >
        <header className={formStyles.modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldCheck size={20} color="var(--color-primary, #4f6ef7)" aria-hidden="true" />
            <h3 id="import-preview-title" className={formStyles.modalTitle}>
              {isPreview ? "Mô phỏng tạo hồ sơ (DEMO)" : "Xem lại và xác nhận tạo hồ sơ ứng viên"}
            </h3>
          </div>
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
          <p id="import-preview-desc" style={{ margin: "0 0 0.75rem 0", fontSize: "0.8125rem", color: "var(--color-text-secondary, #64748b)", lineHeight: 1.5 }}>
            {isPreview
              ? `Đây là bản nháp mẫu (Phiên bản ${draftSummary.version}). Thao tác chỉ mô phỏng trong bộ nhớ trình duyệt, KHÔNG gửi yêu cầu tới máy chủ và KHÔNG lưu vào cơ sở dữ liệu.`
              : importBlocked
                ? `Bản nháp Onboarding (Phiên bản ${draftSummary.version}) đang được hiển thị để bạn xem lại. Việc tạo hồ sơ chính thức chưa được bật nên dữ liệu chưa được chuyển giao.`
                : `Dữ liệu từ bản nháp Onboarding (Phiên bản ${draftSummary.version}) sẽ được dùng để tạo hồ sơ ứng viên chính thức. Bản nháp gốc không bị xóa bởi thao tác này.`}
          </p>

          {importBlocked && (
            <div className={formStyles.errorSummary} role="note" data-testid="import-disabled-notice">
              <div className={formStyles.errorSummaryTitle}>
                <Lock size={16} aria-hidden="true" />
                <span>Tạo hồ sơ chính thức chưa khả dụng</span>
              </div>
              <span style={{ fontSize: "0.8125rem" }}>
                Chưa có hồ sơ nào được tạo và không có yêu cầu nào được gửi tới máy chủ. Bạn có thể quay lại Onboarding để xem hoặc chỉnh sửa bản nháp.
              </span>
            </div>
          )}

          {/* Lỗi server hoặc validation */}
          {(importError || clientError) && (
            <div id="import-error-summary" className={formStyles.errorSummary} role="alert" tabIndex={-1}>
              <div className={formStyles.errorSummaryTitle}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>Không thể hoàn tất tạo hồ sơ:</span>
              </div>
              <span style={{ fontSize: "0.8125rem" }}>{clientError || importError}</span>
              {onOpenManualCreate && (
                <div style={{ marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    className={formStyles.secondaryBtn}
                    onClick={() => {
                      onClose();
                      onOpenManualCreate();
                    }}
                    style={{ fontSize: "0.8125rem", padding: "4px 10px" }}
                  >
                    Chuyển sang Tạo hồ sơ thủ công
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Chi tiết lỗi xác thực từng trường */}
          {validationErrors && Object.keys(validationErrors).length > 0 && (
            <div className={formStyles.errorSummary} role="alert">
              <div className={formStyles.errorSummaryTitle}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>Dữ liệu bản nháp cần được điều chỉnh:</span>
              </div>
              <ul style={{ margin: "4px 0 0 1rem", padding: 0, fontSize: "0.8125rem" }}>
                {Object.entries(validationErrors).map(([field, msgs]) => (
                  <li key={field}>
                    <strong>{field}:</strong> {Array.isArray(msgs) ? msgs.join(", ") : msgs}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 1. TÓM TẮT DỮ LIỆU HỒ SƠ */}
          <section
            style={{
              background: "var(--color-surface-soft, #f8fafc)",
              border: "1px solid var(--color-border, #e2e8f0)",
              borderRadius: "10px",
              padding: "0.875rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
            aria-label="Tóm tắt thông tin hồ sơ"
          >
            <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <User size={15} color="var(--color-primary, #4f6ef7)" aria-hidden="true" />
              <span>Dữ liệu sẽ được chuyển giao vào hồ sơ:</span>
            </h4>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.5rem",
                fontSize: "0.75rem",
              }}
            >
              <div>
                <span style={{ color: "var(--color-text-secondary, #64748b)" }}>Họ và tên:</span>{" "}
                <strong>{draftSummary.fullName || "Chưa cập nhật"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary, #64748b)" }}>Số điện thoại:</span>{" "}
                <strong>{draftSummary.phone || "Chưa cập nhật"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary, #64748b)" }}>Học vấn:</span>{" "}
                <strong>{draftSummary.educationCount} mục</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary, #64748b)" }}>Kinh nghiệm:</span>{" "}
                <strong>{draftSummary.experienceCount} mục</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary, #64748b)" }}>Kỹ năng chuyên môn:</span>{" "}
                <strong>{draftSummary.skillsCount} kỹ năng</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary, #64748b)" }}>Ngoại ngữ:</span>{" "}
                <strong>{draftSummary.languagesCount} ngoại ngữ</strong>
              </div>
            </div>
          </section>

          {/* 2. CẢNH BÁO MINH BẠCH VỀ TÀI NGUYÊN CHƯA HỖ TRỢ LƯU TRỮ */}
          {hasUnsupportedAssets && (
            <section
              style={{
                background: "var(--color-warning-soft, #fffbeb)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: "10px",
                padding: "0.875rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                fontSize: "0.75rem",
                color: "#92400e",
                lineHeight: 1.5,
              }}
              role="region"
              aria-label="Cảnh báo tài nguyên chưa hỗ trợ"
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} color="#d97706" aria-hidden="true" />
                <div>
                  <strong style={{ fontSize: "0.8125rem" }}>
                    Lưu ý về các tệp xem trước ({assetNames.join(", ")}):
                  </strong>
                  <p style={{ margin: "2px 0 0 0" }}>
                    Các tệp ảnh đại diện hoặc PDF CV bạn đã chọn trong trình duyệt ở bước Onboarding là tệp xem trước cục bộ và <strong>chưa từng được lưu lên máy chủ</strong>. Do máy chủ hiện chưa mở kho lưu trữ media, hệ thống <strong>sẽ bỏ qua</strong> các tệp này khi khởi tạo hồ sơ:
                  </p>
                  <ul style={{ margin: "4px 0 0 1.25rem", padding: 0 }}>
                    {unsupportedAssets.map((asset) => (
                      <li key={asset}>
                        <strong>{asset === "avatar" ? "Ảnh đại diện (Avatar)" : "Tệp đính kèm CV (Resume)"}:</strong>{" "}
                        {asset === "avatar"
                          ? "Sẽ không tạo ảnh đại diện trên máy chủ; hồ sơ sử dụng chữ viết tắt mặc định."
                          : "Sẽ không tạo tệp CV lưu trữ; sau khi tạo hồ sơ, bạn cần tạo và lưu CV bằng CV Builder trước khi ứng tuyển."}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Checkbox bắt buộc xác nhận bỏ qua asset */}
              <div
                style={{
                  marginTop: "0.375rem",
                  paddingTop: "0.5rem",
                  borderTop: "1px dashed rgba(245, 158, 11, 0.3)",
                }}
              >
                <label className={formStyles.checkboxRow} htmlFor={omitAssetsCheckboxId}>
                  <input
                    id={omitAssetsCheckboxId}
                    type="checkbox"
                    className={formStyles.checkboxInput}
                    checked={confirmOmitAssets}
                    onChange={(e) => {
                      setConfirmOmitAssets(e.target.checked);
                      if (clientError) setClientError(null);
                    }}
                    aria-invalid={hasUnsupportedAssets && !confirmOmitAssets && Boolean(clientError)}
                  />
                  <span style={{ fontWeight: 600, color: "#78350f" }}>
                    Tôi hiểu và đồng ý bỏ qua {assetNames.join(" và ")} để tiếp tục tạo hồ sơ.
                  </span>
                </label>
              </div>
            </section>
          )}

          {/* 3. THIẾT LẬP QUYỀN RIÊNG TƯ MẶC ĐỊNH & SO SÁNH KHÁC BIỆT */}
          <section
            style={{
              border: "1px solid var(--color-border, #e2e8f0)",
              borderRadius: "10px",
              padding: "0.875rem",
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
            }}
            aria-label="Thiết lập quyền riêng tư"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <Lock size={15} color="var(--color-primary, #4f6ef7)" aria-hidden="true" />
              <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>
                Trạng thái quyền riêng tư ban đầu (Bảo vệ dữ liệu cá nhân)
              </h4>
            </div>

            {/* Thông báo minh bạch: Import không công khai hồ sơ */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                padding: "0.5rem 0.625rem",
                background: "var(--color-primary-soft, #eff6ff)",
                borderRadius: "8px",
                fontSize: "0.75rem",
                color: "var(--color-primary-dark, #1e40af)",
                lineHeight: 1.4,
              }}
              role="note"
            >
              <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <span>
                <strong>Lưu ý:</strong> Hồ sơ mới sẽ dùng 5 thiết lập mặc định bên dưới: hồ sơ <strong>không</strong> bật chế độ cho phép tìm thấy, email, số điện thoại và tải CV đều mặc định ẩn/tắt. Riêng gợi ý việc làm nội bộ được bật mặc định. Bạn có thể thay đổi sau khi hồ sơ được tạo.
              </span>
            </div>

            {/* 5 giá trị mặc định của Backend — đây là giá trị sẽ áp dụng khi tạo, chưa phải giá trị đã lưu trong DB */}
            <p style={{ margin: 0, fontSize: "0.6875rem", color: "var(--color-text-secondary, #64748b)" }}>
              Đây là giá trị mặc định sẽ áp dụng khi tạo hồ sơ, chưa phải dữ liệu đã lưu trong cơ sở dữ liệu. Cờ 'searchableProfile' tắt nghĩa là hồ sơ chưa được đặt ở chế độ có thể tìm kiếm. Cờ 'allowJobMatching' là tùy chọn dùng dữ liệu nguyện vọng cho gợi ý việc làm nội bộ, khác với việc công khai hồ sơ; các tính năng này có thể chưa vận hành đầy đủ trong giai đoạn hiện tại.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.375rem",
                fontSize: "0.6875rem",
                background: "var(--color-surface-soft, #f8fafc)",
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
              }}
            >
              <div data-testid="privacy-default-searchable">• Cho phép tìm thấy hồ sơ trong danh mục ứng viên (searchableProfile): <strong>Tắt</strong></div>
              <div data-testid="privacy-default-email">• Hiển thị email (showEmail): <strong>Tắt</strong></div>
              <div data-testid="privacy-default-phone">• Hiển thị số điện thoại (showPhone): <strong>Tắt</strong></div>
              <div data-testid="privacy-default-resume">• Cho phép tải CV (allowResumeDownload): <strong>Tắt</strong></div>
              <div data-testid="privacy-default-matching">• Dùng dữ liệu để gợi ý việc làm nội bộ (allowJobMatching): <strong>Bật</strong></div>
            </div>

            {/* Khác biệt so với bản nháp (nếu có) */}
            {differences.length > 0 ? (
              <div
                style={{
                  background: "#fefce8",
                  border: "1px solid #fef08a",
                  borderRadius: "8px",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.75rem",
                  color: "#854d0e",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                  Khác biệt so với lựa chọn trong bản nháp Onboarding:
                </div>
                <ul style={{ margin: "2px 0 0 1rem", padding: 0, lineHeight: 1.4 }}>
                  {differences.map((diff) => (
                    <li key={diff.field}>
                      <strong>{diff.label}:</strong> {diff.explanation}
                    </li>
                  ))}
                </ul>
                <label className={formStyles.checkboxRow} htmlFor={privacyDifferencesCheckboxId} style={{ marginTop: "0.5rem" }}>
                  <input
                    id={privacyDifferencesCheckboxId}
                    type="checkbox"
                    className={formStyles.checkboxInput}
                    checked={confirmPrivacyDifferences}
                    onChange={(e) => {
                      setConfirmPrivacyDifferences(e.target.checked);
                      if (clientError) setClientError(null);
                    }}
                  />
                  <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                    Tôi đã xem từng khác biệt nêu trên và đồng ý tạo hồ sơ với thiết lập ban đầu thay cho lựa chọn trong bản nháp.
                  </span>
                </label>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "0.6875rem", color: "var(--color-text-secondary, #64748b)" }}>
                Các thiết lập quyền riêng tư trong bản nháp hoàn toàn trùng khớp với cấu hình an toàn mặc định của hệ thống.
              </p>
            )}

            {/* Checkbox xác nhận quyền riêng tư */}
            <div style={{ marginTop: "0.25rem" }}>
              <label className={formStyles.checkboxRow} htmlFor={privacyCheckboxId}>
                <input
                  id={privacyCheckboxId}
                  type="checkbox"
                  className={formStyles.checkboxInput}
                  checked={confirmPrivacy}
                  onChange={(e) => {
                    setConfirmPrivacy(e.target.checked);
                    if (clientError) setClientError(null);
                  }}
                  aria-invalid={!confirmPrivacy && Boolean(clientError)}
                />
                <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                  Tôi đã đọc và đồng ý với thiết lập quyền riêng tư ban đầu cho hồ sơ mới.
                </span>
              </label>
            </div>
          </section>
        </div>

        <footer className={formStyles.modalFooter}>
          <button
            type="button"
            className={formStyles.btnSecondary}
            onClick={onClose}
            disabled={isImporting}
          >
            Hủy
          </button>
          <button
            type="button"
            className={formStyles.btnSecondary}
            onClick={onGoToOnboarding}
            disabled={isImporting}
          >
            {importBlocked ? "Xem / sửa bản nháp" : "Quay lại Onboarding"}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={formStyles.btnPrimary}
            onClick={handleConfirm}
            disabled={importBlocked || isImporting || !confirmPrivacy || (differences.length > 0 && !confirmPrivacyDifferences) || (hasUnsupportedAssets && !confirmOmitAssets)}
            aria-disabled={importBlocked || undefined}
            aria-busy={isImporting}
          >
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>
              {isImporting
                ? "Đang xử lý..."
                : importBlocked
                  ? "Tạo hồ sơ (chưa khả dụng)"
                  : isPreview
                    ? "Chạy mô phỏng (không lưu)"
                    : "Xác nhận tạo hồ sơ"}
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
};
