import { User, Building2 } from "lucide-react";
import type { RegistrationIntent } from "../../types/accountType";
import styles from "./RegistrationIntentSelector.module.css";

interface RegistrationIntentSelectorProps {
  value: RegistrationIntent;
  onChange: (value: RegistrationIntent) => void;
  disabled?: boolean;
}

export const RegistrationIntentSelector = ({
  value,
  onChange,
  disabled = false,
}: RegistrationIntentSelectorProps) => {
  return (
    <div
      className={styles.container}
      role="radiogroup"
      aria-label="Chọn mục đích đăng ký tài khoản"
    >
      <span className={styles.legend}>Mục đích sử dụng tài khoản</span>
      <div className={styles.grid}>
        {/* Candidate Option */}
        <label
          className={`${styles.card} ${value === "CANDIDATE" ? styles.cardSelected : ""}`}
          data-testid="intent-candidate"
        >
          <input
            type="radio"
            name="registrationIntent"
            value="CANDIDATE"
            checked={value === "CANDIDATE"}
            disabled={disabled}
            onChange={() => onChange("CANDIDATE")}
            className={styles.radioInput}
            aria-label="Tôi muốn tìm việc (Ứng viên)"
          />
          <div className={styles.headerRow}>
            <div className={styles.iconTitleGroup}>
              <span className={styles.iconBox} aria-hidden="true">
                <User size={16} />
              </span>
              <span className={styles.title}>Tôi muốn tìm việc</span>
            </div>
            <span className={styles.radioCircle} aria-hidden="true">
              {value === "CANDIDATE" && <span className={styles.radioDot} />}
            </span>
          </div>
          <p className={styles.description}>
            Tìm kiếm cơ hội việc làm, tạo CV trực tuyến và ứng tuyển nhanh chóng.
          </p>
        </label>

        {/* Employer Option */}
        <label
          className={`${styles.card} ${value === "EMPLOYER" ? styles.cardSelected : ""}`}
          data-testid="intent-employer"
        >
          <input
            type="radio"
            name="registrationIntent"
            value="EMPLOYER"
            checked={value === "EMPLOYER"}
            disabled={disabled}
            onChange={() => onChange("EMPLOYER")}
            className={styles.radioInput}
            aria-label="Tôi muốn tuyển dụng (Nhà tuyển dụng)"
          />
          <div className={styles.headerRow}>
            <div className={styles.iconTitleGroup}>
              <span className={styles.iconBox} aria-hidden="true">
                <Building2 size={16} />
              </span>
              <span className={styles.title}>Tôi muốn tuyển dụng</span>
            </div>
            <span className={styles.radioCircle} aria-hidden="true">
              {value === "EMPLOYER" && <span className={styles.radioDot} />}
            </span>
          </div>
          <p className={styles.description}>
            Đăng tin tuyển dụng, tìm kiếm nhân tài và quản lý quy trình xét duyệt.
          </p>
        </label>
      </div>
    </div>
  );
};

export default RegistrationIntentSelector;
