import type { LanguageCertificateType } from "../language.types";

export const FRENCH_CERTIFICATE_TYPES: LanguageCertificateType[] = [
    {
      code: "DELF",
      languageCode: "fr",
      label: "DELF",

      supportsOverallScore: true,
      supportsLevel: true,

      levelOptions: [
        "A1",
        "A2",
        "B1",
        "B2",
      ],

      scoreFields: [],
    },

    {
      code: "DALF",
      languageCode: "fr",
      label: "DALF",

      supportsOverallScore: true,
      supportsLevel: true,

      levelOptions: [
        "C1",
        "C2",
      ],

      scoreFields: [],
    },

    {
      code: "TCF",
      languageCode: "fr",
      label: "TCF",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },

    {
      code: "TEF",
      languageCode: "fr",
      label: "TEF",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },

];
