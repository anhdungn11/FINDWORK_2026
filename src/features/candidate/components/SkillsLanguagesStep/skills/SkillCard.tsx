import type { CandidateSkillItem } from "@/features/candidate/types/onboarding.types";
import {
  OTHER_SKILL_CODE,
  getSkillCategoryName,
  getSkillName,
} from "@/features/candidate/utils/skill.constants";

import sharedStyles from "../SkillsLanguagesShared.module.css";
import styles from "./SkillsSection.module.css";
import SkillEditor from "./SkillEditor";

interface SkillCardProps {
  skill: CandidateSkillItem;
  index: number;
  isEditing: boolean;
  searchValue: string;
  error: string;
  onEdit: (skill: CandidateSkillItem) => void;
  onRemove: (id: string) => void;
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

const getSkillLevelLabel = (
  level: CandidateSkillItem["level"],
) => {
  const labels: Record<
    Exclude<CandidateSkillItem["level"], "">,
    string
  > = {
    beginner: "Cơ bản",
    intermediate: "Trung bình",
    advanced: "Khá",
    proficient: "Thành thạo",
    expert: "Chuyên gia",
  };

  return level
    ? labels[level]
    : "Chưa cập nhật mức độ";
};

const SkillCard = ({
  skill,
  index,
  isEditing,
  searchValue,
  error,
  onEdit,
  onRemove,
  onUpdate,
  onSearchChange,
  onSelectCatalog,
  onSelectCustom,
  onToggleHighlighted,
  onComplete,
}: SkillCardProps) => {
  const skillName = getSkillName(
    skill.skillCode,
    skill.customSkillName,
  );

  const categoryName = getSkillCategoryName(
    skill.skillCode,
  );

  return (
    <article className={sharedStyles.itemCard}>
      <div className={sharedStyles.cardHeader}>
        <div>
          <span className={sharedStyles.itemNumber}>
            KỸ NĂNG {index + 1}
          </span>

          <h4>
            {skill.skillCode
              ? skillName
              : "Kỹ năng mới"}
          </h4>

          {!isEditing && (
            <div className={sharedStyles.summary}>
              <p>
                {categoryName ||
                  (skill.skillCode === OTHER_SKILL_CODE
                    ? "Kỹ năng tùy chỉnh"
                    : "Chưa phân loại")}
                {" · "}
                {getSkillLevelLabel(skill.level)}
              </p>

              {skill.yearsOfExperience && (
                <span>
                  {skill.yearsOfExperience} năm kinh nghiệm
                </span>
              )}

              {skill.isHighlighted && (
                <span className={styles.highlightBadge}>
                  ★ Kỹ năng nổi bật
                </span>
              )}
            </div>
          )}
        </div>

        <div className={sharedStyles.cardActions}>
          {!isEditing && (
            <button
              type="button"
              className={sharedStyles.editButton}
              onClick={() =>
                onEdit(skill)
              }
            >
              Sửa
            </button>
          )}

          <button
            type="button"
            className={sharedStyles.removeButton}
            onClick={() =>
              onRemove(skill.id)
            }
          >
            Xóa
          </button>
        </div>
      </div>

      {isEditing && (
        <SkillEditor
          skill={skill}
          searchValue={searchValue}
          error={error}
          onUpdate={onUpdate}
          onSearchChange={onSearchChange}
          onSelectCatalog={onSelectCatalog}
          onSelectCustom={onSelectCustom}
          onToggleHighlighted={onToggleHighlighted}
          onComplete={onComplete}
        />
      )}
    </article>
  );
};

export default SkillCard;
