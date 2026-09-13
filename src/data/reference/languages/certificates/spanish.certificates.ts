import type { LanguageCertificateType } from "../language.types";

export const SPANISH_CERTIFICATE_TYPES: LanguageCertificateType[] = [
    {
      code: "DELE",
      languageCode: "es",
      label: "DELE",

      supportsOverallScore: true,
      supportsLevel: true,

      levelOptions: [
        "A1",
        "A2",
        "B1",
        "B2",
        "C1",
        "C2",
      ],

      scoreFields: [],
    },

    {
      code: "SIELE",
      languageCode: "es",
      label: "SIELE",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },

];
