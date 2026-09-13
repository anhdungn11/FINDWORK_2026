import {
  LANGUAGE_OPTIONS,
} from "@/data/reference/languages/language.options";

import {
  LANGUAGE_CERTIFICATE_TYPES,
} from "@/data/reference/languages/language-certificates";

export const getLanguageByCode = (
  code: string,
) => {
  return LANGUAGE_OPTIONS.find(
    (language) =>
      language.code === code,
  );
};

export const getLanguageLabel = (
  code: string,
  customLanguageName = "",
) => {
  if (code === "other") {
    return (
      customLanguageName.trim() ||
      "Ngôn ngữ khác"
    );
  }

  return (
    getLanguageByCode(code)?.label ??
    "Chưa chọn ngôn ngữ"
  );
};

export const getCertificateTypesForLanguage = (
  languageCode: string,
) => {
  return LANGUAGE_CERTIFICATE_TYPES.filter(
    (certificate) =>
      certificate.languageCode ===
      languageCode,
  );
};

export const getCertificateTypeByCode = (
  code: string,
) => {
  return LANGUAGE_CERTIFICATE_TYPES.find(
    (certificate) =>
      certificate.code === code,
  );
};

export const getCertificateLabel = (
  code: string,
  customCertificateName = "",
) => {
  if (code === "other") {
    return (
      customCertificateName.trim() ||
      "Chứng chỉ khác"
    );
  }

  return (
    getCertificateTypeByCode(code)
      ?.label ??
    "Chưa chọn chứng chỉ"
  );
};
