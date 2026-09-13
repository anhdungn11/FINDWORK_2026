import type {
  CandidateLanguageItem,
  LanguageProficiency,
} from "@/features/candidate/types/onboarding.types";
import { getLanguageLabel } from "@/features/candidate/utils/language.constants";

import sharedStyles from "../SkillsLanguagesShared.module.css";

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
    <article className={sharedStyles.itemCard}>
      <div className={sharedStyles.cardHeader}>
        <div>
          <span className={sharedStyles.itemNumber}>NGÔN NGỮ {index + 1}</span>
          <h4>
            {getLanguageLabel(
              language.languageCode,
              language.customLanguageName,
            )}
          </h4>

          {!isEditing && (
            <div className={sharedStyles.summary}>
              <p>{getLanguageLevelLabel(language.overallLevel)}</p>
              <span>{language.certificates.length} chứng chỉ</span>
            </div>
          )}
        </div>

        <div className={sharedStyles.cardActions}>
          {!isEditing && (
            <button
              type="button"
              className={sharedStyles.editButton}
              onClick={() => editor.editLanguage(language.id)}
            >
              Sửa
            </button>
          )}

          <button
            type="button"
            className={sharedStyles.removeButton}
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
