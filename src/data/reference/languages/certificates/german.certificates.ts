import type { LanguageCertificateType } from "../language.types";

export const GERMAN_CERTIFICATE_TYPES: LanguageCertificateType[] = [
    {
      code: "GOETHE",
      languageCode: "de",
      label: "Goethe-Zertifikat",

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
      code: "TESTDAF",
      languageCode: "de",
      label: "TestDaF",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },

    {
      code: "TELC_DEUTSCH",
      languageCode: "de",
      label: "telc Deutsch",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },

    {
      code: "DSH",
      languageCode: "de",
      label: "DSH",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },

];
