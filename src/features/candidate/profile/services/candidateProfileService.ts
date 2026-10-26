/**
 * FINDWORK CP8C — CANDIDATE PROFILE API SERVICE & TRANSPORT ADAPTER
 *
 * Vị trí: src/features/candidate/profile/services/candidateProfileService.ts
 * Phạm vi: Tầng giao tiếp mạng (Network Transport Layer) với backend NestJS.
 *
 * NGUYÊN TẮC THIẾT KẾ:
 * 1. Tận dụng apiClient hiện có (Axios), tự động đính kèm Access Token qua interceptor.
 * 2. Phân định rõ ràng:
 *    - 401: Chưa xác thực (hết hạn session).
 *    - 403: Không có quyền (profile.view / profile.update). Tuyệt đối không nhầm với "chưa tạo hồ sơ".
 *    - 404: Không tìm thấy hồ sơ hoặc bản nháp.
 *    - 409: Xung đột phiên bản bản nháp hoặc hồ sơ đã được tạo.
 *    - 503: Danh mục tham chiếu hệ thống chưa sẵn sàng.
 * 3. Bảo vệ bởi Activation Safety Gate: Tất cả mutation ghi đều kiểm tra assertLiveWritesAllowed().
 * 4. Không tự động retry POST import non-idempotent.
 */

import axios, { type AxiosError } from "axios";
import { apiClient } from "../../../../services/http/apiClient";
import { API_ENDPOINTS } from "../../../../services/http/endpoints";
import { assertLiveWritesAllowed } from "../config/candidateIntegrationConfig";
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
  ImportCandidateOnboardingDto,
  CandidateApiErrorCode,
  UnsupportedOnboardingAsset,
} from "../types/candidateApi.types";
import {
  normalizeFullCandidateProfile,
  normalizePrivacyPayload,
} from "../adapters/candidateProfileNormalizer";
import type { FullCandidateProfileRecord } from "../types/candidateProfile.types";

export interface CandidateServiceErrorDetails {
  unsupportedAssets?: UnsupportedOnboardingAsset[];
  catalog?: string;
  validationMessages?: string[];
  raw?: unknown;
}

export class CandidateServiceError extends Error {
  readonly status: number;
  readonly code: CandidateApiErrorCode;
  readonly details?: CandidateServiceErrorDetails;

