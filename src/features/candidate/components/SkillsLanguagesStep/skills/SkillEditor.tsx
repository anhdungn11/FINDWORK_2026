import type { CandidateSkillItem } from "@/features/candidate/types/onboarding.types";

import sharedStyles from "../SkillsLanguagesShared.module.css";
import styles from "./SkillsSection.module.css";
import SkillPicker from "./SkillPicker";

interface SkillEditorProps {
  skill: CandidateSkillItem;
  searchValue: string;
  error: string;
  onUpdate: <Key extends keyof CandidateSkillItem>(
    id: string,
    key: Key,
    value: CandidateSkillItem[Key],
  ) => void;
  onSearchChange: (
    skill: CandidateSkillItem,
    value: string,
  ) => void;
  onSelectCatalog: (
    skillId: string,
    skillCode: string,
    skillName: string,
  ) => void;
  onSelectCustom: (
    skillId: string,
    customSkillName: string,
  ) => void;
  onToggleHighlighted: (
    skill: CandidateSkillItem,
  ) => void;
  onComplete: (
    skill: CandidateSkillItem,
  ) => void;
}

const SkillEditor = ({
  skill,
  searchValue,
  error,
  onUpdate,
  onSearchChange,
  onSelectCatalog,
  onSelectCustom,
  onToggleHighlighted,
  onComplete,
}: SkillEditorProps) => {
  return (
    <div className={sharedStyles.editArea}>
      <div className={sharedStyles.grid}>
        <SkillPicker
          skill={skill}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onSelectCatalog={onSelectCatalog}
          onSelectCustom={onSelectCustom}
        />

        <div className={sharedStyles.field}>
          <label>
            Mức độ
            <span>*</span>
          </label>

          <select
            value={skill.level}
            onChange={(event) =>
              onUpdate(
                skill.id,
                "level",
                event.target.value as CandidateSkillItem["level"],
              )
            }
          >
            <option value="">Chọn mức độ</option>
            <option value="beginner">Cơ bản</option>
            <option value="intermediate">Trung bình</option>
            <option value="advanced">Khá</option>
            <option value="proficient">Thành thạo</option>
            <option value="expert">Chuyên gia</option>
          </select>
        </div>

        <div className={sharedStyles.field}>
          <label>Số năm kinh nghiệm</label>

          <input
            type="number"
            min="0"
            max="60"
            step="0.5"
            value={skill.yearsOfExperience}
            placeholder="Ví dụ: 2"
            onChange={(event) =>
              onUpdate(
                skill.id,
                "yearsOfExperience",
                event.target.value,
              )
            }
          />

          <small>
            Có thể nhập số lẻ, ví dụ 0.5 hoặc 1.5 năm.
          </small>
        </div>
      </div>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={skill.isHighlighted}
          onChange={() =>
            onToggleHighlighted(skill)
          }
        />

        <span>
          Đánh dấu đây là kỹ năng nổi bật
        </span>
      </label>

      <small className={styles.helperText}>
        Có thể chọn tối đa 5 kỹ năng nổi bật để ưu tiên hiển
        thị trong hồ sơ.
      </small>

      {error && (
        <div className={sharedStyles.validationNotice}>
          {error}
        </div>
      )}

      <div className={sharedStyles.editActions}>
        <button
          type="button"
          className={sharedStyles.doneButton}
          onClick={() =>
            onComplete(skill)
          }
        >
          Hoàn tất kỹ năng
        </button>
      </div>
    </div>
  );
};

export default SkillEditor;
