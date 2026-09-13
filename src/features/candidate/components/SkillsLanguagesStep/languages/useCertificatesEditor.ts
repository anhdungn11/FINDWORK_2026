import { useState } from "react";

import type {
  CandidateLanguageItem,
  LanguageCertificateItem,
  LanguageCertificateScoreItem,
} from "@/features/candidate/types/onboarding.types";

import { getCertificateTypeByCode } from "@/features/candidate/utils/language.constants";

export interface EditingCertificate {
  languageId: string;
  certificateId: string;
}

const createCertificate = (): LanguageCertificateItem => ({
  id: crypto.randomUUID(),
  certificateTypeCode: "",
  customCertificateName: "",
  level: "",
  overallScore: "",
  scores: [],
  issuedDate: "",
  expiryDate: "",
  issuer: "",
  credentialId: "",
  verificationUrl: "",
});

const useCertificatesEditor = (
  languages: CandidateLanguageItem[],
  onLanguagesChange: (value: CandidateLanguageItem[]) => void,
) => {
  const [editingCertificate, setEditingCertificate] =
    useState<EditingCertificate | null>(null);

  const [certificateError, setCertificateError] = useState("");

  const resetCertificateEditor = () => {
    setEditingCertificate(null);
    setCertificateError("");
  };

  const addCertificate = (languageId: string) => {
    const certificate = createCertificate();

    onLanguagesChange(
      languages.map((language) =>
        language.id === languageId
          ? {
              ...language,
              certificates: [
                ...language.certificates,
                certificate,
              ],
            }
          : language,
      ),
    );

    setEditingCertificate({
      languageId,
      certificateId: certificate.id,
    });

    setCertificateError("");
  };

  const updateCertificate = <
    Key extends keyof LanguageCertificateItem,
  >(
    languageId: string,
    certificateId: string,
    key: Key,
    value: LanguageCertificateItem[Key],
  ) => {
    onLanguagesChange(
      languages.map((language) =>
        language.id === languageId
          ? {
              ...language,
              certificates:
                language.certificates.map(
                  (certificate) =>
                    certificate.id ===
                    certificateId
                      ? {
                          ...certificate,
                          [key]: value,
                        }
                      : certificate,
                ),
            }
          : language,
      ),
    );
  };

  const removeCertificate = (
    languageId: string,
    certificateId: string,
  ) => {
    onLanguagesChange(
      languages.map((language) =>
        language.id === languageId
          ? {
              ...language,
              certificates:
                language.certificates.filter(
                  (certificate) =>
                    certificate.id !==
                    certificateId,
                ),
            }
          : language,
      ),
    );

    if (
      editingCertificate?.languageId ===
        languageId &&
      editingCertificate.certificateId ===
        certificateId
    ) {
      setEditingCertificate(null);
    }

    setCertificateError("");
  };

  const editCertificate = (
    languageId: string,
    certificateId: string,
  ) => {
    setEditingCertificate({
      languageId,
      certificateId,
    });

    setCertificateError("");
  };

  const handleCertificateTypeChange = (
    languageId: string,
    certificate: LanguageCertificateItem,
    certificateTypeCode: string,
  ) => {
    const definition =
      getCertificateTypeByCode(
        certificateTypeCode,
      );

    const oldScores = new Map(
      certificate.scores.map((score) => [
        score.componentCode,
        score.value,
      ]),
    );

    const scores: LanguageCertificateScoreItem[] =
      definition
        ? definition.scoreFields.map(
            (field) => ({
              id: crypto.randomUUID(),

              componentCode:
                field.code,

              value:
                oldScores.get(
                  field.code,
                ) ?? "",
            }),
          )
        : [];

    const updatedCertificate: LanguageCertificateItem =
      {
        ...certificate,

        certificateTypeCode,

        customCertificateName:
          certificateTypeCode ===
          "other"
            ? certificate.customCertificateName
            : "",

        level:
          definition?.supportsLevel
            ? certificate.level
            : "",

        overallScore:
          definition?.supportsOverallScore ||
          certificateTypeCode ===
            "other"
            ? certificate.overallScore
            : "",

        scores,
      };

    onLanguagesChange(
      languages.map((language) =>
        language.id === languageId
          ? {
              ...language,

              certificates:
                language.certificates.map(
                  (item) =>
                    item.id ===
                    certificate.id
                      ? updatedCertificate
                      : item,
                ),
            }
          : language,
      ),
    );

    setCertificateError("");
  };

  const updateCertificateScore = (
    languageId: string,
    certificateId: string,
    componentCode: string,
    value: string,
  ) => {
    onLanguagesChange(
      languages.map((language) =>
        language.id === languageId
          ? {
              ...language,

              certificates:
                language.certificates.map(
                  (certificate) =>
                    certificate.id ===
                    certificateId
                      ? {
                          ...certificate,

                          scores:
                            certificate.scores.map(
                              (score) =>
                                score.componentCode ===
                                componentCode
                                  ? {
                                      ...score,
                                      value,
                                    }
                                  : score,
                            ),
                        }
                      : certificate,
                ),
            }
          : language,
      ),
    );
  };

  const completeCertificate = (
    certificate: LanguageCertificateItem,
  ) => {
    if (
      !certificate.certificateTypeCode
    ) {
      setCertificateError(
        "Vui lòng chọn loại chứng chỉ.",
      );

      return;
    }

    if (
      certificate.certificateTypeCode ===
        "other" &&
      !certificate.customCertificateName.trim()
    ) {
      setCertificateError(
        "Vui lòng nhập tên chứng chỉ.",
      );

      return;
    }

    const definition =
      getCertificateTypeByCode(
        certificate.certificateTypeCode,
      );

    if (
      definition?.supportsLevel &&
      definition.levelOptions &&
      definition.levelOptions.length >
        0 &&
      !certificate.level
    ) {
      setCertificateError(
        "Vui lòng chọn cấp độ của chứng chỉ.",
      );

      return;
    }

    if (
      certificate.issuedDate &&
      certificate.expiryDate &&
      certificate.expiryDate <
        certificate.issuedDate
    ) {
      setCertificateError(
        "Ngày hết hạn không thể trước ngày cấp.",
      );

      return;
    }

    setCertificateError("");

    setEditingCertificate(null);
  };

  const isCertificateEditing = (
    languageId: string,
    certificateId: string,
  ) =>
    editingCertificate?.languageId ===
      languageId &&
    editingCertificate.certificateId ===
      certificateId;

  return {
    editingCertificate,
    certificateError,

    resetCertificateEditor,

    addCertificate,
    updateCertificate,
    removeCertificate,
    editCertificate,

    handleCertificateTypeChange,
    updateCertificateScore,
    completeCertificate,

    isCertificateEditing,
  };
};

export type CertificatesEditor =
  ReturnType<
    typeof useCertificatesEditor
  >;

export default useCertificatesEditor;