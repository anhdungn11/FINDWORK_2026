/* =========================================================
   LANGUAGE CATALOG
========================================================= */

export interface LanguageOption {
  code: string;
  label: string;
  englishLabel: string;
}

export interface CertificateScoreField {
  code: string;
  label: string;

  min?: number;
  max?: number;
  step?: number;
}

export interface LanguageCertificateType {
  code: string;

  languageCode: string;

  label: string;

  supportsOverallScore: boolean;

  supportsLevel: boolean;

  /**
   * Nếu có danh sách level chuẩn thì dùng dropdown.
   *
   * Nếu supportsLevel = true nhưng không có levelOptions,
   * UI có thể cho nhập text.
   */
  levelOptions?: string[];

  scoreFields: CertificateScoreField[];
}

/* =========================================================
   LANGUAGES
========================================================= */

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: "vi",
    label: "Tiếng Việt",
    englishLabel: "Vietnamese",
  },
  {
    code: "en",
    label: "Tiếng Anh",
    englishLabel: "English",
  },
  {
    code: "zh",
    label: "Tiếng Trung",
    englishLabel: "Chinese",
  },
  {
    code: "ja",
    label: "Tiếng Nhật",
    englishLabel: "Japanese",
  },
  {
    code: "ko",
    label: "Tiếng Hàn",
    englishLabel: "Korean",
  },
  {
    code: "fr",
    label: "Tiếng Pháp",
    englishLabel: "French",
  },
  {
    code: "de",
    label: "Tiếng Đức",
    englishLabel: "German",
  },
  {
    code: "es",
    label: "Tiếng Tây Ban Nha",
    englishLabel: "Spanish",
  },
  {
    code: "it",
    label: "Tiếng Ý",
    englishLabel: "Italian",
  },
  {
    code: "pt",
    label: "Tiếng Bồ Đào Nha",
    englishLabel: "Portuguese",
  },
  {
    code: "ru",
    label: "Tiếng Nga",
    englishLabel: "Russian",
  },
  {
    code: "th",
    label: "Tiếng Thái",
    englishLabel: "Thai",
  },
  {
    code: "id",
    label: "Tiếng Indonesia",
    englishLabel: "Indonesian",
  },
  {
    code: "ms",
    label: "Tiếng Mã Lai",
    englishLabel: "Malay",
  },
  {
    code: "fil",
    label: "Tiếng Philippines",
    englishLabel: "Filipino",
  },
  {
    code: "km",
    label: "Tiếng Khmer",
    englishLabel: "Khmer",
  },
  {
    code: "lo",
    label: "Tiếng Lào",
    englishLabel: "Lao",
  },
  {
    code: "my",
    label: "Tiếng Myanmar",
    englishLabel: "Burmese",
  },
  {
    code: "ar",
    label: "Tiếng Ả Rập",
    englishLabel: "Arabic",
  },
  {
    code: "hi",
    label: "Tiếng Hindi",
    englishLabel: "Hindi",
  },
  {
    code: "tr",
    label: "Tiếng Thổ Nhĩ Kỳ",
    englishLabel: "Turkish",
  },
  {
    code: "nl",
    label: "Tiếng Hà Lan",
    englishLabel: "Dutch",
  },
  {
    code: "pl",
    label: "Tiếng Ba Lan",
    englishLabel: "Polish",
  },
  {
    code: "cs",
    label: "Tiếng Séc",
    englishLabel: "Czech",
  },
  {
    code: "uk",
    label: "Tiếng Ukraina",
    englishLabel: "Ukrainian",
  },
  {
    code: "sv",
    label: "Tiếng Thụy Điển",
    englishLabel: "Swedish",
  },
  {
    code: "no",
    label: "Tiếng Na Uy",
    englishLabel: "Norwegian",
  },
  {
    code: "da",
    label: "Tiếng Đan Mạch",
    englishLabel: "Danish",
  },
  {
    code: "fi",
    label: "Tiếng Phần Lan",
    englishLabel: "Finnish",
  },
  {
    code: "el",
    label: "Tiếng Hy Lạp",
    englishLabel: "Greek",
  },
  {
    code: "he",
    label: "Tiếng Hebrew",
    englishLabel: "Hebrew",
  },

  /*
   * Luôn để cuối danh sách.
   *
   * Custom language KHÔNG tự động
   * trở thành dữ liệu master.
   */
  {
    code: "other",
    label: "Khác...",
    englishLabel: "Other",
  },
];

/* =========================================================
   CERTIFICATE CATALOG
========================================================= */

export const LANGUAGE_CERTIFICATE_TYPES: LanguageCertificateType[] =
  [
    /* =====================================================
       ENGLISH
    ===================================================== */

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

    /* =====================================================
       JAPANESE
    ===================================================== */

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

    /* =====================================================
       KOREAN
    ===================================================== */

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

    /* =====================================================
       CHINESE
    ===================================================== */

    {
      code: "HSK",
      languageCode: "zh",
      label: "HSK",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },

    {
      code: "HSKK",
      languageCode: "zh",
      label: "HSKK",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },

    /* =====================================================
       FRENCH
    ===================================================== */

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

    /* =====================================================
       GERMAN
    ===================================================== */

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

    /* =====================================================
       SPANISH
    ===================================================== */

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

    /* =====================================================
       ITALIAN
    ===================================================== */

    {
      code: "CILS",
      languageCode: "it",
      label: "CILS",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },

    {
      code: "CELI",
      languageCode: "it",
      label: "CELI",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },

    /* =====================================================
       RUSSIAN
    ===================================================== */

    {
      code: "TORFL",
      languageCode: "ru",
      label: "TORFL / TRKI",

      supportsOverallScore: true,
      supportsLevel: true,

      scoreFields: [],
    },
  ];

/* =========================================================
   HELPERS
========================================================= */

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