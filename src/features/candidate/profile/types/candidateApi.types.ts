/**
 * FINDWORK CP8C — CANDIDATE PROFILE API CONTRACT & DTO TYPES
 * 
 * Định nghĩa chặt chẽ các kiểu dữ liệu DTO giao tiếp với backend NestJS
 * (/api/v1/candidate/...).
 * Tách biệt rõ ràng với Frontend Domain View Model và Mock Fixtures.
 */

import type {
  CandidateCareerStatus,
  EmploymentType as CandidateEmploymentType,
  WorkplaceType as CandidateWorkplaceType,
  CareerLevel as CandidateCareerLevel,
  SkillLevel as CandidateSkillLevel,
  LanguageProficiency as CandidateLanguageProficiency,
  LocationPreferenceMode as CandidateLocationPreferenceMode,
  SalaryExpectationType as CandidateSalaryExpectationType,
  AvailabilityType as CandidateAvailabilityType,
} from "./candidateProfile.types";

export type CandidateSalaryPeriod = "MONTH" | "YEAR";
export type UnsupportedOnboardingAsset = "avatar" | "resume";

/** Giá trị mặc định quyền riêng tư khi khởi tạo hồ sơ từ Onboarding */
export const CANDIDATE_IMPORT_PRIVACY_DEFAULTS = {
  searchableProfile: false,
  showEmail: false,
  showPhone: false,
  allowResumeDownload: false,
  allowJobMatching: true,
} as const;

export type CandidateImportPrivacyField = keyof typeof CANDIDATE_IMPORT_PRIVACY_DEFAULTS;

/** Nhãn tiếng Việt và giải thích cho từng trường quyền riêng tư */
export const CANDIDATE_PRIVACY_FIELD_METADATA: Record<
  CandidateImportPrivacyField,
  { label: string; description: string }
> = {
  searchableProfile: {
    label: "Cho phép nhà tuyển dụng tìm kiếm hồ sơ",
    description: "Khi bật, hồ sơ xuất hiện trong kết quả tìm kiếm của các nhà tuyển dụng uy tín.",
  },
  showEmail: {
    label: "Hiển thị công khai địa chỉ Email",
    description: "Khi tắt, chỉ khi bạn chủ động ứng tuyển thì nhà tuyển dụng mới xem được email.",
  },
  showPhone: {
    label: "Hiển thị công khai số điện thoại",
    description: "Bảo vệ thông tin liên lạc cá nhân, tránh các cuộc gọi làm phiền không mong muốn.",
  },
  allowResumeDownload: {
    label: "Cho phép tải xuống tệp CV đính kèm",
    description: "Chỉ cho phép tải CV khi ứng viên đã gửi hồ sơ ứng tuyển chính thức.",
  },
  allowJobMatching: {
    label: "Nhận gợi ý việc làm phù hợp tự động",
    description: "Hệ thống tự động so khớp kỹ năng và kinh nghiệm để đề xuất cơ hội việc làm tốt nhất.",
  },
};

/** DTO phản hồi từ GET /api/v1/candidate/bootstrap */
export interface CandidateBootstrapResponse {
  profile: {
    state: "exists" | "not_created";
    canCreateProfile: boolean;
    canViewProfile: boolean;
  };
  draft: {
    state: "missing" | "exists";
    version?: number;
  };
}

/** DTO dữ liệu hồ sơ cơ bản từ backend */
export interface BackendCandidateProfileDto {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  countryCode: string | null;
  provinceId: string | null;
  wardId: string | null;
  addressLine: string | null;
  bio: string | null;
  avatarAssetKey: string | null;
  careerStatus: CandidateCareerStatus | null;
  createdAt: string;
  updatedAt: string;
  province?: {
    id: string;
    code: string;
    name: string;
    divisionType?: string;
  } | null;
  ward?: {
    id: string;
    code: string;
    name: string;
    divisionType?: string;
  } | null;
  education?: BackendCandidateEducationDto[];
  experience?: BackendCandidateExperienceDto[];
  skills?: BackendCandidateSkillDto[];
  languages?: BackendCandidateLanguageDto[];
  careerPreference?: BackendCandidateCareerPreferenceDto | null;
  privacySetting?: BackendCandidatePrivacyDto | null;
}

/** DTO gửi đi khi tạo hồ sơ: POST /api/v1/candidate/profile */
export interface CreateCandidateProfileDto {
  fullName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  countryCode?: string | null;
  provinceId?: string | null;
  wardId?: string | null;
  addressLine?: string | null;
  bio?: string | null;
  avatarAssetKey?: string | null;
  careerStatus?: CandidateCareerStatus | null;
}

/** DTO gửi đi khi cập nhật hồ sơ: PATCH /api/v1/candidate/profile */
export type UpdateCandidateProfileDto = Partial<CreateCandidateProfileDto>;

