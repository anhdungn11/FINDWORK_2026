import type { LanguageProficiency } from "@/features/candidate/types/onboarding.types";

import sharedStyles from "../SkillsLanguagesShared.module.css";
import styles from "./LanguagesSection.module.css";

interface LanguageLevelFieldProps {
  label: string;
  value: LanguageProficiency;
  onChange: (value: LanguageProficiency) => void;
}

export const LanguageLevelOptions = () => (
  <>
    <option value="">Chọn trình độ</option>
    <option value="basic">Cơ bản</option>
    <option value="conversational">Giao tiếp</option>
    <option value="professional">Làm việc chuyên nghiệp</option>
    <option value="fluent">Thành thạo</option>
    <option value="native">Bản ngữ</option>
  </>
);

const LanguageLevelField = ({
  label,
  value,
  onChange,
}: LanguageLevelFieldProps) => (
  <div className={sharedStyles.field}>
    <label>{label}</label>
    <select
      value={value}
      onChange={(event) =>
        onChange(event.target.value as LanguageProficiency)
      }
    >
      <LanguageLevelOptions />
    </select>
  </div>
);

interface LanguageLevelFieldsProps {
  listeningLevel: LanguageProficiency;
  speakingLevel: LanguageProficiency;
  readingLevel: LanguageProficiency;
  writingLevel: LanguageProficiency;
  onListeningChange: (value: LanguageProficiency) => void;
  onSpeakingChange: (value: LanguageProficiency) => void;
  onReadingChange: (value: LanguageProficiency) => void;
  onWritingChange: (value: LanguageProficiency) => void;
}

const LanguageLevelFields = ({
  listeningLevel,
  speakingLevel,
  readingLevel,
  writingLevel,
  onListeningChange,
  onSpeakingChange,
  onReadingChange,
  onWritingChange,
}: LanguageLevelFieldsProps) => (
  <div className={styles.languageSkillsGrid}>
    <LanguageLevelField
      label="Nghe"
      value={listeningLevel}
      onChange={onListeningChange}
    />
    <LanguageLevelField
      label="Nói"
      value={speakingLevel}
      onChange={onSpeakingChange}
    />
    <LanguageLevelField
      label="Đọc"
      value={readingLevel}
      onChange={onReadingChange}
    />
    <LanguageLevelField
      label="Viết"
      value={writingLevel}
      onChange={onWritingChange}
    />
  </div>
);

export default LanguageLevelFields;
