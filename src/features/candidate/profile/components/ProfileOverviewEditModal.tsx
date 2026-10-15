/**
 * FINDWORK CP8B — PROFILE OVERVIEW EDIT MODAL
 * 
 * Accessible modal cho phép chỉnh sửa nhanh Họ tên, Chức danh,
 * Trạng thái tìm việc và đoạn Bio giới thiệu.
 */

import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, Info, X } from "lucide-react";
import type { CandidateCareerStatus } from "../types/candidateProfile.types";
import { useModalAccessibility } from "../utils/useModalAccessibility";
import styles from "../styles/ProfileForms.module.css";

interface Props {
  isOpen: boolean;
  initialData: {
    fullName: string;
    headline?: string;
    bio?: string | null;
    careerStatus: CandidateCareerStatus | null;
  };
  isSaving?: boolean;
  isPreview?: boolean;
  isLiveWritesEnabled?: boolean;
  onClose: () => void;
  onSave: (data: {
    fullName: string;
    headline?: string;
    bio?: string | null;
    careerStatus: CandidateCareerStatus | null;
  }) => Promise<void> | void;
}

export const ProfileOverviewEditModal = ({
  isOpen,
  initialData,
  isSaving = false,
  isPreview = false,
  isLiveWritesEnabled = false,
  onClose,
  onSave,
}: Props) => {
  const [fullName, setFullName] = useState(initialData.fullName || "");
  const [headline, setHeadline] = useState(initialData.headline || "");
  const [bio, setBio] = useState(initialData.bio || "");
  const [careerStatus, setCareerStatus] = useState<CandidateCareerStatus | "">(
    initialData.careerStatus || ""
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Accessible focus trap, Escape key, initial focus, focus restoration, and scroll lock
  useModalAccessibility({
    isOpen,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: firstInputRef,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Họ và tên không được để trống.");
      firstInputRef.current?.focus();
      return;
    }
    setErrorMsg(null);
    try {
      await onSave({
        fullName: fullName.trim(),
        headline: headline.trim() || undefined,
        bio: bio.trim() || null,
        careerStatus: careerStatus === "" ? null : careerStatus,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Không thể lưu thông tin.");
    }
  };


  const liveWritesAllowed = isPreview || isLiveWritesEnabled;

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="overview-modal-title"
        tabIndex={-1}
      >
        <header className={styles.modalHeader}>
          <h3 id="overview-modal-title" className={styles.modalTitle}>
            Chỉnh sửa thông tin tổng quan
          </h3>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate style={{ display: "contents" }}>
          <div className={styles.modalBody}>
            {isPreview && (
              <div className={styles.noticeBox} role="note">
                <Info size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1, color: "var(--color-primary, #4f6ef7)" }} />
                <span>
                  <strong>Chế độ xem trước (Development Preview):</strong> Chỉnh sửa chỉ lưu tạm thời trong bộ nhớ phiên làm việc hiện tại và sẽ được đặt lại về dữ liệu mẫu khi tải lại trang (F5). Dữ liệu không ghi vào cơ sở dữ liệu.
                </span>
              </div>
            )}

            {!liveWritesAllowed && (
              <div className={styles.warningBox} role="note">
                <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1, color: "#d97706" }} />
                <span>
                  <strong>Tầng ghi dữ liệu đang tạm khóa (ENABLE_LIVE_WRITES=false):</strong> Nhằm bảo đảm an toàn kiểm thử tích hợp, chức năng lưu cơ sở dữ liệu hiện đang tắt. Thay đổi chưa thể gửi lên máy chủ.
                </span>
              </div>
            )}

            {errorMsg && (
              <div id="overview-error" className={styles.errorSummary} role="alert" tabIndex={-1}>
                <div className={styles.errorSummaryTitle}>
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>Có lỗi cần khắc phục:</span>
                </div>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="overview-fullname" className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                Họ và tên
              </label>
              <input
                ref={firstInputRef}
                id="overview-fullname"
                type="text"
                className={`${styles.inputField} ${errorMsg ? styles.inputFieldInvalid : ""}`}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                maxLength={160}
                required
                aria-required="true"
                aria-invalid={!!errorMsg}
                aria-describedby={errorMsg ? "overview-error" : undefined}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="overview-headline" className={styles.formLabel}>
                Chức danh / Tiêu đề nghề nghiệp
              </label>
              <input
                id="overview-headline"
                type="text"
                className={styles.inputField}
                placeholder="Ví dụ: Senior Frontend Engineer | React Specialist"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={180}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="overview-career-status" className={styles.formLabel}>
                Trạng thái nghề nghiệp
              </label>
              <select
                id="overview-career-status"
                className={styles.selectField}
                value={careerStatus}
                onChange={(e) => setCareerStatus(e.target.value as CandidateCareerStatus | "")}
              >
                <option value="">-- Chưa chọn trạng thái --</option>
                <option value="LOOKING_FOR_JOB">Đang tìm việc làm</option>
                <option value="STUDENT">Sinh viên / Đang đi học</option>
                <option value="INTERN">Thực tập sinh</option>
                <option value="EMPLOYED">Đang có việc làm</option>
                <option value="UNEMPLOYED">Chưa có việc làm</option>
                <option value="FREELANCER">Làm việc tự do (Freelance)</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="overview-bio" className={styles.formLabel}>
                Giới thiệu bản thân (Bio)
              </label>
              <textarea
                id="overview-bio"
                className={styles.textareaField}
                placeholder="Mô tả ngắn gọn về kinh nghiệm, định hướng nghề nghiệp và điểm mạnh của bạn..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={5000}
                rows={4}
              />
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
              disabled={isSaving || !liveWritesAllowed}
              title={!liveWritesAllowed ? "Tầng ghi cơ sở dữ liệu đang tạm khóa (ENABLE_LIVE_WRITES=false)" : undefined}
            >
              {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