/** DTO Học vấn từ backend: GET /api/v1/candidate/education */
export interface BackendCandidateEducationDto {
  id: string;
  candidateProfileId: string;
  school: string;
  degree: string;
  major: string;
  location: string | null;
  startMonth: number;
  startYear: number;
  endMonth: number | null;
  endYear: number | null;
  isStudying: boolean;
  gpa: number | string | null;
  gpaScale: number | string | null;
  achievements: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCandidateEducationDto {
  school: string;
  degree: string;
  major: string;
  location?: string | null;
  startMonth: number;
  startYear: number;
  endMonth?: number | null;
  endYear?: number | null;
  isStudying?: boolean;
  gpa?: number | null;
  gpaScale?: number | null;
  achievements?: string | null;
  description?: string | null;
}

export type UpdateCandidateEducationDto = Partial<CreateCandidateEducationDto>;

/** DTO Kinh nghiệm làm việc: GET /api/v1/candidate/experience */
export interface BackendCandidateExperienceSkillDto {
  id: string;
  experienceId: string;
  skillId: string | null;
  skillName: string;
  createdAt?: string;
}

export interface BackendCandidateExperienceDto {
  id: string;
  candidateProfileId: string;
  companyName: string;
  position: string;
  employmentType: CandidateEmploymentType;
  workplaceType: CandidateWorkplaceType;
  location: string | null;
  startMonth: number;
  startYear: number;
  endMonth: number | null;
  endYear: number | null;
  isCurrent: boolean;
  description: string | null;
  achievements: string | null;
  skills: BackendCandidateExperienceSkillDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCandidateExperienceDto {
  companyName: string;
  position: string;
  employmentType: CandidateEmploymentType;
  workplaceType: CandidateWorkplaceType;
  location?: string | null;
  startMonth: number;
  startYear: number;
  endMonth?: number | null;
  endYear?: number | null;
  isCurrent?: boolean;
  description?: string | null;
  achievements?: string | null;
  skills?: { skillId?: string | null; skillName?: string | null }[];
}

export type UpdateCandidateExperienceDto = Partial<CreateCandidateExperienceDto>;

/** DTO Kỹ năng: GET /api/v1/candidate/skills */
export interface BackendCandidateSkillDto {
  id: string;
  candidateProfileId: string;
  skillId: string | null;
  customSkillName: string | null;
  level: CandidateSkillLevel;
  yearsOfExperience: number | string | null;
  isHighlighted: boolean;
  createdAt: string;
  updatedAt: string;
  skill?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface CreateCandidateSkillDto {
  skillId?: string | null;
  customSkillName?: string | null;
  level: CandidateSkillLevel;
  yearsOfExperience?: number | null;
  isHighlighted?: boolean;
}

export type UpdateCandidateSkillDto = Partial<CreateCandidateSkillDto>;

/** DTO Chứng chỉ ngoại ngữ */
export interface BackendCandidateLanguageCertificateDto {
  id: string;
  candidateLanguageId: string;
  certificateTypeId: string | null;
  customCertificateName: string | null;
  level: string | null;
  overallScore: string | null;
  scores: Record<string, unknown> | null;
  issuedDate: string | null;
  expiryDate: string | null;
  issuer: string | null;
  credentialId: string | null;
  verificationUrl: string | null;
  createdAt: string;
  updatedAt: string;
  certificateType?: {
    id: string;
    code: string;
    label: string;
    languageId?: string;
  } | null;
}

export interface CreateCandidateLanguageCertificateDto {
  certificateTypeId?: string | null;
  customCertificateName?: string | null;
  level?: string | null;
  overallScore?: string | null;
  scores?: Record<string, unknown> | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  issuer?: string | null;
  credentialId?: string | null;
  verificationUrl?: string | null;
}

export type UpdateCandidateLanguageCertificateDto = Partial<CreateCandidateLanguageCertificateDto>;

/** DTO Ngoại ngữ: GET /api/v1/candidate/languages */
export interface BackendCandidateLanguageDto {
  id: string;
  candidateProfileId: string;
  languageId: string | null;
  customLanguageName: string | null;
  overallLevel: CandidateLanguageProficiency;
  listeningLevel: CandidateLanguageProficiency;
  speakingLevel: CandidateLanguageProficiency;
  readingLevel: CandidateLanguageProficiency;
  writingLevel: CandidateLanguageProficiency;
  createdAt: string;
  updatedAt: string;
  language?: {
    id: string;
    code: string;
    label: string;
    englishLabel?: string | null;
  } | null;
  certificates: BackendCandidateLanguageCertificateDto[];
}

export interface CreateCandidateLanguageDto {
  languageId?: string | null;
  customLanguageName?: string | null;
  overallLevel: CandidateLanguageProficiency;
  listeningLevel: CandidateLanguageProficiency;
  speakingLevel: CandidateLanguageProficiency;
  readingLevel: CandidateLanguageProficiency;
  writingLevel: CandidateLanguageProficiency;
}

export type UpdateCandidateLanguageDto = Partial<CreateCandidateLanguageDto>;

/** DTO Nguyện vọng nghề nghiệp: GET /api/v1/candidate/career-preference */
export interface BackendCandidateCareerPreferenceDto {
  id: string;
  candidateProfileId: string;
  locationMode: CandidateLocationPreferenceMode;
  salaryType: CandidateSalaryExpectationType;
  salaryMin: number | string | null;
  salaryMax: number | string | null;
  currency: string;
  salaryPeriod: CandidateSalaryPeriod;
  desiredCareerLevel: CandidateCareerLevel | null;
  availabilityType: CandidateAvailabilityType | null;
  availableFrom: string | null;
  willingToRelocate: boolean;
  createdAt: string;
  updatedAt: string;
  desiredPositions: { id?: string; title: string; displayOrder: number }[];
  preferredCategories: {
    id?: string;
    jobCategoryId: string;
    jobCategory?: { id: string; code: string; name: string };
  }[];
  preferredLocations: {
    id?: string;
    provinceId: string;
    province?: { id: string; code: string; name: string };
  }[];
  preferredEmploymentTypes: {
    id?: string;
    employmentType: CandidateEmploymentType;
  }[];
  preferredWorkplaceTypes: {
    id?: string;
    workplaceType: CandidateWorkplaceType;
  }[];
}

export interface PutCandidateCareerPreferenceDto {
  locationMode: CandidateLocationPreferenceMode;
  salaryType: CandidateSalaryExpectationType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  salaryPeriod?: CandidateSalaryPeriod;
  desiredCareerLevel?: CandidateCareerLevel | null;
  availabilityType?: CandidateAvailabilityType | null;
  availableFrom?: string | null;
  willingToRelocate?: boolean;
  desiredPositions?: string[];
  preferredCategoryIds?: string[];
  preferredProvinceIds?: string[];
  preferredEmploymentTypes?: CandidateEmploymentType[];
  preferredWorkplaceTypes?: CandidateWorkplaceType[];
}

/** DTO Quyền riêng tư: GET /api/v1/candidate/privacy (PK trên wire là candidateProfileId, không có id) */
export interface BackendCandidatePrivacyDto {
  candidateProfileId: string;
  searchableProfile: boolean;
  showEmail: boolean;
  showPhone: boolean;
  allowResumeDownload: boolean;
  allowJobMatching: boolean;
  updatedAt?: string;
}

export interface UpdateCandidatePrivacyDto {
  searchableProfile?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  allowResumeDownload?: boolean;
  allowJobMatching?: boolean;
}

/** DTO Chuyển giao Onboarding: POST /api/v1/candidate/profile/import-onboarding */
export interface ImportCandidateOnboardingDto {
  version: number;
  confirmPrivacy: true;
  confirmOmitUnsupportedAssets?: boolean;
}

/** Mã lỗi chuẩn hóa từ NestJS candidate module */
export type CandidateApiErrorCode =
  | "CANDIDATE_BOOTSTRAP_FAILED"
  | "CANDIDATE_ACCOUNT_NOT_FOUND"
  | "CANDIDATE_PROFILE_NOT_FOUND"
  | "CANDIDATE_PROFILE_ALREADY_EXISTS"
  | "CANDIDATE_ROLE_NOT_CONFIGURED"
  | "CANDIDATE_DATE_OF_BIRTH_INVALID"
  | "CANDIDATE_SALARY_RANGE_INVALID"
  | "CANDIDATE_UPDATE_EMPTY"
  | "CANDIDATE_EDUCATION_NOT_FOUND"
  | "CANDIDATE_EXPERIENCE_NOT_FOUND"
  | "CANDIDATE_SKILL_NOT_FOUND"
  | "CANDIDATE_SKILL_SOURCE_INVALID"
  | "CANDIDATE_LANGUAGE_NOT_FOUND"
  | "CANDIDATE_LANGUAGE_SOURCE_INVALID"
  | "CANDIDATE_CERTIFICATE_NOT_FOUND"
  | "CANDIDATE_CERTIFICATE_SOURCE_INVALID"
  | "CANDIDATE_CAREER_PREFERENCE_NOT_FOUND"
  | "CANDIDATE_ONBOARDING_DRAFT_NOT_FOUND"
  | "CANDIDATE_ONBOARDING_VERSION_CONFLICT"
  | "CANDIDATE_DRAFT_INVALID"
  | "CANDIDATE_DRAFT_TOO_LARGE"
  | "CANDIDATE_DRAFT_VERSION_CONFLICT"
  | "CANDIDATE_IMPORT_UNSUPPORTED_ASSETS"
  | "CANDIDATE_IMPORT_REQUEST_INVALID"
  | "CANDIDATE_ONBOARDING_EMAIL_MISMATCH"
  | "CANDIDATE_REFERENCE_CATALOG_UNAVAILABLE"
  | "CANDIDATE_REFERENCE_CATALOG_INVALID"
  | "CANDIDATE_REFERENCE_INVALID"
  | "CANDIDATE_CERTIFICATE_SCORE_INVALID"
  | "CANDIDATE_IMPORT_CONFLICT"
  | "AUTH_ACCESS_TOKEN_REQUIRED"
  | "AUTH_ACCESS_TOKEN_INVALID"
  | "AUTH_SESSION_INVALID"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NETWORK_ERROR"
  | "WRITE_GATE_BLOCKED";
