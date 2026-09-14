import type {
  CandidateLanguageItem,
  LanguageProficiency,
} from "@/features/candidate/types/onboarding.types";
import { LANGUAGE_OPTIONS } from "@/features/candidate/utils/language.constants";

import formStyles from "../SkillsLanguagesForm.module.css";
import CertificateList from "./CertificateList";
import LanguageLevelFields, {
  LanguageLevelOptions,
} from "./LanguageLevelFields";
import type { LanguagesEditor } from "./useLanguagesEditor";

interface LanguageEditorProps {
  language: CandidateLanguageItem;
  editor: LanguagesEditor;
}

const LanguageEditor = ({ language, editor }: LanguageEditorProps) => {
  return (
    <div className={formStyles.editArea}>
      <div className={formStyles.sectionTitle}>
        <span>THÔNG TIN NGÔN NGỮ</span>
        <h5>Ngôn ngữ & trình độ</h5>
      </div>

      <div className={formStyles.grid}>
        <div className={formStyles.field}>
          <label>
            Ngôn ngữ <span>*</span>
          </label>
          <select
            value={language.languageCode}
            onChange={(event) =>
              editor.handleLanguageCodeChange(language, event.target.value)
            }
          >
            <option value="">Chọn ngôn ngữ</option>
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          <small>Nếu không tìm thấy, chọn “Khác...”.</small>
        </div>

        {language.languageCode === "other" && (
          <div className={formStyles.field}>
            <label>
              Tên ngôn ngữ <span>*</span>
            </label>
            <input
              type="text"
              value={language.customLanguageName}
              placeholder="Ví dụ: Tiếng Ba Tư"
              onChange={(event) =>
                editor.updateLanguage(
                  language.id,
                  "customLanguageName",
                  event.target.value,
                )
              }
            />
          </div>
        )}

        <div className={formStyles.field}>
          <label>
            Trình độ tổng quát <span>*</span>
          </label>
          <select
            value={language.overallLevel}
            onChange={(event) =>
              editor.updateLanguage(
                language.id,
                "overallLevel",
                event.target.value as LanguageProficiency,
              )
            }
          >
            <LanguageLevelOptions />
          </select>
        </div>
      </div>

      <div className={formStyles.sectionDivider} />

      <div className={formStyles.sectionTitle}>
        <span>KỸ NĂNG NGÔN NGỮ</span>
        <h5>Nghe · Nói · Đọc · Viết</h5>
      </div>

      <LanguageLevelFields
        listeningLevel={language.listeningLevel}
        speakingLevel={language.speakingLevel}
        readingLevel={language.readingLevel}
        writingLevel={language.writingLevel}
        onListeningChange={(value) =>
          editor.updateLanguage(language.id, "listeningLevel", value)
        }
        onSpeakingChange={(value) =>
          editor.updateLanguage(language.id, "speakingLevel", value)
        }
        onReadingChange={(value) =>
          editor.updateLanguage(language.id, "readingLevel", value)
        }
        onWritingChange={(value) =>
          editor.updateLanguage(language.id, "writingLevel", value)
        }
      />

      <div className={formStyles.sectionDivider} />

      <CertificateList language={language} editor={editor} />

      {editor.languageError && (
        <div className={formStyles.validationNotice}>{editor.languageError}</div>
      )}

      <div className={formStyles.editActions}>
        <button
          type="button"
          className={formStyles.doneButton}
          onClick={() => editor.completeLanguage(language)}
        >
          Hoàn tất ngôn ngữ
        </button>
      </div>
    </div>
  );
};

export default LanguageEditor;
