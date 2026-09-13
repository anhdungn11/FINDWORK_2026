import type { LanguageCertificateType } from "../language.types";

export const ENGLISH_CERTIFICATE_TYPES: LanguageCertificateType[] = [
    {
      code: "IELTS_ACADEMIC",
      languageCode: "en",
      label: "IELTS Academic",

      supportsOverallScore: true,
      supportsLevel: false,

      scoreFields: [
        {
          code: "LISTENING",
          label: "Listening",
          min: 0,
          max: 9,
          step: 0.5,
        },
        {
          code: "READING",
          label: "Reading",
          min: 0,
          max: 9,
          step: 0.5,
        },
        {
          code: "WRITING",
          label: "Writing",
          min: 0,
          max: 9,
          step: 0.5,
        },
        {
          code: "SPEAKING",
          label: "Speaking",
          min: 0,
          max: 9,
          step: 0.5,
        },
      ],
    },

    {
      code: "IELTS_GENERAL",
      languageCode: "en",
      label: "IELTS General Training",

      supportsOverallScore: true,
      supportsLevel: false,

      scoreFields: [
        {
          code: "LISTENING",
          label: "Listening",
          min: 0,
          max: 9,
          step: 0.5,
        },
        {
          code: "READING",
          label: "Reading",
          min: 0,
          max: 9,
          step: 0.5,
        },
        {
          code: "WRITING",
          label: "Writing",
          min: 0,
          max: 9,
          step: 0.5,
        },
        {
          code: "SPEAKING",
          label: "Speaking",
          min: 0,
          max: 9,
          step: 0.5,
        },
      ],
    },

    {
      code: "TOEIC_LR",
      languageCode: "en",
      label: "TOEIC Listening & Reading",

      supportsOverallScore: true,
      supportsLevel: false,

      scoreFields: [
        {
          code: "LISTENING",
          label: "Listening",
        },
        {
          code: "READING",
          label: "Reading",
        },
      ],
    },

    {
      code: "TOEIC_SW",
      languageCode: "en",
      label: "TOEIC Speaking & Writing",

      supportsOverallScore: false,
      supportsLevel: false,

      scoreFields: [
        {
          code: "SPEAKING",
          label: "Speaking",
        },
        {
          code: "WRITING",
          label: "Writing",
        },
      ],
    },

    {
      code: "TOEFL_IBT",
      languageCode: "en",
      label: "TOEFL iBT",

      supportsOverallScore: true,
      supportsLevel: false,

      scoreFields: [
        {
          code: "READING",
          label: "Reading",
        },
        {
          code: "LISTENING",
          label: "Listening",
        },
        {
          code: "SPEAKING",
          label: "Speaking",
        },
        {
          code: "WRITING",
          label: "Writing",
        },
      ],
    },

    {
      code: "PTE_ACADEMIC",
      languageCode: "en",
      label: "PTE Academic",

      supportsOverallScore: true,
      supportsLevel: false,

      scoreFields: [],
    },

    {
      code: "VSTEP",
      languageCode: "en",
      label: "VSTEP",

      supportsOverallScore: true,
      supportsLevel: true,

      levelOptions: [
        "Bậc 1",
        "Bậc 2",
        "Bậc 3",
        "Bậc 4",
        "Bậc 5",
        "Bậc 6",
      ],

      scoreFields: [
        {
          code: "LISTENING",
          label: "Nghe",
        },
        {
          code: "READING",
          label: "Đọc",
        },
        {
          code: "WRITING",
          label: "Viết",
        },
        {
          code: "SPEAKING",
          label: "Nói",
        },
      ],
    },

    {
      code: "CAMBRIDGE_B2_FIRST",
      languageCode: "en",
      label: "Cambridge B2 First (FCE)",

      supportsOverallScore: true,
      supportsLevel: false,

      scoreFields: [],
    },

    {
      code: "CAMBRIDGE_C1_ADVANCED",
      languageCode: "en",
      label: "Cambridge C1 Advanced (CAE)",

      supportsOverallScore: true,
      supportsLevel: false,

      scoreFields: [],
    },

    {
      code: "CAMBRIDGE_C2_PROFICIENCY",
      languageCode: "en",
      label: "Cambridge C2 Proficiency (CPE)",

      supportsOverallScore: true,
      supportsLevel: false,

      scoreFields: [],
    },
];
