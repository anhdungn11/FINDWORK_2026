import type { CandidateLanguageItem } from "@/features/candidate/types/onboarding.types";

import sharedStyles from "../SkillsLanguagesShared.module.css";

import LanguageCard from "./LanguageCard";
import useLanguagesEditor from "./useLanguagesEditor";

interface LanguagesSectionProps {
  languages: CandidateLanguageItem[];
  onLanguagesChange: (value: CandidateLanguageItem[]) => void;
}

const LanguagesSection = ({
  languages,
  onLanguagesChange,
}: LanguagesSectionProps) => {
  const editor = useLanguagesEditor(languages, onLanguagesChange);

  return (
    <section>
      <div className={sharedStyles.sectionIntro}>
        <div>
          <span className={sharedStyles.eyebrow}>NGÔN NGỮ</span>
          <h3>Khả năng ngôn ngữ</h3>
          <p>
            Thêm ngôn ngữ bạn có thể sử dụng, trình độ thực tế và các chứng
            chỉ liên quan nếu có.
          </p>
        </div>

        {languages.length > 0 && (
          <button
            type="button"
            className={sharedStyles.addButton}
            onClick={editor.addLanguage}
          >
            <span>+</span>
            Thêm ngôn ngữ
          </button>
        )}
      </div>

      {languages.length === 0 ? (
        <div className={sharedStyles.emptyState}>
          <div className={sharedStyles.emptyIcon}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 5h9M9.5 3v2c0 4-2.4 7.4-6 9M6 9c1.5 2.2 3.5 4 6 5M14 20l3.5-8 3.5 8M15.4 17h4.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h4>Chưa có ngôn ngữ</h4>
          <p>
            Chọn ngôn ngữ từ danh sách chuẩn hoặc chọn Khác nếu ngôn ngữ bạn
            sử dụng chưa có trong danh mục.
          </p>
          <button type="button" onClick={editor.addLanguage}>
            + Thêm ngôn ngữ đầu tiên
          </button>
        </div>
      ) : (
        <div className={sharedStyles.itemList}>
          {languages.map((language, index) => (
            <LanguageCard
              key={language.id}
              language={language}
              index={index}
              editor={editor}
            />
          ))}

          <button
            type="button"
            className={sharedStyles.addAnotherButton}
            onClick={editor.addLanguage}
          >
            <span>+</span>
            Thêm ngôn ngữ khác
          </button>
        </div>
      )}
    </section>
  );
};

export default LanguagesSection;