  constructor(message: string, status: number, code: CandidateApiErrorCode, details?: CandidateServiceErrorDetails) {
    super(message);
    this.name = "CandidateServiceError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Chuẩn hóa lỗi từ response Axios sang CandidateServiceError */
export function mapCandidateApiError(error: unknown): CandidateServiceError {
  if (error instanceof CandidateServiceError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      code?: string;
      message?: string | string[];
      details?: { unsupportedAssets?: UnsupportedOnboardingAsset[]; catalog?: string };
      catalog?: string;
    }>;

    const status = axiosError.response?.status || 0;
    const data = axiosError.response?.data;
    const serverCode = data?.code as CandidateApiErrorCode | undefined;
    const rawMessage = data?.message;
    const details: CandidateServiceErrorDetails = {
      unsupportedAssets: data?.details?.unsupportedAssets,
      catalog: data?.details?.catalog ?? data?.catalog,
      raw: data,
    };

    if (Array.isArray(rawMessage)) {
      details.validationMessages = rawMessage;
    }

    const messageText = Array.isArray(rawMessage)
      ? rawMessage.join("; ")
      : typeof rawMessage === "string"
        ? rawMessage
        : axiosError.message || "Đã xảy ra lỗi kết nối với máy chủ.";

    switch (status) {
      case 400:
        if (serverCode === "CANDIDATE_IMPORT_PRIVACY_DIFFERENCES") {
          return new CandidateServiceError(
            "Cần xác nhận các thay đổi giữa lựa chọn quyền riêng tư trong bản nháp và thiết lập khởi tạo hồ sơ ban đầu.",
            400,
            "CANDIDATE_IMPORT_PRIVACY_DIFFERENCES",
            details,
          );
        }
        if (serverCode === "CANDIDATE_IMPORT_UNSUPPORTED_ASSETS") {
          return new CandidateServiceError(
            "Cần xác nhận bỏ qua các tài nguyên chưa được lưu trữ trước khi tạo hồ sơ.",
            400,
            "CANDIDATE_IMPORT_UNSUPPORTED_ASSETS",
            details,
          );
        }
        return new CandidateServiceError(
          messageText || "Dữ liệu yêu cầu không hợp lệ.",
          400,
          serverCode || "CANDIDATE_IMPORT_REQUEST_INVALID",
          details,
        );

      case 401:
        return new CandidateServiceError(
          "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
          401,
          "UNAUTHORIZED",
          details,
        );

      case 403:
        return new CandidateServiceError(
          "Bạn không có quyền thực hiện thao tác này trên hồ sơ ứng viên.",
          403,
          "FORBIDDEN",
          details,
        );

      case 404:
        if (serverCode === "CANDIDATE_ONBOARDING_DRAFT_NOT_FOUND") {
          return new CandidateServiceError(
            "Không tìm thấy bản nháp Onboarding.",
            404,
            "CANDIDATE_ONBOARDING_DRAFT_NOT_FOUND",
            details,
          );
        }
        return new CandidateServiceError(
          "Hồ sơ ứng viên chưa tồn tại.",
          404,
          serverCode || "CANDIDATE_PROFILE_NOT_FOUND",
          details,
        );

      case 409:
        if (serverCode === "CANDIDATE_ONBOARDING_VERSION_CONFLICT") {
          return new CandidateServiceError(
            "Bản nháp đã được cập nhật ở một phiên khác. Vui lòng tải lại trang để xem dữ liệu mới nhất.",
            409,
            "CANDIDATE_ONBOARDING_VERSION_CONFLICT",
            details,
          );
        }
        if (serverCode === "CANDIDATE_PROFILE_ALREADY_EXISTS") {
          return new CandidateServiceError(
            "Hồ sơ ứng viên đã được tạo trước đó.",
            409,
            "CANDIDATE_PROFILE_ALREADY_EXISTS",
            details,
          );
        }
        return new CandidateServiceError(
          messageText || "Xung đột dữ liệu khi cập nhật hồ sơ.",
          409,
          serverCode || "CANDIDATE_IMPORT_CONFLICT",
          details,
        );

      case 503:
        return new CandidateServiceError(
          `Danh mục tham chiếu hệ thống (${details.catalog || "hệ thống"}) tạm thời chưa sẵn sàng. Vui lòng thử lại sau.`,
          503,
          "CANDIDATE_REFERENCE_CATALOG_UNAVAILABLE",
          details,
        );

      default:
        return new CandidateServiceError(
          messageText || "Không thể kết nối tới dịch vụ hồ sơ ứng viên.",
          status || 500,
          "NETWORK_ERROR",
          details,
        );
    }
  }

  if (error instanceof Error) {
    if ("code" in error && error.code === "WRITE_GATE_BLOCKED") {
      return new CandidateServiceError(
        error.message,
        403,
        "WRITE_GATE_BLOCKED",
      );
    }
    return new CandidateServiceError(error.message, 500, "NETWORK_ERROR");
  }

  return new CandidateServiceError("Đã có sự cố không xác định xảy ra.", 500, "NETWORK_ERROR");
}

export const candidateProfileService = {
  // ---------------------------------------------------------------------------
  // READ-SIDE API INTEGRATION
  // ---------------------------------------------------------------------------

  /**
   * Gọi GET /api/v1/candidate/bootstrap
   * Nguồn chân lý duy nhất xác định:
   * - profile.state: 'exists' | 'not_created'
   * - profile.canCreateProfile & canViewProfile
   * - draft.state: 'missing' | 'exists' & version
   */
  async getBootstrap(): Promise<CandidateBootstrapResponse> {
    try {
      const response = await apiClient.get<CandidateBootstrapResponse>(
        API_ENDPOINTS.CANDIDATE.BOOTSTRAP,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Gọi GET /api/v1/candidate/profile */
  async getProfile(): Promise<BackendCandidateProfileDto> {
    try {
      const response = await apiClient.get<BackendCandidateProfileDto>(
        API_ENDPOINTS.CANDIDATE.PROFILE,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Gọi GET /api/v1/candidate/education */
  async listEducation(): Promise<BackendCandidateEducationDto[]> {
    try {
      const response = await apiClient.get<BackendCandidateEducationDto[]>(
        API_ENDPOINTS.CANDIDATE.EDUCATION,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Gọi GET /api/v1/candidate/experience */
  async listExperience(): Promise<BackendCandidateExperienceDto[]> {
    try {
      const response = await apiClient.get<BackendCandidateExperienceDto[]>(
        API_ENDPOINTS.CANDIDATE.EXPERIENCE,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Gọi GET /api/v1/candidate/skills */
  async listSkills(): Promise<BackendCandidateSkillDto[]> {
    try {
      const response = await apiClient.get<BackendCandidateSkillDto[]>(
        API_ENDPOINTS.CANDIDATE.SKILLS,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Gọi GET /api/v1/candidate/languages */
  async listLanguages(): Promise<BackendCandidateLanguageDto[]> {
    try {
      const response = await apiClient.get<BackendCandidateLanguageDto[]>(
        API_ENDPOINTS.CANDIDATE.LANGUAGES,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Gọi GET /api/v1/candidate/career-preference */
  async getCareerPreference(): Promise<BackendCandidateCareerPreferenceDto | null> {
    try {
      const response = await apiClient.get<unknown>(
        API_ENDPOINTS.CANDIDATE.CAREER_PREFERENCE,
      );
      if (!response.data || typeof response.data !== "object" || Array.isArray(response.data)) {
        return null;
      }
      return response.data as BackendCandidateCareerPreferenceDto;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /**
   * Gọi GET /api/v1/candidate/privacy
   * Khi chưa có bản ghi PrivacySetting, CP8A trả về HTTP 200 kèm body rỗng ("")
   * thay vì literal JSON null. Chuẩn hóa về null ngay tại ranh giới API.
   */
  async getPrivacy(): Promise<BackendCandidatePrivacyDto | null> {
    try {
      const response = await apiClient.get<unknown>(
        API_ENDPOINTS.CANDIDATE.PRIVACY,
      );
      return normalizePrivacyPayload(response.data);
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /**
   * Đọc và tập hợp toàn bộ hồ sơ ứng viên (profile chính + các tài nguyên con).
   * Thực hiện song song các truy vấn con an toàn.
   */
  async getFullProfile(): Promise<FullCandidateProfileRecord> {
    const profileDto = await this.getProfile();

    const [education, experience, skills, languages, careerPreference, privacySetting] =
      await Promise.all([
        this.listEducation().catch(() => []),
        this.listExperience().catch(() => []),
        this.listSkills().catch(() => []),
        this.listLanguages().catch(() => []),
        this.getCareerPreference().catch(() => null),
        this.getPrivacy().catch(() => null),
      ]);

    return normalizeFullCandidateProfile(profileDto, {
      education,
      experience,
      skills,
      languages,
      careerPreference,
      privacySetting,
    });
  },

  // ---------------------------------------------------------------------------
  // REAL CRUD MUTATION FOUNDATION (PROTECTED BY ACTIVATION SAFETY GATE)
  // ---------------------------------------------------------------------------

  /** Tạo hồ sơ khởi đầu: POST /api/v1/candidate/profile */
  async createProfile(dto: CreateCandidateProfileDto): Promise<BackendCandidateProfileDto> {
    assertLiveWritesAllowed("createProfile");
    try {
      const response = await apiClient.post<BackendCandidateProfileDto>(
        API_ENDPOINTS.CANDIDATE.PROFILE,
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Cập nhật hồ sơ cơ bản: PATCH /api/v1/candidate/profile */
  async updateProfile(dto: UpdateCandidateProfileDto): Promise<BackendCandidateProfileDto> {
    assertLiveWritesAllowed("updateProfile");
    try {
      const response = await apiClient.patch<BackendCandidateProfileDto>(
        API_ENDPOINTS.CANDIDATE.PROFILE,
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Thêm học vấn: POST /api/v1/candidate/education */
  async createEducation(dto: CreateCandidateEducationDto): Promise<BackendCandidateEducationDto> {
    assertLiveWritesAllowed("createEducation");
    try {
      const response = await apiClient.post<BackendCandidateEducationDto>(
        API_ENDPOINTS.CANDIDATE.EDUCATION,
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Sửa học vấn: PATCH /api/v1/candidate/education/:id */
  async updateEducation(id: string, dto: UpdateCandidateEducationDto): Promise<BackendCandidateEducationDto> {
    assertLiveWritesAllowed("updateEducation");
    try {
      const response = await apiClient.patch<BackendCandidateEducationDto>(
        API_ENDPOINTS.CANDIDATE.EDUCATION_ITEM(id),
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Xóa học vấn: DELETE /api/v1/candidate/education/:id */
  async deleteEducation(id: string): Promise<{ deleted: boolean }> {
    assertLiveWritesAllowed("deleteEducation");
    try {
      const response = await apiClient.delete<{ deleted: boolean }>(
        API_ENDPOINTS.CANDIDATE.EDUCATION_ITEM(id),
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Thêm kinh nghiệm: POST /api/v1/candidate/experience */
  async createExperience(dto: CreateCandidateExperienceDto): Promise<BackendCandidateExperienceDto> {
    assertLiveWritesAllowed("createExperience");
    try {
      const response = await apiClient.post<BackendCandidateExperienceDto>(
        API_ENDPOINTS.CANDIDATE.EXPERIENCE,
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Sửa kinh nghiệm: PATCH /api/v1/candidate/experience/:id */
  async updateExperience(id: string, dto: UpdateCandidateExperienceDto): Promise<BackendCandidateExperienceDto> {
    assertLiveWritesAllowed("updateExperience");
    try {
      const response = await apiClient.patch<BackendCandidateExperienceDto>(
        API_ENDPOINTS.CANDIDATE.EXPERIENCE_ITEM(id),
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Xóa kinh nghiệm: DELETE /api/v1/candidate/experience/:id */
  async deleteExperience(id: string): Promise<{ deleted: boolean }> {
    assertLiveWritesAllowed("deleteExperience");
    try {
      const response = await apiClient.delete<{ deleted: boolean }>(
        API_ENDPOINTS.CANDIDATE.EXPERIENCE_ITEM(id),
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Thêm kỹ năng: POST /api/v1/candidate/skills */
  async createSkill(dto: CreateCandidateSkillDto): Promise<BackendCandidateSkillDto> {
    assertLiveWritesAllowed("createSkill");
    try {
      const response = await apiClient.post<BackendCandidateSkillDto>(
        API_ENDPOINTS.CANDIDATE.SKILLS,
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Sửa kỹ năng: PATCH /api/v1/candidate/skills/:id */
  async updateSkill(id: string, dto: UpdateCandidateSkillDto): Promise<BackendCandidateSkillDto> {
    assertLiveWritesAllowed("updateSkill");
    try {
      const response = await apiClient.patch<BackendCandidateSkillDto>(
        API_ENDPOINTS.CANDIDATE.SKILL_ITEM(id),
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Xóa kỹ năng: DELETE /api/v1/candidate/skills/:id */
  async deleteSkill(id: string): Promise<{ deleted: boolean }> {
    assertLiveWritesAllowed("deleteSkill");
    try {
      const response = await apiClient.delete<{ deleted: boolean }>(
        API_ENDPOINTS.CANDIDATE.SKILL_ITEM(id),
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Thêm ngoại ngữ: POST /api/v1/candidate/languages */
  async createLanguage(dto: CreateCandidateLanguageDto): Promise<BackendCandidateLanguageDto> {
    assertLiveWritesAllowed("createLanguage");
    try {
      const response = await apiClient.post<BackendCandidateLanguageDto>(
        API_ENDPOINTS.CANDIDATE.LANGUAGES,
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Sửa ngoại ngữ: PATCH /api/v1/candidate/languages/:id */
  async updateLanguage(id: string, dto: UpdateCandidateLanguageDto): Promise<BackendCandidateLanguageDto> {
    assertLiveWritesAllowed("updateLanguage");
    try {
      const response = await apiClient.patch<BackendCandidateLanguageDto>(
        API_ENDPOINTS.CANDIDATE.LANGUAGE_ITEM(id),
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Xóa ngoại ngữ: DELETE /api/v1/candidate/languages/:id */
  async deleteLanguage(id: string): Promise<{ deleted: boolean }> {
    assertLiveWritesAllowed("deleteLanguage");
    try {
      const response = await apiClient.delete<{ deleted: boolean }>(
        API_ENDPOINTS.CANDIDATE.LANGUAGE_ITEM(id),
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Thêm chứng chỉ ngoại ngữ: POST /api/v1/candidate/languages/:languageId/certificates */
  async createCertificate(
    languageId: string,
    dto: CreateCandidateLanguageCertificateDto,
  ): Promise<BackendCandidateLanguageCertificateDto> {
    assertLiveWritesAllowed("createCertificate");
    try {
      const response = await apiClient.post<BackendCandidateLanguageCertificateDto>(
        API_ENDPOINTS.CANDIDATE.LANGUAGE_CERTIFICATES(languageId),
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Sửa chứng chỉ: PATCH /api/v1/candidate/languages/:languageId/certificates/:certificateId */
  async updateCertificate(
    languageId: string,
    certificateId: string,
    dto: UpdateCandidateLanguageCertificateDto,
  ): Promise<BackendCandidateLanguageCertificateDto> {
    assertLiveWritesAllowed("updateCertificate");
    try {
      const response = await apiClient.patch<BackendCandidateLanguageCertificateDto>(
        API_ENDPOINTS.CANDIDATE.LANGUAGE_CERTIFICATE_ITEM(languageId, certificateId),
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Xóa chứng chỉ: DELETE /api/v1/candidate/languages/:languageId/certificates/:certificateId */
  async deleteCertificate(languageId: string, certificateId: string): Promise<{ deleted: boolean }> {
    assertLiveWritesAllowed("deleteCertificate");
    try {
      const response = await apiClient.delete<{ deleted: boolean }>(
        API_ENDPOINTS.CANDIDATE.LANGUAGE_CERTIFICATE_ITEM(languageId, certificateId),
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Lưu hoặc thay thế nguyện vọng nghề nghiệp: PUT /api/v1/candidate/career-preference */
  async putCareerPreference(
    dto: PutCandidateCareerPreferenceDto,
  ): Promise<BackendCandidateCareerPreferenceDto> {
    assertLiveWritesAllowed("putCareerPreference");
    try {
      const response = await apiClient.put<BackendCandidateCareerPreferenceDto>(
        API_ENDPOINTS.CANDIDATE.CAREER_PREFERENCE,
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  /** Cập nhật quyền riêng tư: PATCH /api/v1/candidate/privacy */
  async updatePrivacy(dto: UpdateCandidatePrivacyDto): Promise<BackendCandidatePrivacyDto> {
    assertLiveWritesAllowed("updatePrivacy");
    try {
      const response = await apiClient.patch<BackendCandidatePrivacyDto>(
        API_ENDPOINTS.CANDIDATE.PRIVACY,
        dto,
      );
      return response.data;
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },

  // ---------------------------------------------------------------------------
  // IMPORT ONBOARDING TO PROFILE (PHASE 6)
  // ---------------------------------------------------------------------------

  /**
   * Chuyển giao bản nháp Onboarding sang hồ sơ chính thức:
   * POST /api/v1/candidate/profile/import-onboarding
   *
   * Payload:
   * {
   *   "version": number,
   *   "confirmPrivacy": true,
   *   "confirmOmitUnsupportedAssets"?: true
   * }
   */
  async importOnboarding(dto: ImportCandidateOnboardingDto): Promise<FullCandidateProfileRecord> {
    assertLiveWritesAllowed("importOnboarding");
    try {
      const response = await apiClient.post<BackendCandidateProfileDto>(
        API_ENDPOINTS.CANDIDATE.IMPORT_ONBOARDING,
        dto,
      );
      return normalizeFullCandidateProfile(response.data);
    } catch (error) {
      throw mapCandidateApiError(error);
    }
  },
};
