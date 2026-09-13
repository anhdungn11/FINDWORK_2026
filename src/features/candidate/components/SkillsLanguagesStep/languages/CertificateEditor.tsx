import type { LanguageCertificateItem } from "@/features/candidate/types/onboarding.types";
import type { LanguageCertificateType } from "@/features/candidate/utils/language.constants";
import { getCertificateTypeByCode } from "@/features/candidate/utils/language.constants";

import sharedStyles from "../SkillsLanguagesShared.module.css";
import styles from "./LanguagesSection.module.css";
import type { LanguagesEditor } from "./useLanguagesEditor";

interface CertificateEditorProps {
  languageId: string;
  certificate: LanguageCertificateItem;
  certificateTypes: LanguageCertificateType[];
  editor: LanguagesEditor;
}

const CertificateEditor = ({
  languageId,
  certificate,
  certificateTypes,
  editor,
}: CertificateEditorProps) => {
  const definition = getCertificateTypeByCode(certificate.certificateTypeCode);

  return (
    <div className={styles.certificateForm}>
      <div className={sharedStyles.grid}>
        <div className={sharedStyles.field}>
          <label>
            Loại chứng chỉ <span>*</span>
          </label>
          <select
            value={certificate.certificateTypeCode}
            onChange={(event) =>
              editor.handleCertificateTypeChange(
                languageId,
                certificate,
                event.target.value,
              )
            }
          >
            <option value="">Chọn chứng chỉ</option>
            {certificateTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.label}
              </option>
            ))}
            <option value="other">Khác...</option>
          </select>
        </div>

        {certificate.certificateTypeCode === "other" && (
          <div className={sharedStyles.field}>
            <label>
              Tên chứng chỉ <span>*</span>
            </label>
            <input
              type="text"
              value={certificate.customCertificateName}
              placeholder="Nhập tên chứng chỉ"
              onChange={(event) =>
                editor.updateCertificate(
                  languageId,
                  certificate.id,
                  "customCertificateName",
                  event.target.value,
                )
              }
            />
          </div>
        )}
      </div>

      {certificate.certificateTypeCode && (
        <>
          <div className={styles.certificateScoreSection}>
            {(definition?.supportsLevel ||
              certificate.certificateTypeCode === "other") && (
              <div className={sharedStyles.field}>
                <label>Cấp độ</label>
                {definition?.levelOptions && definition.levelOptions.length > 0 ? (
                  <select
                    value={certificate.level}
                    onChange={(event) =>
                      editor.updateCertificate(
                        languageId,
                        certificate.id,
                        "level",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">Chọn cấp độ</option>
                    {definition.levelOptions.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={certificate.level}
                    placeholder="Ví dụ: B2, N3, Level 4..."
                    onChange={(event) =>
                      editor.updateCertificate(
                        languageId,
                        certificate.id,
                        "level",
                        event.target.value,
                      )
                    }
                  />
                )}
              </div>
            )}

            {(definition?.supportsOverallScore ||
              certificate.certificateTypeCode === "other") && (
              <div className={sharedStyles.field}>
                <label>Điểm tổng / Overall</label>
                <input
                  type="text"
                  value={certificate.overallScore}
                  placeholder="Ví dụ: 850, 6.5, 95..."
                  onChange={(event) =>
                    editor.updateCertificate(
                      languageId,
                      certificate.id,
                      "overallScore",
                      event.target.value,
                    )
                  }
                />
              </div>
            )}
          </div>

          {definition && definition.scoreFields.length > 0 && (
            <>
              <div className={styles.scoreHeading}>Điểm thành phần</div>
              <div className={styles.languageSkillsGrid}>
                {definition.scoreFields.map((field) => {
                  const score = certificate.scores.find(
                    (item) => item.componentCode === field.code,
                  );

                  return (
                    <div key={field.code} className={sharedStyles.field}>
                      <label>{field.label}</label>
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={score?.value ?? ""}
                        placeholder="Điểm"
                        onChange={(event) =>
                          editor.updateCertificateScore(
                            languageId,
                            certificate.id,
                            field.code,
                            event.target.value,
                          )
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <div className={sharedStyles.sectionDivider} />

      <div className={sharedStyles.grid}>
        <div className={sharedStyles.field}>
          <label>Ngày cấp / Ngày thi</label>
          <input
            type="date"
            value={certificate.issuedDate}
            onChange={(event) =>
              editor.updateCertificate(
                languageId,
                certificate.id,
                "issuedDate",
                event.target.value,
              )
            }
          />
        </div>

        <div className={sharedStyles.field}>
          <label>Ngày hết hạn</label>
          <input
            type="date"
            value={certificate.expiryDate}
            onChange={(event) =>
              editor.updateCertificate(
                languageId,
                certificate.id,
                "expiryDate",
                event.target.value,
              )
            }
          />
          <small>Để trống nếu không áp dụng.</small>
        </div>

        <div className={sharedStyles.field}>
          <label>Đơn vị cấp</label>
          <input
            type="text"
            value={certificate.issuer}
            placeholder="Ví dụ: ETS, British Council..."
            onChange={(event) =>
              editor.updateCertificate(
                languageId,
                certificate.id,
                "issuer",
                event.target.value,
              )
            }
          />
        </div>

        <div className={sharedStyles.field}>
          <label>Mã chứng chỉ</label>
          <input
            type="text"
            value={certificate.credentialId}
            placeholder="Credential ID"
            onChange={(event) =>
              editor.updateCertificate(
                languageId,
                certificate.id,
                "credentialId",
                event.target.value,
              )
            }
          />
        </div>

        <div className={`${sharedStyles.field} ${sharedStyles.fullWidth}`}>
          <label>Link xác minh</label>
          <input
            type="url"
            value={certificate.verificationUrl}
            placeholder="https://..."
            onChange={(event) =>
              editor.updateCertificate(
                languageId,
                certificate.id,
                "verificationUrl",
                event.target.value,
              )
            }
          />
        </div>
      </div>

      {editor.certificateError && (
        <div className={sharedStyles.validationNotice}>
          {editor.certificateError}
        </div>
      )}

      <div className={sharedStyles.editActions}>
        <button
          type="button"
          className={sharedStyles.doneButton}
          onClick={() => editor.completeCertificate(certificate)}
        >
          Hoàn tất chứng chỉ
        </button>
      </div>
    </div>
  );
};

export default CertificateEditor;
