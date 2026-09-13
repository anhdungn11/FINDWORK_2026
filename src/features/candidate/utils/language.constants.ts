export type {
  CertificateScoreField,
  LanguageCertificateType,
  LanguageOption,
} from "@/data/reference/languages/language.types";

export {
  LANGUAGE_OPTIONS,
} from "@/data/reference/languages/language.options";

export {
  LANGUAGE_CERTIFICATE_TYPES,
} from "@/data/reference/languages/language-certificates";

export {
  getCertificateLabel,
  getCertificateTypeByCode,
  getCertificateTypesForLanguage,
  getLanguageByCode,
  getLanguageLabel,
} from "@/utils/language.utils";
