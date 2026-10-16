/**
 * FINDWORK CP8B — CANDIDATE PROFILE PROVISIONAL & DOMAIN TYPES
 * 
 * Lưu ý: Toàn bộ kiểu dữ liệu dưới đây phục vụ cho tầng hiển thị (Presentation Layer).
 * Được đối chiếu chặt chẽ với Prisma Schema và DTO của NestJS backend.
 */

export type Gender = "MALE" | "FEMALE" | "OTHER";

export type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "INTERNSHIP"
  | "CONTRACT"
  | "FREELANCE"
  | "TEMPORARY"
  | "VOLUNTEER";

export type WorkplaceType = "ONSITE" | "HYBRID" | "REMOTE";

export type CareerLevel =
  | "INTERN"
  | "FRESHER"
  | "JUNIOR"
  | "MID"
  | "SENIOR"
  | "LEAD"
  | "MANAGER";

export type CandidateCareerStatus =
  | "STUDENT"
  | "INTERN"
  | "LOOKING_FOR_JOB"
  | "EMPLOYED"
  | "UNEMPLOYED"
  | "FREELANCER"
  | "OTHER";

export type SkillLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "PROFICIENT"
  | "EXPERT";

export type LanguageProficiency =
  | "BASIC"
  | "CONVERSATIONAL"
  | "PROFESSIONAL"
  | "FLUENT"
  | "NATIVE";

export type LocationPreferenceMode = "SELECTED" | "NATIONWIDE";
export type SalaryExpectationType = "RANGE" | "NEGOTIABLE" | "NOT_IMPORTANT";
export type AvailabilityType = "IMMEDIATELY" | "SPECIFIC_DATE";

/** Thông tin địa giới hành chính */
export interface CandidateLocationRef {
  id: string;
  code: string;
  name: string;
  divisionType?: string;
}

/** Bản ghi Quyền riêng tư - Default: false, false, false, false, true */
export interface CandidatePrivacySettingRecord {
  id?: string;
  candidateProfileId?: string;
  searchableProfile: boolean;   // default: false
  showEmail: boolean;           // default: false
  showPhone: boolean;           // default: false
  allowResumeDownload: boolean; // default: false
  allowJobMatching: boolean;    // default: true
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_PRIVACY_SETTINGS: CandidatePrivacySettingRecord = {
  searchableProfile: false,
  showEmail: false,
  showPhone: false,
  allowResumeDownload: false,
  allowJobMatching: true,
};

/** Bản ghi Học vấn */
export interface CandidateEducationRecord {
  id: string;
  candidateProfileId?: string;
  school: string;
  degree: string;
  major: string;
  location?: string | null;
  startMonth: number;
  startYear: number;
  endMonth?: number | null;
  endYear?: number | null;
  isStudying: boolean;
  gpa?: string | number | null;
  gpaScale?: string | number | null;
  achievements?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Kỹ năng áp dụng trong kinh nghiệm */
export interface CandidateExperienceSkillRef {
  id?: string;
  skillId?: string | null;
  skillName: string;
}

/** Bản ghi Kinh nghiệm làm việc (Tùy chọn, không ép buộc cho fresher/sinh viên) */
export interface CandidateExperienceRecord {
  id: string;
  candidateProfileId?: string;
  companyName: string;
  position: string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  location?: string | null;
  startMonth: number;
  startYear: number;
  endMonth?: number | null;
  endYear?: number | null;
  isCurrent: boolean;
  description?: string | null;
  achievements?: string | null;
  skills: CandidateExperienceSkillRef[];
  createdAt?: string;
  updatedAt?: string;
}

/** Bản ghi Kỹ năng chuyên môn (Linh hoạt theo ngành nghề) */
export interface CandidateSkillRecord {
  id: string;
  candidateProfileId?: string;
  skillId?: string | null;
  customSkillName?: string | null;
  skillName: string;
  level: SkillLevel;
  yearsOfExperience?: string | number | null;
  isHighlighted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Điểm số thành phần chứng chỉ */
export interface CertificateScoreItem {
  componentCode: string;
  value: string;
}

/** Chứng chỉ ngoại ngữ */
export interface CandidateLanguageCertificateRecord {
  id: string;
  candidateLanguageId?: string;
  certificateTypeId?: string | null;
  customCertificateName?: string | null;
  certificateName: string;
  level?: string | null;
  overallScore?: string | null;
  scores?: CertificateScoreItem[] | Record<string, unknown> | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  issuer?: string | null;
  credentialId?: string | null;
  verificationUrl?: string | null;
}

/** Bản ghi Ngoại ngữ */
export interface CandidateLanguageRecord {
  id: string;
  candidateProfileId?: string;
  languageId?: string | null;
  customLanguageName?: string | null;
  languageName: string;
  overallLevel: LanguageProficiency;
  listeningLevel?: LanguageProficiency | null;
  speakingLevel?: LanguageProficiency | null;
  readingLevel?: LanguageProficiency | null;
  writingLevel?: LanguageProficiency | null;
  certificates: CandidateLanguageCertificateRecord[];
  createdAt?: string;
  updatedAt?: string;
}

/** Bản ghi Nguyện vọng nghề nghiệp */
export interface CandidateCareerPreferenceRecord {
  id?: string;
  candidateProfileId?: string;
  locationMode: LocationPreferenceMode;
  salaryType: SalaryExpectationType;
  salaryMin?: number | string | null;
  salaryMax?: number | string | null;
  currency: string;
  salaryPeriod: "MONTH" | "YEAR";
  desiredCareerLevel?: CareerLevel | null;
  availabilityType?: AvailabilityType | null;
  availableFrom?: string | null;
  willingToRelocate: boolean;
  desiredPositions: string[];
  preferredCategories: string[];
  preferredCategoryIds?: string[];
  preferredLocations: CandidateLocationRef[];
  preferredEmploymentTypes: EmploymentType[];
  preferredWorkplaceTypes: WorkplaceType[];
  createdAt?: string;
  updatedAt?: string;
}

/** Bản ghi Hồ sơ Ứng viên Đầy đủ */
export interface FullCandidateProfileRecord {
  id: string;
  userId: string;
  fullName: string;
  /** Email liên hệ riêng của hồ sơ mẫu (chỉ dùng cho DEMO PROFILE để tách biệt hoàn toàn khỏi AUTHENTICATED ACCOUNT) */
  contactEmail?: string | null;
  /** Đánh dấu dữ liệu mẫu trong bộ nhớ phát triển — tuyệt đối không lưu vào DB */
  isSampleData?: boolean;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  countryCode?: string | null;
  provinceId?: string | null;
  wardId?: string | null;
  province?: CandidateLocationRef | null;
  ward?: CandidateLocationRef | null;
  addressLine?: string | null;
  bio?: string | null;
  avatarAssetKey?: string | null;
  careerStatus?: CandidateCareerStatus | null;
  createdAt: string;
  updatedAt: string;

