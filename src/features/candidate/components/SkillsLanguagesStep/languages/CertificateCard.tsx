import type { LanguageCertificateItem } from "@/features/candidate/types/onboarding.types";
import type { LanguageCertificateType } from "@/features/candidate/utils/language.constants";
import {
  getCertificateLabel,
  getCertificateTypeByCode,
} from "@/features/candidate/utils/language.constants";

import sharedStyles from "../SkillsLanguagesShared.module.css";
import styles from "./LanguagesSection.module.css";
import CertificateEditor from "./CertificateEditor";
import type { LanguagesEditor } from "./useLanguagesEditor";

interface CertificateCardProps {
  languageId: string;
  certificate: LanguageCertificateItem;
  certificateTypes: LanguageCertificateType[];
  editor: LanguagesEditor;
}

const CertificateCard = ({
  languageId,
  certificate,
  certificateTypes,
  editor,
}: CertificateCardProps) => {
  const isEditing = editor.isCertificateEditing(languageId, certificate.id);
  const definition = getCertificateTypeByCode(certificate.certificateTypeCode);

  return (
    <div className={styles.certificateCard}>
      <div className={styles.certificateCardHeader}>
        <div>
          <strong>
            {getCertificateLabel(
              certificate.certificateTypeCode,
              certificate.customCertificateName,
            )}
          </strong>

          {!isEditing && (
            <div className={styles.certificateSummary}>
              {certificate.level && <span>Cấp độ: {certificate.level}</span>}
              {certificate.overallScore && (
                <span>Điểm: {certificate.overallScore}</span>
              )}
              {certificate.scores
                .filter((score) => score.value)
                .map((score) => {
                  const field = definition?.scoreFields.find(
                    (item) => item.code === score.componentCode,
                  );

                  return (
                    <span key={score.id}>
                      {field?.label ?? score.componentCode}: {score.value}
                    </span>
                  );
                })}
            </div>
          )}
        </div>

        <div className={sharedStyles.cardActions}>
          {!isEditing && (
            <button
              type="button"
              className={sharedStyles.editButton}
              onClick={() => editor.editCertificate(languageId, certificate.id)}
            >
              Sửa
            </button>
          )}

          <button
            type="button"
            className={sharedStyles.removeButton}
            onClick={() => editor.removeCertificate(languageId, certificate.id)}
          >
            Xóa
          </button>
        </div>
      </div>

      {isEditing && (
        <CertificateEditor
          languageId={languageId}
          certificate={certificate}
          certificateTypes={certificateTypes}
          editor={editor}
        />
      )}
    </div>
  );
};

export default CertificateCard;
