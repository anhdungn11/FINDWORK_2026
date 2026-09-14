import type {
  CandidateLanguageItem,
  LanguageProficiency,
} from "@/features/candidate/types/onboarding.types";
import { getLanguageLabel } from "@/features/candidate/utils/language.constants";

import cardStyles from "../SkillsLanguagesCard.module.css";
import LanguageEditor from "./LanguageEditor";
import type { LanguagesEditor } from "./useLanguagesEditor";

const getLanguageLevelLabel = (level: LanguageProficiency) => {
  const labels: Record<Exclude<LanguageProficiency, "">, string> = {
    basic: "Cơ bản",
    conversational: "Giao tiếp",
    professional: "Làm việc chuyên nghiệp",
    fluent: "Thành thạo",
    native: "Bản ngữ",
  };

  return level ? labels[level] : "Chưa cập nhật trình độ";
};

interface LanguageCardProps {
  language: CandidateLanguageItem;
  index: number;
  editor: LanguagesEditor;
}

const LanguageCard = ({ language, index, editor }: LanguageCardProps) => {
  const isEditing = editor.editingLanguageId === language.id;

  return (
    <article className={cardStyles.itemCard}>
      <div className={cardStyles.cardHeader}>
        <div>
          <span className={cardStyles.itemNumber}>NGÔN NGỮ {index + 1}</span>
          <h4>
            {getLanguageLabel(
              language.languageCode,
              language.customLanguageName,
            )}
          </h4>

          {!isEditing && (
            <div className={cardStyles.summary}>
              <p>{getLanguageLevelLabel(language.overallLevel)}</p>
              <span>{language.certificates.length} chứng chỉ</span>
            </div>
          )}
        </div>

        <div className={cardStyles.cardActions}>
          {!isEditing && (
            <button
              type="button"
              className={cardStyles.editButton}
              onClick={() => editor.editLanguage(language.id)}
            >
              Sửa
            </button>
          )}

          <button
            type="button"
            className={cardStyles.removeButton}
            onClick={() => editor.removeLanguage(language.id)}
          >
            Xóa
          </button>
        </div>
      </div>

      {isEditing && <LanguageEditor language={language} editor={editor} />}
    </article>
  );
};

export default LanguageCard;
