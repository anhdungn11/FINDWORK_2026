/**
 * FINDWORK CP8C — CANDIDATE PROFILE DATA NORMALIZER & ADAPTER
 *
 * Chuyển đổi và chuẩn hóa hai chiều giữa:
 * 1. Backend DTO (/api/v1/candidate/...)
 * 2. Frontend Domain View Model (FullCandidateProfileRecord, OnboardingDraftSummary, ...)
 *
 * RÀNG BUỘC KIẾN TRÚC:
 * - Ánh xạ trường rõ ràng, minh bạch, kiểm thử được 100%.
 * - Bảo toàn kiểu dữ liệu nullable vs optional.
 * - Nhất quán định dạng ngày tháng (YYYY-MM-DD), tiền tệ và mã danh mục.
 * - Phát hiện chính xác tài nguyên chưa hỗ trợ (unsupported assets) và khác biệt quyền riêng tư.
 */

import type {
  CandidateBootstrapResponse,
  BackendCandidateProfileDto,
  CreateCandidateProfileDto,
  UpdateCandidateProfileDto,
  BackendCandidateEducationDto,
  CreateCandidateEducationDto,
  UpdateCandidateEducationDto,
  BackendCandidateExperienceDto,
  CreateCandidateExperienceDto,
  UpdateCandidateExperienceDto,
  BackendCandidateSkillDto,
  CreateCandidateSkillDto,
  UpdateCandidateSkillDto,
  BackendCandidateLanguageDto,
  CreateCandidateLanguageDto,
  UpdateCandidateLanguageDto,
  BackendCandidateLanguageCertificateDto,
  CreateCandidateLanguageCertificateDto,
  UpdateCandidateLanguageCertificateDto,
  BackendCandidateCareerPreferenceDto,
  PutCandidateCareerPreferenceDto,
  BackendCandidatePrivacyDto,
  UpdateCandidatePrivacyDto,
  UnsupportedOnboardingAsset,
  CandidateImportPrivacyField,
} from "../types/candidateApi.types";
import {
  CANDIDATE_IMPORT_PRIVACY_DEFAULTS,
  CANDIDATE_PRIVACY_FIELD_METADATA,
} from "../types/candidateApi.types";
import type {
  FullCandidateProfileRecord,
  CandidateEducationRecord,
  CandidateExperienceRecord,
  CandidateSkillRecord,
  CandidateLanguageRecord,
  CandidateLanguageCertificateRecord,
  CandidateCareerPreferenceRecord,
  CandidatePrivacySettingRecord,
  OnboardingDraftSummary,
  CandidateProfilePresentationState,
  CandidateLocationRef,
} from "../types/candidateProfile.types";
import { DEFAULT_PRIVACY_SETTINGS } from "../types/candidateProfile.types";
import type { CandidateOnboardingData } from "../../types/onboarding.types";
import type { OnboardingDraft } from "../../services/onboardingDraft";

/** Chuyển đổi an toàn giá trị Decimal (string | number | null) từ Prisma sang number | null */
export function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Chuẩn hóa chuỗi ngày (@db.Date hoặc ISO 8601) về định dạng YYYY-MM-DD */
export function normalizeDateOnly(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return isoMatch ? isoMatch[1] : trimmed;
}

/** Phân tích và quyết định trạng thái giao diện khởi tạo từ Bootstrap API */
export function resolveBootstrapPresentationState(
  bootstrap: CandidateBootstrapResponse,
  hasViewPermission = true,
): CandidateProfilePresentationState {
  // 1. Nếu tài khoản bị từ chối quyền xem hồ sơ hoặc không có bất kỳ quyền ứng viên nào
  if (
    !hasViewPermission ||
    (bootstrap.profile.canViewProfile === false && bootstrap.profile.state === "exists") ||
    (bootstrap.profile.canViewProfile === false && bootstrap.profile.canCreateProfile === false)
  ) {
    return "forbidden";
  }

  // 2. Nếu hồ sơ chính thức đã tồn tại trong database
  if (bootstrap.profile.state === "exists") {
    return "existing_profile";
  }

  // 3. Nếu chưa tạo hồ sơ, kiểm tra tình trạng bản nháp Onboarding
  if (bootstrap.profile.state === "not_created") {
    if (bootstrap.draft.state === "exists") {
      return "not_created_with_draft";
    }
    return "not_created_no_draft";
  }

  return "eligibility_unknown";
}

