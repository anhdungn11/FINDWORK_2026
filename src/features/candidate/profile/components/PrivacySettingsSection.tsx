/**
 * FINDWORK CP8B — PRIVACY SETTINGS SECTION
 * 
 * Quản lý các cờ quyền riêng tư cá nhân.
 * ĐẢM BẢO RÀNG BUỘC:
 * - Giá trị mặc định chuẩn xác: false, false, false, false, true.
 * - Với profile đã tồn tại: hiển thị đúng các giá trị từ props.
 * - Tuyệt đối không tuyên bố chức năng tìm kiếm ứng viên của NTD, matching tự động
 *   hay tải CV công khai đã hoạt động thực tế.
 */

import { useEffect, useState } from "react";
import { Info, ShieldCheck } from "lucide-react";
import {
  DEFAULT_PRIVACY_SETTINGS,
  type CandidatePrivacySettingRecord,
} from "../types/candidateProfile.types";
import type { PrivacySettingsSectionProps } from "../types/uiProfileProps.types";
import formStyles from "../styles/ProfileForms.module.css";
import sectionStyles from "../styles/ProfileSections.module.css";

export const PrivacySettingsSection = ({
  privacySetting = DEFAULT_PRIVACY_SETTINGS,
  onSavePrivacy,
  isSaving = false,
}: PrivacySettingsSectionProps) => {
  const [settings, setSettings] = useState<CandidatePrivacySettingRecord>({
    searchableProfile: privacySetting?.searchableProfile ?? false,
    showEmail: privacySetting?.showEmail ?? false,
    showPhone: privacySetting?.showPhone ?? false,
    allowResumeDownload: privacySetting?.allowResumeDownload ?? false,
    allowJobMatching: privacySetting?.allowJobMatching ?? true,
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Sync state if privacySetting prop changes (e.g. initial fetch or profile update)
  useEffect(() => {
    if (privacySetting) {
      setSettings({
        searchableProfile: privacySetting.searchableProfile ?? false,
        showEmail: privacySetting.showEmail ?? false,
        showPhone: privacySetting.showPhone ?? false,
        allowResumeDownload: privacySetting.allowResumeDownload ?? false,
        allowJobMatching: privacySetting.allowJobMatching ?? true,
      });
      setHasChanges(false);
    }
  }, [privacySetting]);

  const toggleField = (field: keyof CandidatePrivacySettingRecord) => {
    setSettings((prev) => {
      const updated = { ...prev, [field]: !prev[field] };
      const isDirty =
        updated.searchableProfile !== (privacySetting?.searchableProfile ?? false) ||
        updated.showEmail !== (privacySetting?.showEmail ?? false) ||
        updated.showPhone !== (privacySetting?.showPhone ?? false) ||
        updated.allowResumeDownload !== (privacySetting?.allowResumeDownload ?? false) ||
        updated.allowJobMatching !== (privacySetting?.allowJobMatching ?? true);
      setHasChanges(isDirty);
      return updated;
    });
  };

  const handleCancel = () => {
    setSettings({
      searchableProfile: privacySetting?.searchableProfile ?? false,
      showEmail: privacySetting?.showEmail ?? false,
      showPhone: privacySetting?.showPhone ?? false,
      allowResumeDownload: privacySetting?.allowResumeDownload ?? false,
      allowJobMatching: privacySetting?.allowJobMatching ?? true,
    });
    setHasChanges(false);
  };

  const handleSave = async () => {
    if (onSavePrivacy) {
      await onSavePrivacy(settings);
      setHasChanges(false);
    }
  };

  return (
    <section
      id="section-privacy"
      className={sectionStyles.card}
      aria-labelledby="privacy-section-title"
    >
      <div className={sectionStyles.cardHeader}>
        <div className={sectionStyles.cardTitleGroup}>
          <div className={sectionStyles.cardIcon} style={{ background: "#dcfce7", color: "#15803d" }}>
            <ShieldCheck size={18} aria-hidden="true" />
          </div>
          <div>
            <h3 id="privacy-section-title" className={sectionStyles.cardTitle}>
              Thiết lập quyền riêng tư
            </h3>
            <p className={sectionStyles.cardSubtitle}>
              Kiểm soát các tùy chọn hiển thị và liên hệ của hồ sơ ứng viên
            </p>
          </div>
        </div>

        {hasChanges && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              className={formStyles.btnSecondary}
              onClick={handleCancel}
              disabled={isSaving}
              aria-label="Hủy các thay đổi quyền riêng tư"
            >
              Hủy
            </button>
            <button
              type="button"
              className={formStyles.btnPrimary}
              onClick={handleSave}
              disabled={isSaving}
              aria-label="Lưu cài đặt quyền riêng tư"
            >
              {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        )}
      </div>

      <div className={sectionStyles.privacyList}>
        {/* Toggle 1: Cho phép tìm kiếm hồ sơ */}
        <div className={sectionStyles.privacyRow}>
          <div className={sectionStyles.privacyMeta}>
            <h4 className={sectionStyles.privacyTitle}>Trạng thái tìm kiếm hồ sơ</h4>
            <p className={sectionStyles.privacyDescription}>
              Lưu cấu hình cho phép hiển thị hồ sơ trong danh mục ứng viên (mặc định tắt).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.searchableProfile}
            aria-label="Bật hoặc tắt trạng thái tìm kiếm hồ sơ"
            className={`${sectionStyles.switchToggle} ${
              settings.searchableProfile ? sectionStyles.switchToggleChecked : ""
            }`}
            onClick={() => toggleField("searchableProfile")}
            disabled={isSaving}
          >
            <span className={sectionStyles.switchToggleThumb} />
          </button>
        </div>

        {/* Toggle 2: Hiển thị địa chỉ Email */}
        <div className={sectionStyles.privacyRow}>
          <div className={sectionStyles.privacyMeta}>
            <h4 className={sectionStyles.privacyTitle}>Hiển thị địa chỉ Email</h4>
            <p className={sectionStyles.privacyDescription}>
              Cho phép hiển thị email liên lạc (mặc định ẩn để bảo vệ quyền riêng tư).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showEmail}
            aria-label="Bật hoặc tắt hiển thị địa chỉ Email"
            className={`${sectionStyles.switchToggle} ${
              settings.showEmail ? sectionStyles.switchToggleChecked : ""
            }`}
            onClick={() => toggleField("showEmail")}
            disabled={isSaving}
          >
            <span className={sectionStyles.switchToggleThumb} />
          </button>
        </div>

        {/* Toggle 3: Hiển thị Số điện thoại */}
        <div className={sectionStyles.privacyRow}>
          <div className={sectionStyles.privacyMeta}>
            <h4 className={sectionStyles.privacyTitle}>Hiển thị Số điện thoại</h4>
            <p className={sectionStyles.privacyDescription}>
              Cho phép hiển thị số điện thoại cá nhân (mặc định ẩn để tránh làm phiền).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showPhone}
            aria-label="Bật hoặc tắt hiển thị Số điện thoại"
            className={`${sectionStyles.switchToggle} ${
              settings.showPhone ? sectionStyles.switchToggleChecked : ""
            }`}
            onClick={() => toggleField("showPhone")}
            disabled={isSaving}
          >
            <span className={sectionStyles.switchToggleThumb} />
          </button>
        </div>

        {/* Toggle 4: Cho phép tải tệp CV */}
        <div className={sectionStyles.privacyRow}>
          <div className={sectionStyles.privacyMeta}>
            <h4 className={sectionStyles.privacyTitle}>Cho phép tải tệp CV</h4>
            <p className={sectionStyles.privacyDescription}>
              Lưu tùy chọn cho phép nhà tuyển dụng tải bản sao tệp CV đính kèm (mặc định tắt).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.allowResumeDownload}
            aria-label="Bật hoặc tắt cho phép tải tệp CV"
            className={`${sectionStyles.switchToggle} ${
              settings.allowResumeDownload ? sectionStyles.switchToggleChecked : ""
            }`}
            onClick={() => toggleField("allowResumeDownload")}
            disabled={isSaving}
          >
            <span className={sectionStyles.switchToggleThumb} />
          </button>
        </div>

        {/* Toggle 5: Tùy chọn gợi ý việc làm */}
        <div className={sectionStyles.privacyRow}>
          <div className={sectionStyles.privacyMeta}>
            <h4 className={sectionStyles.privacyTitle}>Tùy chọn gợi ý việc làm</h4>
            <p className={sectionStyles.privacyDescription}>
              Cho phép hệ thống sử dụng dữ liệu nguyện vọng để hiển thị các cơ hội việc làm liên quan (mặc định bật).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.allowJobMatching}
            aria-label="Bật hoặc tắt tùy chọn gợi ý việc làm"
            className={`${sectionStyles.switchToggle} ${
              settings.allowJobMatching ? sectionStyles.switchToggleChecked : ""
            }`}
            onClick={() => toggleField("allowJobMatching")}
            disabled={isSaving}
          >
            <span className={sectionStyles.switchToggleThumb} />
          </button>
        </div>
      </div>

      {/* Cảnh báo minh bạch dữ liệu */}
      <div className={sectionStyles.noticeBox} role="note">
        <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
        <div>
          <strong>Minh bạch kỹ thuật:</strong>{" "}
          {privacySetting?.candidateProfileId
            ? "Đang hiển thị bản ghi quyền riêng tư của hồ sơ từ máy chủ."
            : "Hồ sơ hiện chưa có bản ghi quyền riêng tư lưu trên cơ sở dữ liệu; giao diện đang hiển thị 5 giá trị mặc định an toàn theo hợp đồng Prisma (chỉ bật gợi ý việc làm, tắt tìm kiếm công khai, ẩn email, ẩn số điện thoại và tắt tải CV) và không tự nhận đã lưu vào DB."}{" "}
          Trong giai đoạn nghiệm thu kiểm thử (ENABLE_LIVE_WRITES=false), các thay đổi cài đặt chưa được lưu vĩnh viễn vào cơ sở dữ liệu.
        </div>
      </div>
    </section>
  );
};
