import type { LanguageCertificateType } from "../language.types";

export const KOREAN_CERTIFICATE_TYPES: LanguageCertificateType[] = [
    {
      code: "TOPIK_I",
      languageCode: "ko",
      label: "TOPIK I",

      supportsOverallScore: true,
      supportsLevel: true,

      levelOptions: [
        "Level 1",
        "Level 2",
      ],

      scoreFields: [],
    },

    {
      code: "TOPIK_II",
      languageCode: "ko",
      label: "TOPIK II",

      supportsOverallScore: true,
      supportsLevel: true,

      levelOptions: [
        "Level 3",
        "Level 4",
        "Level 5",
        "Level 6",
      ],

      scoreFields: [],
    },

];
