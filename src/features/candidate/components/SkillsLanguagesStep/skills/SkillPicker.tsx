import type { CandidateSkillItem } from "@/features/candidate/types/onboarding.types";
import {
  getSkillCategoryName,
  getSkillName,
  searchSkills,
} from "@/features/candidate/utils/skill.constants";

import sharedStyles from "../SkillsLanguagesShared.module.css";
import styles from "./SkillsSection.module.css";

interface SkillPickerProps {
  skill: CandidateSkillItem;
  searchValue: string;
  onSearchChange: (skill: CandidateSkillItem, value: string) => void;
  onSelectCatalog: (
    skillId: string,
    skillCode: string,
    skillName: string,
  ) => void;
  onSelectCustom: (
    skillId: string,
    customSkillName: string,
  ) => void;
}

const SkillPicker = ({
  skill,
  searchValue,
  onSearchChange,
  onSelectCatalog,
  onSelectCustom,
}: SkillPickerProps) => {
  const skillName = getSkillName(
    skill.skillCode,
    skill.customSkillName,
  );

  const categoryName = getSkillCategoryName(
    skill.skillCode,
  );

  const suggestions = !skill.skillCode
    ? searchSkills(searchValue, 8)
    : [];

  return (
    <div className={`${sharedStyles.field} ${sharedStyles.fullWidth}`}>
      <label>
        Kỹ năng
        <span>*</span>
      </label>

      <div className={styles.skillPicker}>
        <input
          type="text"
          autoComplete="off"
          value={searchValue}
          placeholder="Tìm JavaScript, Excel, Sales, AutoCAD..."
          onChange={(event) =>
            onSearchChange(
              skill,
              event.target.value,
            )
          }
        />

        {!skill.skillCode && (
          <div className={styles.skillSuggestions}>
            {suggestions.length > 0 ? (
              suggestions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={styles.skillSuggestion}
                  onClick={() =>
                    onSelectCatalog(
                      skill.id,
                      option.code,
                      option.name,
                    )
                  }
                >
                  <span>{option.name}</span>

                  <small>
                    {getSkillCategoryName(
                      option.code,
                    )}
                  </small>
                </button>
              ))
            ) : (
              <div className={styles.skillNoResult}>
                Không tìm thấy kỹ năng phù hợp trong danh mục.
              </div>
            )}

            {searchValue.trim() && (
              <button
                type="button"
                className={styles.customSkillOption}
                onClick={() =>
                  onSelectCustom(
                    skill.id,
                    searchValue,
                  )
                }
              >
                <span>
                  + Dùng “{searchValue.trim()}” làm kỹ năng khác
                </span>

                <small>
                  Chỉ sử dụng khi không tìm thấy kỹ năng phù hợp
                  trong danh mục chuẩn.
                </small>
              </button>
            )}
          </div>
        )}
      </div>

      {skill.skillCode && (
        <div className={styles.selectedSkillMeta}>
          <div>
            <strong>
              Đã chọn: {skillName}
            </strong>

            <span>
              {categoryName || "Kỹ năng tùy chỉnh"}
            </span>
          </div>

          <button
            type="button"
            className={styles.changeSkillButton}
            onClick={() =>
              onSearchChange(skill, "")
            }
          >
            Chọn lại
          </button>
        </div>
      )}

      <small>
        Gõ tên kỹ năng để tìm trong danh mục. Có thể tìm bằng
        tên hoặc tên gọi khác như JS, Excel, CSKH...
      </small>
    </div>
  );
};

export default SkillPicker;
