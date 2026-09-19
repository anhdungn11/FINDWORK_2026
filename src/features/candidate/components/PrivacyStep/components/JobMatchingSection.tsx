import type { PrivacySettings } from "@/features/candidate/types/onboarding.types";

import PrivacyToggle from "./PrivacyToggle";
import styles from "../styles/PrivacyStep.module.css";

interface JobMatchingSectionProps {
  value: PrivacySettings;
  onChange: (value: PrivacySettings) => void;
}

const JobMatchingSection = ({
  value,
  onChange,
}: JobMatchingSectionProps) => {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.eyebrow}>CÁ NHÂN HÓA FINDWORK</span>
        <h3>Gợi ý việc làm phù hợp</h3>
        <p>
          Tùy chọn này độc lập với việc nhà tuyển dụng có thể tìm thấy hồ sơ
          của bạn hay không.
        </p>
      </div>

      <div className={styles.primaryOption}>
        <PrivacyToggle
          checked={value.allowJobMatching}
          title="Cá nhân hóa gợi ý việc làm"
          description="Cho phép FINDWORK sử dụng kỹ năng, kinh nghiệm và định hướng nghề nghiệp để xếp hạng các cơ hội phù hợp hơn cho bạn."
          onChange={(checked) =>
            onChange({
              ...value,
              allowJobMatching: checked,
            })
          }
          badge={value.allowJobMatching ? "Đang bật" : "Đã tắt"}
        />
      </div>

      {!value.allowJobMatching && (
        <p className={styles.disabledHint}>
          Bạn vẫn có thể tìm kiếm, lọc, lưu và ứng tuyển việc làm bình thường.
          FINDWORK chỉ ngừng cá nhân hóa thứ tự gợi ý dựa trên hồ sơ của bạn.
        </p>
      )}
    </section>
  );
};

export default JobMatchingSection;
