import type {
  CandidateLanguageItem,
  LanguageProficiency,
} from "@/features/candidate/types/onboarding.types";
import { LANGUAGE_OPTIONS } from "@/features/candidate/utils/language.constants";

import sharedStyles from "../SkillsLanguagesShared.module.css";

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
    <div className={sharedStyles.editArea}>
      <div className={sharedStyles.sectionTitle}>
        <span>THÔNG TIN NGÔN NGỮ</span>
        <h5>Ngôn ngữ & trình độ</h5>
      </div>

      <div className={sharedStyles.grid}>
        <div className={sharedStyles.field}>
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
          <div className={sharedStyles.field}>
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

        <div className={sharedStyles.field}>
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

      <div className={sharedStyles.sectionDivider} />

      <div className={sharedStyles.sectionTitle}>
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

      <div className={sharedStyles.sectionDivider} />

      <CertificateList language={language} editor={editor} />

      {editor.languageError && (
        <div className={sharedStyles.validationNotice}>{editor.languageError}</div>
      )}

      <div className={sharedStyles.editActions}>
        <button
          type="button"
          className={sharedStyles.doneButton}
          onClick={() => editor.completeLanguage(language)}
        >
          Hoàn tất ngôn ngữ
        </button>
      </div>
    </div>
  );
};

export default LanguageEditor;
