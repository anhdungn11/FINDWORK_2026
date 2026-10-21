/**
 * FINDWORK — MANUAL CANDIDATE PROFILE CREATION MODAL
 * 
 * Cho phép ứng viên tạo hồ sơ chính thức trực tiếp (POST /api/v1/candidate/profile)
 * mà không phụ thuộc vào dữ liệu tham chiếu (Tỉnh/thành, Danh mục, Kỹ năng) từ Onboarding.
 * Bảo toàn 100% bản nháp Onboarding hiện tại.
 */

import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, ShieldCheck, UserCheck, X } from "lucide-react";
import type { CreateCandidateProfileDto } from "../types/candidateApi.types";
import { useModalAccessibility } from "../utils/useModalAccessibility";
import styles from "../styles/ProfileForms.module.css";

interface ManualProfileCreateModalProps {
  isOpen: boolean;
  initialFullName?: string;
  initialPhone?: string;
  isSaving?: boolean;
  isLiveWritesEnabled?: boolean;
  onClose: () => void;
  onCreate: (dto: CreateCandidateProfileDto) => Promise<void> | void;
}

export const ManualProfileCreateModal = ({
  isOpen,
  initialFullName = "",
  initialPhone = "",
  isSaving = false,
  isLiveWritesEnabled = false,
  onClose,
  onCreate,
}: ManualProfileCreateModalProps) => {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [bio, setBio] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useModalAccessibility({
    isOpen,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: firstInputRef,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 1) {
      setErrorMsg("Vui lòng nhập họ và tên (tối thiểu 1 ký tự).");
      return;
    }
    if (trimmedName.length > 160) {
      setErrorMsg("Họ và tên không được vượt quá 160 ký tự.");
      return;
    }

    if (!acknowledged) {
      setErrorMsg("Bạn cần tích chọn xác nhận để tiếp tục tạo hồ sơ chính thức.");
      return;
    }

    try {
      await onCreate({
        fullName: trimmedName,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tạo hồ sơ.");
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-create-modal-title"
      >
        <header className={styles.modalHeader}>
          <div>
            <h3 id="manual-create-modal-title" className={styles.modalTitle}>
              Tạo hồ sơ ứng viên trực tiếp
            </h3>
            <p className={styles.modalSubtitle}>
              Khởi tạo hồ sơ chính thức độc lập, bảo toàn nguyên vẹn bản nháp Onboarding
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            disabled={isSaving}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.modalBody}>
            {/* Informational Guidance Box */}
            <div
              style={{
                background: "var(--color-surface-soft, #f8fafc)",
                border: "1px solid var(--color-border, #e2e8f0)",
                borderRadius: 8,
                padding: "0.875rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.8125rem",
                color: "var(--color-text-secondary, #475569)",
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 600,
                  color: "var(--color-text-primary, #1e293b)",
                  marginBottom: 6,
                }}
              >
                <ShieldCheck size={18} color="var(--color-primary, #4f6ef7)" aria-hidden="true" />
                <span>Quyền lợi và nguyên tắc an toàn dữ liệu:</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: 4 }}>
                <li>
                  <strong>Bảo toàn bản nháp:</strong> Bản nháp Onboarding 7 bước của bạn không bị ghi đè hoặc xóa bỏ.
                </li>
                <li>
                  <strong>Không phụ thuộc dữ liệu ngoài:</strong> Quy trình này tạo hồ sơ ngay lập tức mà không cần xác thực danh mục tỉnh thành hay kỹ năng từ máy chủ.
                </li>
                <li>
                  <strong>Bảo mật mặc định:</strong> Hồ sơ khởi tạo ở trạng thái Riêng tư (ẩn email, ẩn số điện thoại). Bạn có thể hoàn thiện chi tiết bất cứ lúc nào tại trang Hồ sơ và CV Center.
                </li>
              </ul>
            </div>

            {errorMsg && (
              <div className={styles.errorSummary} role="alert" style={{ marginBottom: "1rem" }}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Field 1: Họ và tên */}
            <div className={styles.fieldGroup}>
              <label htmlFor="manual-fullname" className={styles.label}>
                Họ và tên <span style={{ color: "var(--color-danger, #ef4444)" }}>*</span>
              </label>
              <input
                ref={firstInputRef}
                id="manual-fullname"
                type="text"
                className={styles.input}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Ví dụ: Nguyễn Văn A"
                maxLength={160}
                required
                disabled={isSaving}
              />
              <span className={styles.hint}>
                Họ tên chính thức sẽ hiển thị cho nhà tuyển dụng khi bạn nộp đơn ứng tuyển.
              </span>
            </div>

            {/* Field 2: Số điện thoại */}
            <div className={styles.fieldGroup}>
              <label htmlFor="manual-phone" className={styles.label}>
                Số điện thoại liên hệ (Tùy chọn)
              </label>
              <input
                id="manual-phone"
                type="tel"
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+84 901 234 567"
                maxLength={32}
                disabled={isSaving}
              />
            </div>

            {/* Field 3: Giới thiệu ngắn */}
            <div className={styles.fieldGroup}>
              <label htmlFor="manual-bio" className={styles.label}>
                Giới thiệu bản thân (Tùy chọn)
              </label>
              <textarea
                id="manual-bio"
                className={styles.textarea}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tóm tắt ngắn gọn về mục tiêu nghề nghiệp, kinh nghiệm nổi bật..."
                rows={3}
                maxLength={5000}
                disabled={isSaving}
              />
            </div>

            {/* Confirmation Checkbox */}
            <div style={{ marginTop: "0.5rem" }}>
              <label className={styles.checkboxRow} htmlFor="manual-ack">
                <input
                  id="manual-ack"
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={acknowledged}
                  onChange={(e) => {
                    setAcknowledged(e.target.checked);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  disabled={isSaving}
                />
                <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--color-text-primary, #1e293b)" }}>
                  Tôi xác nhận tạo hồ sơ ứng viên chính thức và hiểu rằng bản nháp Onboarding vẫn được bảo toàn nguyên vẹn.
                </span>
              </label>
            </div>
          </div>

          <footer className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
              disabled={isSaving}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={isSaving || !acknowledged || !fullName.trim()}
              title={
                !isLiveWritesEnabled
                  ? "Cổng ghi đang ở chế độ kiểm thử an toàn"
                  : undefined
              }
            >
              <UserCheck size={15} aria-hidden="true" />
              <span>{isSaving ? "Đang khởi tạo..." : "Xác nhận tạo hồ sơ"}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
