import type { CandidateLanguageItem } from "@/features/candidate/types/onboarding.types";
import { getCertificateTypesForLanguage } from "@/features/candidate/utils/language.constants";

import sharedStyles from "../SkillsLanguagesShared.module.css";
import styles from "./LanguagesSection.module.css";
import CertificateCard from "./CertificateCard";
import type { LanguagesEditor } from "./useLanguagesEditor";

interface CertificateListProps {
  language: CandidateLanguageItem;
  editor: LanguagesEditor;
}

const CertificateList = ({ language, editor }: CertificateListProps) => {
  const certificateTypes = getCertificateTypesForLanguage(
    language.languageCode,
  );

  return (
    <>
      <div className={styles.certificateHeader}>
        <div className={sharedStyles.sectionTitle}>
          <span>CHỨNG CHỈ</span>
          <h5>Chứng chỉ ngôn ngữ</h5>
        </div>

        {language.languageCode && (
          <button
            type="button"
            className={styles.addCertificateButton}
            onClick={() => editor.addCertificate(language.id)}
          >
            + Thêm chứng chỉ
          </button>
        )}
      </div>

      {!language.languageCode ? (
        <div className={styles.certificateEmpty}>
          Chọn ngôn ngữ trước để thêm chứng chỉ phù hợp.
        </div>
      ) : language.certificates.length === 0 ? (
        <div className={styles.certificateEmpty}>
          Không bắt buộc phải có chứng chỉ. Nếu có, bạn có thể thêm nhiều
          chứng chỉ cho cùng một ngôn ngữ.
        </div>
      ) : (
        <div className={styles.certificateList}>
          {language.certificates.map((certificate) => (
            <CertificateCard
              key={certificate.id}
              languageId={language.id}
              certificate={certificate}
              certificateTypes={certificateTypes}
              editor={editor}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default CertificateList;
