export type LanguageProficiency = "" | "basic" | "conversational" | "professional" | "fluent" | "native";
export interface LanguageCertificateScoreItem { id: string; componentCode: string; value: string; }
export interface LanguageCertificateItem {
  id: string;
  certificateTypeCode: string;
  customCertificateName: string;
  level: string;
  overallScore: string;
  scores: LanguageCertificateScoreItem[];
  issuedDate: string;
  expiryDate: string;
  issuer: string;
  credentialId: string;
  verificationUrl: string;
}
export interface CandidateLanguageItem {
  id: string;
  languageCode: string;
  customLanguageName: string;
  overallLevel: LanguageProficiency;
  listeningLevel: LanguageProficiency;
  speakingLevel: LanguageProficiency;
  readingLevel: LanguageProficiency;
  writingLevel: LanguageProficiency;
  certificates: LanguageCertificateItem[];
}
