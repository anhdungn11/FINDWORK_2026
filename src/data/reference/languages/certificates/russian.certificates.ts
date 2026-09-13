import type { LanguageCertificateType } from "../language.types";

export const RUSSIAN_CERTIFICATE_TYPES: LanguageCertificateType[] = [
    {
      code: "TORFL",
      languageCode: "ru",
      label: "TORFL / TRKI",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },
];
