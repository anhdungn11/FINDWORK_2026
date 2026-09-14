import type {
  LanguageCertificateItem,
  LanguageCertificateScoreItem,
} from "@/features/candidate/types/onboarding.types";

import {
  getCertificateTypeByCode,
} from "@/features/candidate/utils/language.constants";

export const createCertificate =
  (): LanguageCertificateItem => ({
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

export const applyCertificateType = (
  certificate:
    LanguageCertificateItem,
  certificateTypeCode: string,
): LanguageCertificateItem => {
  const definition =
    getCertificateTypeByCode(
      certificateTypeCode,
    );

  const previousScores =
    new Map(
      certificate.scores.map(
        (score) => [
          score.componentCode,
          score.value,
        ],
      ),
    );

  const scores:
    LanguageCertificateScoreItem[] =
      definition
        ? definition.scoreFields.map(
            (field) => ({
              id: crypto.randomUUID(),
              componentCode:
                field.code,
              value:
                previousScores.get(
                  field.code,
                ) ?? "",
            }),
          )
        : [];

  return {
    ...certificate,
    certificateTypeCode,
    customCertificateName:
      certificateTypeCode === "other"
        ? certificate.customCertificateName
        : "",
    level:
      definition?.supportsLevel
        ? certificate.level
        : "",
    overallScore:
      definition?.supportsOverallScore ||
      certificateTypeCode === "other"
        ? certificate.overallScore
        : "",
    scores,
  };
};

export const getCertificateValidationError =
  (
    certificate:
      LanguageCertificateItem,
  ): string | null => {
    if (
      !certificate.certificateTypeCode
    ) {
      return "Vui lòng chọn loại chứng chỉ.";
    }

    if (
      certificate.certificateTypeCode ===
        "other" &&
      !certificate.customCertificateName.trim()
    ) {
      return "Vui lòng nhập tên chứng chỉ.";
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
      return "Vui lòng chọn cấp độ của chứng chỉ.";
    }

    if (
      certificate.issuedDate &&
      certificate.expiryDate &&
      certificate.expiryDate <
        certificate.issuedDate
    ) {
      return "Ngày hết hạn không thể trước ngày cấp.";
    }

    return null;
  };
