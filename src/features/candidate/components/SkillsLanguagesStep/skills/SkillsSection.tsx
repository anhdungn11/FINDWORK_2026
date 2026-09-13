import type { CandidateSkillItem } from "@/features/candidate/types/onboarding.types";

import sharedStyles from "../SkillsLanguagesShared.module.css";

import SkillCard from "./SkillCard";
import useSkillsEditor from "./useSkillsEditor";

interface SkillsSectionProps {
  skills: CandidateSkillItem[];
  onSkillsChange: (
    value: CandidateSkillItem[],
  ) => void;
}

const SkillsSection = ({
  skills,
  onSkillsChange,
}: SkillsSectionProps) => {
  const {
    editingSkillId,
    skillError,
    addSkill,
    updateSkill,
    removeSkill,
    handleSkillSearchChange,
    selectCatalogSkill,
    selectCustomSkill,
    completeSkill,
    editSkill,
    toggleHighlighted,
    getSkillSearchValue,
  } = useSkillsEditor(
    skills,
    onSkillsChange,
  );

  return (
    <section>
      <div className={sharedStyles.sectionIntro}>
        <div>
          <span className={sharedStyles.eyebrow}>
            KỸ NĂNG
          </span>

          <h3>Năng lực nghề nghiệp</h3>

          <p>
            Tìm và chọn kỹ năng từ danh mục chuẩn. Nếu kỹ
            năng của bạn chưa có, bạn vẫn có thể thêm kỹ
            năng khác.
          </p>
        </div>

        {skills.length > 0 && (
          <button
            type="button"
            className={sharedStyles.addButton}
            onClick={addSkill}
          >
            <span>+</span>
            Thêm kỹ năng
          </button>
        )}
      </div>

      {skills.length === 0 ? (
        <div className={sharedStyles.emptyState}>
          <div className={sharedStyles.emptyIcon}>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 3 14.3 8.1 20 9l-4.1 4 1 5.7L12 16l-4.9 2.7 1-5.7L4 9l5.7-.9L12 3Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h4>Chưa có kỹ năng</h4>

          <p>
            Thêm kỹ năng chuyên môn, công cụ và kỹ năng mềm
            phản ánh đúng năng lực của bạn.
          </p>

          <button
            type="button"
            onClick={addSkill}
          >
            + Thêm kỹ năng đầu tiên
          </button>
        </div>
      ) : (
        <div className={sharedStyles.itemList}>
          {skills.map((skill, index) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              index={index}
              isEditing={
                editingSkillId === skill.id
              }
              searchValue={
                getSkillSearchValue(skill)
              }
              error={
                editingSkillId === skill.id
                  ? skillError
                  : ""
              }
              onEdit={editSkill}
              onRemove={removeSkill}
              onUpdate={updateSkill}
              onSearchChange={
                handleSkillSearchChange
              }
              onSelectCatalog={
                selectCatalogSkill
              }
              onSelectCustom={
                selectCustomSkill
              }
              onToggleHighlighted={
                toggleHighlighted
              }
              onComplete={completeSkill}
            />
          ))}

          <button
            type="button"
            className={sharedStyles.addAnotherButton}
            onClick={addSkill}
          >
            <span>+</span>
            Thêm kỹ năng khác
          </button>
        </div>
      )}
    </section>
  );
};

export default SkillsSection;
