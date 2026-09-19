import type { PrivacySettings } from "@/features/candidate/types/onboarding.types";

import EmployerVisibilitySection from "./components/EmployerVisibilitySection";
import JobMatchingSection from "./components/JobMatchingSection";
import PrivacyNotice from "./components/PrivacyNotice";
import styles from "./styles/PrivacyStep.module.css";

interface PrivacyStepProps {
  value: PrivacySettings;
  onChange: (value: PrivacySettings) => void;
}

const PrivacyStep = ({
  value,
  onChange,
}: PrivacyStepProps) => {
  return (
    <div className={styles.root}>
      <div className={styles.intro}>
        <span className={styles.introIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 3 19 6v5c0 4.4-2.7 8-7 10-4.3-2-7-5.6-7-10V6l7-3Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="m9.3 12 1.7 1.7 3.8-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <div>
          <strong>Bạn quyết định cách hồ sơ được sử dụng.</strong>
          <p>
            Các thiết lập dưới đây có thể thay đổi lại sau onboarding trong khu
            vực Hồ sơ & cài đặt.
          </p>
        </div>
      </div>

      <EmployerVisibilitySection value={value} onChange={onChange} />
      <JobMatchingSection value={value} onChange={onChange} />
      <PrivacyNotice />
    </div>
  );
};

export default PrivacyStep;
