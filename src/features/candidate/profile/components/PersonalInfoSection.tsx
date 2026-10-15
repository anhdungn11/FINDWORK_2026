/**
 * FINDWORK CP8B — PERSONAL INFO SECTION
 * 
 * Hiển thị và chỉnh sửa thông tin nhân thân: Họ tên, Email tài khoản,
 * Số điện thoại, Ngày sinh, Giới tính, Địa chỉ cư trú.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Info, Pencil, User, X } from "lucide-react";
import type { Gender } from "../types/candidateProfile.types";
import type { PersonalInfoSectionProps } from "../types/uiProfileProps.types";
import { formatDateOfBirth, formatGenderLabel } from "../utils/profileFormatters";
import { useModalAccessibility } from "../utils/useModalAccessibility";
import formStyles from "../styles/ProfileForms.module.css";
import sectionStyles from "../styles/ProfileSections.module.css";

export const PersonalInfoSection = ({
  profile,
  accountEmail,
  onSavePersonalInfo,
  isSaving = false,
  isPreview = false,
  isLiveWritesEnabled = false,
}: PersonalInfoSectionProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Edit form state
  const [phone, setPhone] = useState(profile.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "");
  const [gender, setGender] = useState<Gender | "">(profile.gender || "");
  const [addressLine, setAddressLine] = useState(profile.addressLine || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Accessible focus trap, Escape key, initial focus, focus restoration, and scroll lock
  useModalAccessibility({
    isOpen: isEditOpen,
    onClose: () => setIsEditOpen(false),
    containerRef: dialogRef,
    initialFocusRef: firstInputRef,
  });

  useEffect(() => {
    if (isEditOpen) {
      setPhone(profile.phone || "");
      setDateOfBirth(profile.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "");
      setGender(profile.gender || "");
      setAddressLine(profile.addressLine || "");
      setErrorMsg(null);
    }
  }, [isEditOpen, profile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (onSavePersonalInfo) {
        await onSavePersonalInfo({
          phone: phone.trim() || null,
          dateOfBirth: dateOfBirth ? dateOfBirth : null,
          gender: gender === "" ? null : gender,
          addressLine: addressLine.trim() || null,
        });
      }
      setIsEditOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Không thể lưu thông tin cá nhân.");
    }
  };

  const liveWritesAllowed = isPreview || isLiveWritesEnabled;

  const fullAddress = [
    profile.addressLine,
    profile.ward?.name,
    profile.province?.name,
    profile.countryCode === "VN" ? "Việt Nam" : profile.countryCode,
  ].filter(Boolean).join(", ");

  return (
    <>
      <section
        id="section-personal"
        className={sectionStyles.card}
        aria-labelledby="personal-info-title"
      >
        <div className={sectionStyles.cardHeader}>
          <div className={sectionStyles.cardTitleGroup}>
            <div className={sectionStyles.cardIcon}>
              <User size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 id="personal-info-title" className={sectionStyles.cardTitle}>
                Thông tin cá nhân
              </h3>
              <p className={sectionStyles.cardSubtitle}>
                Dữ liệu liên hệ và thông tin cơ bản của ứng viên
              </p>
            </div>
          </div>

          <button
            type="button"
            className={sectionStyles.editButton}
            onClick={() => setIsEditOpen(true)}
            aria-label="Chỉnh sửa thông tin cá nhân"
          >
            <Pencil size={14} aria-hidden="true" />
            <span>Chỉnh sửa</span>
          </button>
        </div>

        <div className={sectionStyles.dataGrid}>
          <div className={sectionStyles.dataPair}>
            <span className={sectionStyles.dataLabel}>Họ và tên đầy đủ</span>
            <span className={sectionStyles.dataValue}>{profile.fullName}</span>
          </div>

          <div className={sectionStyles.dataPair}>
            <span className={sectionStyles.dataLabel}>Email tài khoản</span>
            <span className={sectionStyles.dataValue}>{accountEmail}</span>
          </div>

          <div className={sectionStyles.dataPair}>
            <span className={sectionStyles.dataLabel}>Số điện thoại</span>
            <span className={profile.phone ? sectionStyles.dataValue : sectionStyles.dataValueMuted}>
              {profile.phone || "Chưa cập nhật"}
            </span>
          </div>

          <div className={sectionStyles.dataPair}>
            <span className={sectionStyles.dataLabel}>Ngày sinh</span>
            <span className={profile.dateOfBirth ? sectionStyles.dataValue : sectionStyles.dataValueMuted}>
              {formatDateOfBirth(profile.dateOfBirth)}
            </span>
          </div>

          <div className={sectionStyles.dataPair}>
            <span className={sectionStyles.dataLabel}>Giới tính</span>
            <span className={profile.gender ? sectionStyles.dataValue : sectionStyles.dataValueMuted}>
              {formatGenderLabel(profile.gender)}
            </span>
          </div>

          <div className={sectionStyles.dataPair}>
            <span className={sectionStyles.dataLabel}>Tỉnh / Thành phố</span>
            <span className={profile.province?.name ? sectionStyles.dataValue : sectionStyles.dataValueMuted}>
              {profile.province?.name || "Chưa cập nhật"}
            </span>
          </div>

          <div className={sectionStyles.dataPair} style={{ gridColumn: "1 / -1" }}>
            <span className={sectionStyles.dataLabel}>Địa chỉ cư trú</span>
            <span className={fullAddress ? sectionStyles.dataValue : sectionStyles.dataValueMuted}>
              {fullAddress || "Chưa cập nhật"}
            </span>
          </div>
        </div>
      </section>

      {/* Modal Chỉnh Sửa Thông Tin Cá Nhân */}
      {isEditOpen && (
        <div
          className={formStyles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditOpen(false);
          }}
          role="presentation"
        >
          <div
            ref={dialogRef}
            className={formStyles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="personal-modal-title"
            tabIndex={-1}
          >
            <header className={formStyles.modalHeader}>
              <h3 id="personal-modal-title" className={formStyles.modalTitle}>
                Chỉnh sửa thông tin cá nhân
              </h3>
              <button
                type="button"
                className={formStyles.modalCloseBtn}
                onClick={() => setIsEditOpen(false)}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={handleSubmit} noValidate style={{ display: "contents" }}>
              <div className={formStyles.modalBody}>
                {isPreview && (
                  <div className={formStyles.noticeBox} role="note">
                    <Info size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1, color: "var(--color-primary, #4f6ef7)" }} />
                    <span>
                      <strong>Chế độ xem trước (Development Preview):</strong> Chỉnh sửa chỉ lưu tạm thời trong bộ nhớ phiên làm việc hiện tại và sẽ được đặt lại về dữ liệu mẫu khi tải lại trang (F5). Dữ liệu không ghi vào cơ sở dữ liệu.
                    </span>
                  </div>
                )}

                {!liveWritesAllowed && (
                  <div className={formStyles.warningBox} role="note">
                    <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1, color: "#d97706" }} />
                    <span>
                      <strong>Tầng ghi dữ liệu đang tạm khóa (ENABLE_LIVE_WRITES=false):</strong> Nhằm bảo đảm an toàn kiểm thử tích hợp, chức năng lưu cơ sở dữ liệu hiện đang tắt. Thay đổi chưa thể gửi lên máy chủ.
                    </span>
                  </div>
                )}

                {errorMsg && (
                  <div className={formStyles.errorSummary} role="alert" tabIndex={-1}>
                    <div className={formStyles.errorSummaryTitle}>
                      <AlertCircle size={14} aria-hidden="true" />
                      <span>Có lỗi xảy ra:</span>
                    </div>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className={formStyles.formGroup}>
                  <label htmlFor="personal-phone" className={formStyles.formLabel}>
                    Số điện thoại
                  </label>
                  <input
                    ref={firstInputRef}
                    id="personal-phone"
                    type="tel"
                    className={formStyles.inputField}
                    placeholder="Ví dụ: 0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={32}
                  />
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="personal-dob" className={formStyles.formLabel}>
                    Ngày sinh
                  </label>
                  <input
                    id="personal-dob"
                    type="date"
                    className={formStyles.inputField}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="personal-gender" className={formStyles.formLabel}>
                    Giới tính
                  </label>
                  <select
                    id="personal-gender"
                    className={formStyles.selectField}
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender | "")}
                  >
                    <option value="">-- Chưa chọn --</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="personal-address" className={formStyles.formLabel}>
                    Địa chỉ chi tiết (Số nhà, tên đường)
                  </label>
                  <input
                    id="personal-address"
                    type="text"
                    className={formStyles.inputField}
                    placeholder="Ví dụ: Số 123 Đường Cầu Giấy"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    maxLength={255}
                  />
                </div>
              </div>

              <footer className={formStyles.modalFooter}>
                <button
                  type="button"
                  className={formStyles.btnSecondary}
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSaving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={formStyles.btnPrimary}
                  disabled={isSaving || !liveWritesAllowed}
                  title={!liveWritesAllowed ? "Tầng ghi cơ sở dữ liệu đang tạm khóa (ENABLE_LIVE_WRITES=false)" : undefined}
                >
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