  education: CandidateEducationRecord[];
  experience: CandidateExperienceRecord[];
  skills: CandidateSkillRecord[];
  languages: CandidateLanguageRecord[];
  careerPreference?: CandidateCareerPreferenceRecord | null;
  privacySetting?: CandidatePrivacySettingRecord | null;
}

/** Hợp đồng tạo hồ sơ từ Onboarding */
export interface ImportOnboardingPayload {
  version: number;
  confirmPrivacy: boolean;
  confirmOmitUnsupportedAssets?: boolean;
}

/** Tóm tắt dữ liệu Onboarding khả dụng cho Import Preview */
export interface OnboardingDraftSummary {
  version: number;
  stepIndex: number;
  updatedAt: string;
  fullName?: string;
  /** Email mẫu độc lập của bản nháp demo (không trộn lẫn email tài khoản đăng nhập) */
  contactEmail?: string;
  /** Đánh dấu bản nháp mẫu trong bộ nhớ phát triển */
  isSampleData?: boolean;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  addressLine?: string;
  provinceName?: string;
  educationCount: number;
  experienceCount: number;
  skillsCount: number;
  languagesCount: number;
  hasPreferences: boolean;
  /** Cảnh báo rõ ràng: File blob trình duyệt không lưu lên server */
  hasLocalAvatarFile: boolean;
  hasLocalResumeFile: boolean;
}

/**
 * 9 Trạng thái giao diện độc lập (Presentation States):
 * Tách biệt hoàn toàn trạng thái hồ sơ với trạng thái bản nháp.
 */
export type CandidateProfilePresentationState =
  | "loading"                 // Đang kiểm tra/tải dữ liệu
  | "existing_profile"        // Hồ sơ chính thức đã tồn tại
  | "not_created_with_draft"  // Chưa tạo hồ sơ nhưng CÓ bản nháp Onboarding
  | "not_created_no_draft"    // Chưa tạo hồ sơ và KHÔNG CÓ bản nháp Onboarding
  | "eligibility_unknown"     // Chưa thể xác định an toàn quyền hạn (ví dụ mới đăng ký hoặc hết phiên 401)
  | "forbidden"               // Xác định rõ thiếu quyền profile.view (403)
  | "import_conflict"         // Xung đột phiên bản khi import (409)
  | "profile_already_exists"  // Hồ sơ đã được tạo từ phiên khác (409 on import)
  | "network_error";          // Sự cố kết nối hoặc lỗi dịch vụ (503 / 500)
