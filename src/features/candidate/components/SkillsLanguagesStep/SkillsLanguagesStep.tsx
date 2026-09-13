import type {
  CandidateLanguageItem,
  CandidateSkillItem,
} from "@/features/candidate/types/onboarding.types";

import styles from "./SkillsLanguagesStep.module.css";
import LanguagesSection from "./languages/LanguagesSection";
import SkillsSection from "./skills/SkillsSection";

interface SkillsLanguagesStepProps {
  skills: CandidateSkillItem[];
  languages: CandidateLanguageItem[];
  onSkillsChange: (value: CandidateSkillItem[]) => void;
  onLanguagesChange: (value: CandidateLanguageItem[]) => void;
}

const SkillsLanguagesStep = ({
  skills,
  languages,
  onSkillsChange,
  onLanguagesChange,
}: SkillsLanguagesStepProps) => {
  return (
    <div className={styles.wrapper}>
      <SkillsSection
        skills={skills}
        onSkillsChange={onSkillsChange}
      />

      <div className={styles.mainDivider} />

      <LanguagesSection
        languages={languages}
        onLanguagesChange={onLanguagesChange}
      />

      <div className={styles.notice}>
        <div className={styles.noticeIcon}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M12 11v5M12 8h.01"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div>
          <strong>Ưu tiên thông tin phản ánh đúng năng lực</strong>
          <p>
            Không cần thêm thật nhiều kỹ năng hoặc chứng chỉ. Hồ sơ rõ ràng,
            chính xác và có thể xác minh sẽ có giá trị hơn.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SkillsLanguagesStep;