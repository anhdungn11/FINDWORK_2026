import type { PrivacySettings } from "@/features/candidate/types/onboarding.types";

import PrivacyToggle from "./PrivacyToggle";
import styles from "../styles/PrivacyStep.module.css";

interface EmployerVisibilitySectionProps {
  value: PrivacySettings;
  onChange: (value: PrivacySettings) => void;
}

const EmployerVisibilitySection = ({
  value,
  onChange,
}: EmployerVisibilitySectionProps) => {
  const update = <Key extends keyof PrivacySettings>(
    key: Key,
    nextValue: PrivacySettings[Key],
  ) => {
    onChange({
      ...value,
      [key]: nextValue,
    });
  };

  const dependentControlsDisabled = !value.searchableProfile;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.eyebrow}>NHÀ TUYỂN DỤNG & HỒ SƠ</span>
        <h3>Kiểm soát khả năng được tìm thấy</h3>
        <p>
          Chỉ nhà tuyển dụng đã đăng nhập và có quyền phù hợp mới có thể
          sử dụng tính năng tìm kiếm ứng viên.
        </p>
      </div>

      <div className={styles.primaryOption}>
        <PrivacyToggle
          checked={value.searchableProfile}
          title="Cho phép nhà tuyển dụng tìm thấy hồ sơ của tôi"
          description="Khi bật, hồ sơ nghề nghiệp của bạn có thể xuất hiện trong khu vực tìm kiếm ứng viên dành cho nhà tuyển dụng đủ quyền."
          onChange={(checked) => update("searchableProfile", checked)}
          badge={value.searchableProfile ? "Đang hiển thị" : "Riêng tư"}
        />
      </div>

      <div className={styles.dependentOptions}>
        <PrivacyToggle
          checked={value.showEmail}
          title="Hiển thị email liên hệ"
          description="Cho phép nhà tuyển dụng xem email khi họ được phép xem hồ sơ của bạn."
          disabled={dependentControlsDisabled}
          onChange={(checked) => update("showEmail", checked)}
        />

        <PrivacyToggle
          checked={value.showPhone}
          title="Hiển thị số điện thoại"
          description="Cho phép nhà tuyển dụng xem số điện thoại khi họ được phép xem hồ sơ của bạn."
          disabled={dependentControlsDisabled}
          onChange={(checked) => update("showPhone", checked)}
        />

        <PrivacyToggle
          checked={value.allowResumeDownload}
          title="Cho phép tải CV từ hồ sơ"
          description="Cho phép nhà tuyển dụng tải CV mặc định từ hồ sơ của bạn. Quyền này không thay đổi CV đã chủ động gửi khi ứng tuyển."
          disabled={dependentControlsDisabled}
          onChange={(checked) => update("allowResumeDownload", checked)}
        />
      </div>

      {!value.searchableProfile && (
        <p className={styles.disabledHint}>
          Các tùy chọn liên hệ và tải CV được giữ lại nhưng chỉ có hiệu lực
          khi bạn bật khả năng được nhà tuyển dụng tìm thấy.
        </p>
      )}
    </section>
  );
};

export default EmployerVisibilitySection;
