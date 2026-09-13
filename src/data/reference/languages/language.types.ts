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
   * Nếu supportsLevel = true nhưng không có levelOptions,
   * UI có thể cho nhập text.
   */
  levelOptions?: string[];

  scoreFields: CertificateScoreField[];
}