/** Chuẩn hóa bản ghi Học vấn */
export function normalizeEducation(dto: BackendCandidateEducationDto): CandidateEducationRecord {
  return {
    id: dto.id,
    candidateProfileId: dto.candidateProfileId,
    school: dto.school,
    degree: dto.degree,
    major: dto.major,
    location: dto.location,
    startMonth: dto.startMonth,
    startYear: dto.startYear,
    endMonth: dto.endMonth,
    endYear: dto.endYear,
    isStudying: Boolean(dto.isStudying),
    gpa: toNullableNumber(dto.gpa),
    gpaScale: toNullableNumber(dto.gpaScale),
    achievements: dto.achievements,
    description: dto.description,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Chuẩn hóa bản ghi Kinh nghiệm */
export function normalizeExperience(dto: BackendCandidateExperienceDto): CandidateExperienceRecord {
  return {
    id: dto.id,
    candidateProfileId: dto.candidateProfileId,
    companyName: dto.companyName,
    position: dto.position,
    employmentType: dto.employmentType,
    workplaceType: dto.workplaceType,
    location: dto.location,
    startMonth: dto.startMonth,
    startYear: dto.startYear,
    endMonth: dto.endMonth,
    endYear: dto.endYear,
    isCurrent: Boolean(dto.isCurrent),
    description: dto.description,
    achievements: dto.achievements,
    skills: Array.isArray(dto.skills)
      ? dto.skills.map((s) => ({
          id: s.id,
          skillId: s.skillId,
          skillName: s.skillName,
        }))
      : [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Chuẩn hóa bản ghi Kỹ năng */
export function normalizeSkill(dto: BackendCandidateSkillDto): CandidateSkillRecord {
  const resolvedName = dto.skill?.name || dto.customSkillName || "Kỹ năng chuyên môn";
  return {
    id: dto.id,
    candidateProfileId: dto.candidateProfileId,
    skillId: dto.skillId,
    customSkillName: dto.customSkillName,
    skillName: resolvedName,
    level: dto.level,
    yearsOfExperience: toNullableNumber(dto.yearsOfExperience),
    isHighlighted: Boolean(dto.isHighlighted),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Chuẩn hóa Chứng chỉ Ngoại ngữ */
export function normalizeLanguageCertificate(
  dto: BackendCandidateLanguageCertificateDto,
): CandidateLanguageCertificateRecord {
  const resolvedCertificateName =
    dto.certificateType?.label ||
    dto.certificateType?.code ||
    dto.customCertificateName ||
    "Chứng chỉ ngoại ngữ";
  return {
    id: dto.id,
    candidateLanguageId: dto.candidateLanguageId,
    certificateTypeId: dto.certificateTypeId,
    customCertificateName: dto.customCertificateName,
    certificateName: resolvedCertificateName,
    level: dto.level,
    overallScore: dto.overallScore,
    scores: dto.scores,
    issuedDate: normalizeDateOnly(dto.issuedDate),
    expiryDate: normalizeDateOnly(dto.expiryDate),
    issuer: dto.issuer,
    credentialId: dto.credentialId,
    verificationUrl: dto.verificationUrl,
  };
}

/** Chuẩn hóa bản ghi Ngoại ngữ */
export function normalizeLanguage(dto: BackendCandidateLanguageDto): CandidateLanguageRecord {
  const resolvedName = dto.language?.label || dto.customLanguageName || "Ngoại ngữ";
  return {
    id: dto.id,
    candidateProfileId: dto.candidateProfileId,
    languageId: dto.languageId,
    customLanguageName: dto.customLanguageName,
    languageName: resolvedName,
    overallLevel: dto.overallLevel,
    listeningLevel: dto.listeningLevel,
    speakingLevel: dto.speakingLevel,
    readingLevel: dto.readingLevel,
    writingLevel: dto.writingLevel,
    certificates: Array.isArray(dto.certificates)
      ? dto.certificates.map(normalizeLanguageCertificate)
      : [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Chuẩn hóa bản ghi Nguyện vọng nghề nghiệp */
export function normalizeCareerPreference(
  dto: BackendCandidateCareerPreferenceDto,
): CandidateCareerPreferenceRecord {
  return {
    id: dto.id,
    candidateProfileId: dto.candidateProfileId,
    locationMode: dto.locationMode,
    salaryType: dto.salaryType,
    salaryMin: toNullableNumber(dto.salaryMin),
    salaryMax: toNullableNumber(dto.salaryMax),
    currency: dto.currency || "VND",
    salaryPeriod: dto.salaryPeriod || "MONTH",
    desiredCareerLevel: dto.desiredCareerLevel,
    availabilityType: dto.availabilityType,
    availableFrom: normalizeDateOnly(dto.availableFrom),
    willingToRelocate: Boolean(dto.willingToRelocate),
    desiredPositions: Array.isArray(dto.desiredPositions)
      ? dto.desiredPositions.map((pos) => pos.title)
      : [],
    preferredCategories: Array.isArray(dto.preferredCategories)
      ? dto.preferredCategories.map((cat) => cat.jobCategory?.name || cat.jobCategoryId)
      : [],
    preferredCategoryIds: Array.isArray(dto.preferredCategories)
      ? dto.preferredCategories.map((cat) => cat.jobCategoryId)
      : [],
    preferredLocations: Array.isArray(dto.preferredLocations)
      ? dto.preferredLocations.map((loc) => ({
          id: loc.provinceId,
          code: loc.province?.code || "",
          name: loc.province?.name || loc.provinceId,
        }))
      : [],
    preferredEmploymentTypes: Array.isArray(dto.preferredEmploymentTypes)
      ? dto.preferredEmploymentTypes.map((item) => item.employmentType)
      : [],
    preferredWorkplaceTypes: Array.isArray(dto.preferredWorkplaceTypes)
      ? dto.preferredWorkplaceTypes.map((item) => item.workplaceType)
      : [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Chuẩn hóa payload phản hồi từ GET /api/v1/candidate/privacy tại ranh giới API.
 * Khi chưa tồn tại bản ghi CandidatePrivacySetting trong DB, NestJS trả về HTTP 200
 * với body rỗng ("") — Axios giữ nguyên chuỗi rỗng "" thay vì JSON null.
 */
export function normalizePrivacyPayload(raw: unknown): BackendCandidatePrivacyDto | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  if (
    typeof candidate.candidateProfileId !== "string" ||
    candidate.candidateProfileId.trim().length === 0
  ) {
    return null;
  }
  return {
    candidateProfileId: candidate.candidateProfileId.trim(),
    searchableProfile: Boolean(candidate.searchableProfile),
    showEmail: Boolean(candidate.showEmail),
    showPhone: Boolean(candidate.showPhone),
    allowResumeDownload: Boolean(candidate.allowResumeDownload),
    allowJobMatching:
      candidate.allowJobMatching !== undefined ? Boolean(candidate.allowJobMatching) : true,
    ...(typeof candidate.updatedAt === "string" ? { updatedAt: candidate.updatedAt } : {}),
  };
}

/** Kiểm tra xem bản ghi quyền riêng tư có phải là bản ghi đã lưu trên cơ sở dữ liệu hay chỉ là mặc định tạm */
export function isPersistedPrivacySetting(
  record?: CandidatePrivacySettingRecord | null,
): boolean {
  return Boolean(
    record &&
      typeof record.candidateProfileId === "string" &&
      record.candidateProfileId.trim().length > 0,
  );
}

/**
 * Chuẩn hóa bản ghi Quyền riêng tư cho Domain View Model.
 * - Khi vắng mặt (null / undefined / empty body ""): trả về giá trị mặc định an toàn
 *   tương thích Prisma (false, false, false, false, true) để tránh ngoại lệ UI, nhưng
 *   không gán candidateProfileId hay id giả mạo nhằm bảo toàn ngữ nghĩa "chưa lưu DB".
 * - Khi có bản ghi từ backend: ánh xạ theo khóa chính candidateProfileId, không bịa id.
 */
export function normalizePrivacy(
  dto?: BackendCandidatePrivacyDto | null | unknown,
): CandidatePrivacySettingRecord {
  const normalizedDto = normalizePrivacyPayload(dto);
  if (!normalizedDto) {
    return { ...DEFAULT_PRIVACY_SETTINGS };
  }
  return {
    candidateProfileId: normalizedDto.candidateProfileId,
    searchableProfile: normalizedDto.searchableProfile,
    showEmail: normalizedDto.showEmail,
    showPhone: normalizedDto.showPhone,
    allowResumeDownload: normalizedDto.allowResumeDownload,
    allowJobMatching: normalizedDto.allowJobMatching,
    ...(normalizedDto.updatedAt ? { updatedAt: normalizedDto.updatedAt } : {}),
  };
}

/** Lắp ráp hồ sơ hoàn chỉnh từ backend profile DTO và các danh sách con */
export function normalizeFullCandidateProfile(
  profileDto: BackendCandidateProfileDto,
  options?: {
    education?: BackendCandidateEducationDto[];
    experience?: BackendCandidateExperienceDto[];
    skills?: BackendCandidateSkillDto[];
    languages?: BackendCandidateLanguageDto[];
    careerPreference?: BackendCandidateCareerPreferenceDto | null;
    privacySetting?: BackendCandidatePrivacyDto | null;
  },
): FullCandidateProfileRecord {
  const province: CandidateLocationRef | null = profileDto.province
    ? {
        id: profileDto.province.id,
        code: profileDto.province.code,
        name: profileDto.province.name,
        divisionType: profileDto.province.divisionType,
      }
    : null;

  const ward: CandidateLocationRef | null = profileDto.ward
    ? {
        id: profileDto.ward.id,
        code: profileDto.ward.code,
        name: profileDto.ward.name,
        divisionType: profileDto.ward.divisionType,
      }
    : null;

  const rawEducation = options?.education ?? profileDto.education ?? [];
  const rawExperience = options?.experience ?? profileDto.experience ?? [];
  const rawSkills = options?.skills ?? profileDto.skills ?? [];
  const rawLanguages = options?.languages ?? profileDto.languages ?? [];
  const rawCareerPreference =
    options?.careerPreference !== undefined
      ? (options.careerPreference ?? profileDto.careerPreference ?? null)
      : (profileDto.careerPreference ?? null);
  const rawPrivacySetting =
    options?.privacySetting !== undefined
      ? (options.privacySetting ?? profileDto.privacySetting ?? null)
      : (profileDto.privacySetting ?? null);

  return {
    id: profileDto.id,
    userId: profileDto.userId,
    fullName: profileDto.fullName,
    phone: profileDto.phone,
    dateOfBirth: normalizeDateOnly(profileDto.dateOfBirth),
    gender: profileDto.gender,
    countryCode: profileDto.countryCode,
    provinceId: profileDto.provinceId,
    wardId: profileDto.wardId,
    province,
    ward,
    addressLine: profileDto.addressLine,
    bio: profileDto.bio,
    avatarAssetKey: profileDto.avatarAssetKey,
    careerStatus: profileDto.careerStatus,
    createdAt: profileDto.createdAt,
    updatedAt: profileDto.updatedAt,
    education: Array.isArray(rawEducation) ? rawEducation.map(normalizeEducation) : [],
    experience: Array.isArray(rawExperience) ? rawExperience.map(normalizeExperience) : [],
    skills: Array.isArray(rawSkills) ? rawSkills.map(normalizeSkill) : [],
    languages: Array.isArray(rawLanguages) ? rawLanguages.map(normalizeLanguage) : [],
    careerPreference: rawCareerPreference ? normalizeCareerPreference(rawCareerPreference) : null,
    privacySetting: normalizePrivacy(rawPrivacySetting),
  };
}

// -----------------------------------------------------------------------------
// DRAFT ANALYSIS & COMPARISON ENGINE
// -----------------------------------------------------------------------------

/**
 * Phát hiện chính xác tài nguyên chưa hỗ trợ theo hợp đồng CP8A:
 * - Avatar: có dữ liệu chuỗi không rỗng trong personal.avatarUrl
 * - Resume: một trong resumeName, resumeUrl, fileName, mimeType không rỗng,
 *   hoặc fileSize !== null, hoặc hasExistingResume === true.
 * (Không tính resume.createLater vì là trạng thái UI).
 */
export function detectUnsupportedAssets(data: CandidateOnboardingData): UnsupportedOnboardingAsset[] {
  const assets: UnsupportedOnboardingAsset[] = [];

  const hasAvatar = Boolean(data.personal?.avatarUrl && data.personal.avatarUrl.trim().length > 0);
  if (hasAvatar) {
    assets.push("avatar");
  }

  const resume = data.resume;
  const hasResumeText = Boolean(
    (resume?.resumeName && resume.resumeName.trim().length > 0) ||
    (resume?.resumeUrl && resume.resumeUrl.trim().length > 0) ||
    (resume?.fileName && resume.fileName.trim().length > 0) ||
    (resume?.mimeType && resume.mimeType.trim().length > 0)
  );
  const hasResumeFile = resume?.fileSize !== null && resume?.fileSize !== undefined;
  const hasExistingResume = Boolean(resume?.hasExistingResume);

  if (hasResumeText || hasResumeFile || hasExistingResume) {
    assets.push("resume");
  }

  return assets;
}

export interface PrivacyDifferenceItem {
  field: CandidateImportPrivacyField;
  draftValue: boolean;
  defaultValue: boolean;
  label: string;
  description: string;
  explanation: string;
}

/**
 * So sánh từng trường quyền riêng tư của bản nháp với mặc định sẽ được tạo.
 * Kể cả trường hợp allowJobMatching trong draft là false, vì mặc định là true.
 */
export function computePrivacyDifferences(
  draftPrivacy?: Partial<Record<CandidateImportPrivacyField, boolean>> | null,
): PrivacyDifferenceItem[] {
  if (!draftPrivacy) return [];

  const fields = Object.keys(CANDIDATE_IMPORT_PRIVACY_DEFAULTS) as CandidateImportPrivacyField[];
  const differences: PrivacyDifferenceItem[] = [];

  for (const field of fields) {
    const draftValue = draftPrivacy[field] ?? false;
    const defaultValue = CANDIDATE_IMPORT_PRIVACY_DEFAULTS[field];

    if (draftValue !== defaultValue) {
      const meta = CANDIDATE_PRIVACY_FIELD_METADATA[field];
      const draftStateText = draftValue ? "Bật" : "Tắt";
      const defaultStateText = defaultValue ? "Bật (Khuyên dùng)" : "Tắt (Riêng tư an toàn)";

      differences.push({
        field,
        draftValue,
        defaultValue,
        label: meta.label,
        description: meta.description,
        explanation: `Trong bản nháp bạn đã chọn: ${draftStateText}, nhưng hệ thống sẽ khởi tạo mặc định là: ${defaultStateText}.`,
      });
    }
  }

  return differences;
}

/** Xây dựng tóm tắt OnboardingDraftSummary trung thực từ OnboardingDraft */
export function buildDraftSummaryFromDraft(draft: OnboardingDraft): OnboardingDraftSummary {
  const d = draft.data;
  const unsupported = detectUnsupportedAssets(d);

  return {
    version: draft.version,
    stepIndex: draft.stepIndex,
    updatedAt: draft.updatedAt,
    fullName: d.personal?.fullName || "",
    phone: d.personal?.phone || "",
    dateOfBirth: d.personal?.dateOfBirth || "",
    gender: d.personal?.gender || "",
    addressLine: d.personal?.addressLine || "",
    provinceName: d.personal?.provinceCode || "",
    educationCount: Array.isArray(d.education) ? d.education.length : 0,
    experienceCount: Array.isArray(d.experience) ? d.experience.length : 0,
    skillsCount: Array.isArray(d.skills) ? d.skills.length : 0,
    languagesCount: Array.isArray(d.languages) ? d.languages.length : 0,
    hasPreferences: Boolean(
      (d.preferences?.desiredPositions && d.preferences.desiredPositions.length > 0) ||
      (d.preferences?.preferredCategoryCodes && d.preferences.preferredCategoryCodes.length > 0)
    ),
    hasLocalAvatarFile: unsupported.includes("avatar"),
    hasLocalResumeFile: unsupported.includes("resume"),
  };
}

// -----------------------------------------------------------------------------
// DOMAIN VIEW MODEL -> BACKEND DTO MAPPERS
// -----------------------------------------------------------------------------

export function toCreateProfileDto(data: Partial<FullCandidateProfileRecord>): CreateCandidateProfileDto {
  return {
    fullName: data.fullName || "",
    phone: data.phone ?? null,
    dateOfBirth: normalizeDateOnly(data.dateOfBirth),
    gender: data.gender ?? null,
    countryCode: data.countryCode ?? "VN",
    provinceId: data.provinceId ?? null,
    wardId: data.wardId ?? null,
    addressLine: data.addressLine ?? null,
    bio: data.bio ?? null,
    avatarAssetKey: data.avatarAssetKey ?? null,
    careerStatus: data.careerStatus ?? null,
  };
}

export function toUpdateProfileDto(data: Partial<FullCandidateProfileRecord>): UpdateCandidateProfileDto {
  const dto: UpdateCandidateProfileDto = {};
  if (data.fullName !== undefined) dto.fullName = data.fullName;
  if (data.phone !== undefined) dto.phone = data.phone;
  if (data.dateOfBirth !== undefined) dto.dateOfBirth = normalizeDateOnly(data.dateOfBirth);
  if (data.gender !== undefined) dto.gender = data.gender;
  if (data.countryCode !== undefined) dto.countryCode = data.countryCode;
  if (data.provinceId !== undefined) dto.provinceId = data.provinceId;
  if (data.wardId !== undefined) dto.wardId = data.wardId;
  if (data.addressLine !== undefined) dto.addressLine = data.addressLine;
  if (data.bio !== undefined) dto.bio = data.bio;
  if (data.avatarAssetKey !== undefined) dto.avatarAssetKey = data.avatarAssetKey;
  if (data.careerStatus !== undefined) dto.careerStatus = data.careerStatus;
  return dto;
}

export function toCreateEducationDto(record: Omit<CandidateEducationRecord, "id">): CreateCandidateEducationDto {
  return {
    school: record.school,
    degree: record.degree,
    major: record.major,
    location: record.location ?? null,
    startMonth: record.startMonth,
    startYear: record.startYear,
    endMonth: record.endMonth ?? null,
    endYear: record.endYear ?? null,
    isStudying: record.isStudying ?? false,
    gpa: toNullableNumber(record.gpa),
    gpaScale: toNullableNumber(record.gpaScale),
    achievements: record.achievements ?? null,
    description: record.description ?? null,
  };
}

export function toUpdateEducationDto(record: Partial<CandidateEducationRecord>): UpdateCandidateEducationDto {
  const dto: UpdateCandidateEducationDto = {};
  if (record.school !== undefined) dto.school = record.school;
  if (record.degree !== undefined) dto.degree = record.degree;
  if (record.major !== undefined) dto.major = record.major;
  if (record.location !== undefined) dto.location = record.location;
  if (record.startMonth !== undefined) dto.startMonth = record.startMonth;
  if (record.startYear !== undefined) dto.startYear = record.startYear;
  if (record.endMonth !== undefined) dto.endMonth = record.endMonth;
  if (record.endYear !== undefined) dto.endYear = record.endYear;
  if (record.isStudying !== undefined) dto.isStudying = record.isStudying;
  if (record.gpa !== undefined) dto.gpa = toNullableNumber(record.gpa);
  if (record.gpaScale !== undefined) dto.gpaScale = toNullableNumber(record.gpaScale);
  if (record.achievements !== undefined) dto.achievements = record.achievements;
  if (record.description !== undefined) dto.description = record.description;
  return dto;
}

export function toCreateExperienceDto(record: Omit<CandidateExperienceRecord, "id">): CreateCandidateExperienceDto {
  return {
    companyName: record.companyName,
    position: record.position,
    employmentType: record.employmentType,
    workplaceType: record.workplaceType,
    location: record.location ?? null,
    startMonth: record.startMonth,
    startYear: record.startYear,
    endMonth: record.endMonth ?? null,
    endYear: record.endYear ?? null,
    isCurrent: record.isCurrent ?? false,
    description: record.description ?? null,
    achievements: record.achievements ?? null,
    skills: Array.isArray(record.skills)
      ? record.skills.map((s) => {
          const hasMasterSkillId = Boolean(s.skillId && s.skillId.trim().length > 0);
          return {
            skillId: hasMasterSkillId ? s.skillId!.trim() : null,
            skillName: hasMasterSkillId ? null : (s.skillName?.trim() || null),
          };
        })
      : [],
  };
}

export function toUpdateExperienceDto(record: Partial<CandidateExperienceRecord>): UpdateCandidateExperienceDto {
  const dto: UpdateCandidateExperienceDto = {};
  if (record.companyName !== undefined) dto.companyName = record.companyName;
  if (record.position !== undefined) dto.position = record.position;
  if (record.employmentType !== undefined) dto.employmentType = record.employmentType;
  if (record.workplaceType !== undefined) dto.workplaceType = record.workplaceType;
  if (record.location !== undefined) dto.location = record.location;
  if (record.startMonth !== undefined) dto.startMonth = record.startMonth;
  if (record.startYear !== undefined) dto.startYear = record.startYear;
  if (record.endMonth !== undefined) dto.endMonth = record.endMonth;
  if (record.endYear !== undefined) dto.endYear = record.endYear;
  if (record.isCurrent !== undefined) dto.isCurrent = record.isCurrent;
  if (record.description !== undefined) dto.description = record.description;
  if (record.achievements !== undefined) dto.achievements = record.achievements;
  if (record.skills !== undefined) {
    dto.skills = record.skills.map((s) => {
      const hasMasterSkillId = Boolean(s.skillId && s.skillId.trim().length > 0);
      return {
        skillId: hasMasterSkillId ? s.skillId!.trim() : null,
        skillName: hasMasterSkillId ? null : (s.skillName?.trim() || null),
      };
    });
  }
  return dto;
}

export function toCreateSkillDto(record: Omit<CandidateSkillRecord, "id">): CreateCandidateSkillDto {
  const hasMasterSkillId = Boolean(record.skillId && record.skillId.trim().length > 0);
  const customSkillName = hasMasterSkillId
    ? null
    : (record.customSkillName?.trim() || record.skillName?.trim() || null);
  return {
    skillId: hasMasterSkillId ? record.skillId!.trim() : null,
    customSkillName,
    level: record.level,
    yearsOfExperience: toNullableNumber(record.yearsOfExperience),
    isHighlighted: record.isHighlighted ?? false,
  };
}

export function toUpdateSkillDto(record: Partial<CandidateSkillRecord>): UpdateCandidateSkillDto {
  const dto: UpdateCandidateSkillDto = {};
  if (
    record.skillId !== undefined ||
    record.customSkillName !== undefined ||
    record.skillName !== undefined
  ) {
    const hasMasterSkillId = Boolean(record.skillId && record.skillId.trim().length > 0);
    dto.skillId = hasMasterSkillId ? record.skillId!.trim() : null;
    dto.customSkillName = hasMasterSkillId
      ? null
      : (record.customSkillName?.trim() || record.skillName?.trim() || null);
  }
  if (record.level !== undefined) dto.level = record.level;
  if (record.yearsOfExperience !== undefined) {
    dto.yearsOfExperience = toNullableNumber(record.yearsOfExperience);
  }
  if (record.isHighlighted !== undefined) dto.isHighlighted = record.isHighlighted;
  return dto;
}

export function toCreateLanguageDto(record: Omit<CandidateLanguageRecord, "id">): CreateCandidateLanguageDto {
  const hasMasterLanguageId = Boolean(record.languageId && record.languageId.trim().length > 0);
  const customLanguageName = hasMasterLanguageId
    ? null
    : (record.customLanguageName?.trim() || record.languageName?.trim() || null);
  return {
    languageId: hasMasterLanguageId ? record.languageId!.trim() : null,
    customLanguageName,
    overallLevel: record.overallLevel,
    listeningLevel: record.listeningLevel ?? record.overallLevel,
    speakingLevel: record.speakingLevel ?? record.overallLevel,
    readingLevel: record.readingLevel ?? record.overallLevel,
    writingLevel: record.writingLevel ?? record.overallLevel,
  };
}

export function toUpdateLanguageDto(record: Partial<CandidateLanguageRecord>): UpdateCandidateLanguageDto {
  const dto: UpdateCandidateLanguageDto = {};
  if (
    record.languageId !== undefined ||
    record.customLanguageName !== undefined ||
    record.languageName !== undefined
  ) {
    const hasMasterLanguageId = Boolean(record.languageId && record.languageId.trim().length > 0);
    dto.languageId = hasMasterLanguageId ? record.languageId!.trim() : null;
    dto.customLanguageName = hasMasterLanguageId
      ? null
      : (record.customLanguageName?.trim() || record.languageName?.trim() || null);
  }
  if (record.overallLevel !== undefined) dto.overallLevel = record.overallLevel;
  if (record.listeningLevel !== undefined && record.listeningLevel !== null) {
    dto.listeningLevel = record.listeningLevel;
  }
  if (record.speakingLevel !== undefined && record.speakingLevel !== null) {
    dto.speakingLevel = record.speakingLevel;
  }
  if (record.readingLevel !== undefined && record.readingLevel !== null) {
    dto.readingLevel = record.readingLevel;
  }
  if (record.writingLevel !== undefined && record.writingLevel !== null) {
    dto.writingLevel = record.writingLevel;
  }
  return dto;
}

export function toCreateCertificateDto(
  record: Omit<CandidateLanguageCertificateRecord, "id">,
): CreateCandidateLanguageCertificateDto {
  const hasMasterCertId = Boolean(record.certificateTypeId && record.certificateTypeId.trim().length > 0);
  const customCertificateName = hasMasterCertId
    ? null
    : (record.customCertificateName?.trim() || record.certificateName?.trim() || null);
  return {
    certificateTypeId: hasMasterCertId ? record.certificateTypeId!.trim() : null,
    customCertificateName,
    level: record.level ?? null,
    overallScore: record.overallScore ?? null,
    scores: (record.scores as Record<string, unknown>) ?? null,
    issuedDate: normalizeDateOnly(record.issuedDate),
    expiryDate: normalizeDateOnly(record.expiryDate),
    issuer: record.issuer ?? null,
    credentialId: record.credentialId ?? null,
    verificationUrl: record.verificationUrl ?? null,
  };
}

export function toUpdateCertificateDto(
  record: Partial<CandidateLanguageCertificateRecord>,
): UpdateCandidateLanguageCertificateDto {
  const dto: UpdateCandidateLanguageCertificateDto = {};
  if (
    record.certificateTypeId !== undefined ||
    record.customCertificateName !== undefined ||
    record.certificateName !== undefined
  ) {
    const hasMasterCertId = Boolean(record.certificateTypeId && record.certificateTypeId.trim().length > 0);
    dto.certificateTypeId = hasMasterCertId ? record.certificateTypeId!.trim() : null;
    dto.customCertificateName = hasMasterCertId
      ? null
      : (record.customCertificateName?.trim() || record.certificateName?.trim() || null);
  }
  if (record.level !== undefined) dto.level = record.level;
  if (record.overallScore !== undefined) dto.overallScore = record.overallScore;
  if (record.scores !== undefined) dto.scores = record.scores as Record<string, unknown>;
  if (record.issuedDate !== undefined) dto.issuedDate = normalizeDateOnly(record.issuedDate);
  if (record.expiryDate !== undefined) dto.expiryDate = normalizeDateOnly(record.expiryDate);
  if (record.issuer !== undefined) dto.issuer = record.issuer;
  if (record.credentialId !== undefined) dto.credentialId = record.credentialId;
  if (record.verificationUrl !== undefined) dto.verificationUrl = record.verificationUrl;
  return dto;
}

export function toPutCareerPreferenceDto(
  record: CandidateCareerPreferenceRecord,
): PutCandidateCareerPreferenceDto {
  return {
    locationMode: record.locationMode,
    salaryType: record.salaryType,
    salaryMin: toNullableNumber(record.salaryMin),
    salaryMax: toNullableNumber(record.salaryMax),
    currency: record.currency || "VND",
    salaryPeriod: record.salaryPeriod || "MONTH",
    desiredCareerLevel: record.desiredCareerLevel ?? null,
    availabilityType: record.availabilityType ?? null,
    availableFrom: normalizeDateOnly(record.availableFrom),
    willingToRelocate: Boolean(record.willingToRelocate),
    desiredPositions: record.desiredPositions || [],
    preferredCategoryIds: record.preferredCategoryIds ?? record.preferredCategories ?? [],
    preferredProvinceIds:
      record.locationMode === "NATIONWIDE"
        ? []
        : (record.preferredLocations || []).map((loc) => loc.id),
    preferredEmploymentTypes: record.preferredEmploymentTypes || [],
    preferredWorkplaceTypes: record.preferredWorkplaceTypes || [],
  };
}

export function toUpdatePrivacyDto(record: Partial<CandidatePrivacySettingRecord>): UpdateCandidatePrivacyDto {
  const dto: UpdateCandidatePrivacyDto = {};
  if (record.searchableProfile !== undefined) dto.searchableProfile = record.searchableProfile;
  if (record.showEmail !== undefined) dto.showEmail = record.showEmail;
  if (record.showPhone !== undefined) dto.showPhone = record.showPhone;
  if (record.allowResumeDownload !== undefined) dto.allowResumeDownload = record.allowResumeDownload;
  if (record.allowJobMatching !== undefined) dto.allowJobMatching = record.allowJobMatching;
  return dto;
}
