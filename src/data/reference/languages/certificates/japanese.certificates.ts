import type { LanguageCertificateType } from "../language.types";

export const JAPANESE_CERTIFICATE_TYPES: LanguageCertificateType[] = [
    {
      code: "JLPT",
      languageCode: "ja",
      label: "JLPT",

      supportsOverallScore: true,
      supportsLevel: true,

      levelOptions: [
        "N5",
        "N4",
        "N3",
        "N2",
        "N1",
      ],

      scoreFields: [],
    },

    {
      code: "JFT_BASIC",
      languageCode: "ja",
      label: "JFT-Basic",

      supportsOverallScore: true,
      supportsLevel: false,

      scoreFields: [],
    },

    {
      code: "NAT_TEST",
      languageCode: "ja",
      label: "NAT-TEST",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },
];
