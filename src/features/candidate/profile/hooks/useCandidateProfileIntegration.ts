/**
 * FINDWORK CP8C — USE CANDIDATE PROFILE INTEGRATION HOOK
 * 
 * Vị trí: src/features/candidate/profile/hooks/useCandidateProfileIntegration.ts
 * Phạm vi: Tầng tích hợp State & Async Lifecycle giữa React và API Service.
 * 
 * NGUYÊN TẮC HOẠT ĐỘNG:
 * 1. Nguồn chân lý: GET /api/v1/candidate/bootstrap
 * 2. Phân định rõ 9 trạng thái presentation.
 * 3. 401 != 403 != 404:
 *    - 401: Hết phiên đăng nhập.
 *    - 403: Cấm quyền truy cập (không xem là "chưa tạo hồ sơ").
 *    - 404: Hồ sơ chưa tạo (dẫn hướng import hoặc onboarding).
 * 4. Tôn trọng Activation Safety Gate (ENABLE_LIVE_WRITES: false mặc định):
 *    - Tuyệt đối không tạo fake save success.
 *    - Không sinh ID giả mạo.
 *    - Báo lỗi trung thực và hướng dẫn khi thao tác ghi bị chặn bởi gate.
 */

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../../../../store/authStore";
import {
  candidateProfileService,
  CandidateServiceError,
} from "../services/candidateProfileService";
import {
  buildDraftSummaryFromDraft,
  detectUnsupportedAssets,
  resolveBootstrapPresentationState,
  toCreateEducationDto,
  toCreateExperienceDto,
  toCreateLanguageDto,
  toCreateSkillDto,
  toPutCareerPreferenceDto,
  toUpdatePrivacyDto,
} from "../adapters/candidateProfileNormalizer";
import { isLiveWritesEnabled } from "../config/candidateIntegrationConfig";
import { loadOnboardingDraft, type OnboardingDraft } from "../../services/onboardingDraft";
import type {
  CandidateCareerStatus,
  CandidateEducationRecord,
  CandidateExperienceRecord,
  CandidateLanguageRecord,
  CandidatePrivacySettingRecord,
  CandidateProfilePresentationState,
  CandidateSkillRecord,
  FullCandidateProfileRecord,
  ImportOnboardingPayload,
  OnboardingDraftSummary,
} from "../types/candidateProfile.types";
import type { CandidateBootstrapResponse, UnsupportedOnboardingAsset } from "../types/candidateApi.types";

export interface UseCandidateProfileIntegrationOptions {
  isDev?: boolean;
  previewParam?: string | null;
  demoProfileFixture?: FullCandidateProfileRecord;
  draftSummaryFixture?: OnboardingDraftSummary;
}

export function useCandidateProfileIntegration(options: UseCandidateProfileIntegrationOptions = {}) {
  const { isDev = false, previewParam = null, demoProfileFixture, draftSummaryFixture } = options;

  const authUser = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);

  // States
  const [presentationState, setPresentationState] = useState<CandidateProfilePresentationState>("loading");
  const [profile, setProfile] = useState<FullCandidateProfileRecord | null>(null);
  const [rawDraft, setRawDraft] = useState<OnboardingDraft | null>(null);
  const [draftSummary, setDraftSummary] = useState<OnboardingDraftSummary | null>(null);
  const [detectedAssets, setDetectedAssets] = useState<UnsupportedOnboardingAsset[]>([]);
  const [bootstrapData, setBootstrapData] = useState<CandidateBootstrapResponse | null>(null);

  // Async / Mutation states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]> | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // ---------------------------------------------------------------------------
  // READ-SIDE INTEGRATION LOADER
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    // 1. Nếu đang ở chế độ Development Preview với query param hợp lệ, sử dụng fixture cô lập
    if (isDev && previewParam) {
      setIsLoading(false);
      setErrorMessage(null);

      switch (previewParam) {
        case "full":
        case "fresher":
          setPresentationState("existing_profile");
          setProfile(demoProfileFixture || null);
          setDraftSummary(null);
          return;
        case "draft":
          setPresentationState("not_created_with_draft");
          setProfile(null);
          setDraftSummary(draftSummaryFixture || null);
          return;
        case "nodraft":
        case "no-draft":
          setPresentationState("not_created_no_draft");
          setProfile(null);
          setDraftSummary(null);
          return;
        case "loading":
          setPresentationState("loading");
          return;
        case "forbidden":
          setPresentationState("forbidden");
          setErrorMessage("Bạn không có quyền truy cập hồ sơ này.");
          return;
        case "error":
          setPresentationState("network_error");
          setErrorMessage("Không thể kết nối tới dịch vụ hồ sơ ứng viên.");
          return;
        default:
          setPresentationState("eligibility_unknown");
          return;
      }
    }

    // 2. Chế độ thực tế (Production hoặc Dev không có ?preview=)
    setIsLoading(true);
    setErrorMessage(null);

    // Kiểm tra trạng thái đăng nhập
    if (authStatus === "unauthenticated" || (!authUser && authStatus !== "loading")) {
      setPresentationState("eligibility_unknown");
      setIsLoading(false);
      return;
    }

    try {
      // BƯỚC 1: Lấy Bootstrap từ backend
      const bootstrap = await candidateProfileService.getBootstrap();
      setBootstrapData(bootstrap);

      const resolvedState = resolveBootstrapPresentationState(bootstrap, true);
      setPresentationState(resolvedState);

      // BƯỚC 2: Tải dữ liệu tương ứng theo trạng thái Bootstrap
      if (resolvedState === "existing_profile") {
        const full = await candidateProfileService.getFullProfile();
        setProfile(full);
        setDraftSummary(null);
      } else if (resolvedState === "not_created_with_draft") {
        setProfile(null);
        // Tải bản nháp để tính toán tóm tắt trung thực và phát hiện tài nguyên
        try {
          const draft = await loadOnboardingDraft();
          if (draft) {
            setRawDraft(draft);
            setDraftSummary(buildDraftSummaryFromDraft(draft));
            setDetectedAssets(detectUnsupportedAssets(draft.data));
          } else {
            setPresentationState("not_created_no_draft");
            setDraftSummary(null);
          }
        } catch {
          // Nếu không load được draft nhưng bootstrap báo draft exists
          setDraftSummary({
            version: bootstrap.draft.version || 1,
            stepIndex: 0,
            updatedAt: new Date().toISOString(),
            educationCount: 0,
            experienceCount: 0,
            skillsCount: 0,
            languagesCount: 0,
            hasPreferences: false,
            hasLocalAvatarFile: false,
            hasLocalResumeFile: false,
          });
        }
      } else {
        setProfile(null);
        setDraftSummary(null);
      }
    } catch (err: unknown) {
      if (err instanceof CandidateServiceError) {
        if (err.status === 401) {
          setPresentationState("eligibility_unknown");
          setErrorMessage("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
        } else if (err.status === 403) {
          setPresentationState("forbidden");
          setErrorMessage("Bạn không có quyền xem hồ sơ ứng viên này.");
        } else {
          setPresentationState("network_error");
          setErrorMessage(err.message);
        }
      } else {
        setPresentationState("network_error");
        setErrorMessage("Đã có sự cố kết nối tới máy chủ.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isDev, previewParam, authUser, authStatus, demoProfileFixture, draftSummaryFixture]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // MUTATION HANDLERS (ENFORCING ACTIVATION SAFETY GATE)
  // ---------------------------------------------------------------------------

  /** Xử lý Import Onboarding */
  const handleConfirmImport = async (payload: ImportOnboardingPayload) => {
    setIsImporting(true);
    setImportError(null);
    setValidationErrors(null);

    // Kiểm tra Activation Safety Gate
    if (!isLiveWritesEnabled()) {
      setIsImporting(false);
      const msg =
        "Chức năng khởi tạo hồ sơ từ bản nháp đang tạm khóa trong giai đoạn nghiệm thu kiểm thử CP8A/CP8C (ENABLE_LIVE_WRITES=false). " +
        "Dữ liệu chưa được gửi lên cơ sở dữ liệu.";
      setImportError(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    try {
      const created = await candidateProfileService.importOnboarding({
        version: payload.version,
        confirmPrivacy: true,
        confirmOmitUnsupportedAssets: payload.confirmOmitUnsupportedAssets,
      });

      // Thành công thực tế từ backend
      setProfile(created);
      setPresentationState("existing_profile");
      setShowImportModal(false);
    } catch (err: unknown) {
      if (err instanceof CandidateServiceError) {
        setImportError(err.message);
        if (err.details?.validationMessages) {
          setValidationErrors({ general: err.details.validationMessages });
        }
      } else if (err instanceof Error) {
        setImportError(err.message);
      } else {
        setImportError("Đã có lỗi xảy ra khi tạo hồ sơ.");
      }
      throw err;
    } finally {
      setIsImporting(false);
    }
  };

  /** Xử lý lưu Thông tin tổng quan */
  const handleSaveOverview = async (data: {
    fullName: string;
    headline?: string;
    bio?: string | null;
    careerStatus: CandidateCareerStatus | null;
  }) => {
    if (!isLiveWritesEnabled()) {
      const msg =
        "Chức năng lưu thông tin đang tạm khóa trong giai đoạn nghiệm thu CP8A/CP8C (ENABLE_LIVE_WRITES=false). " +
        "Thay đổi chưa được lưu lên cơ sở dữ liệu.";
      setErrorMessage(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    setIsSaving(true);
    try {
      await candidateProfileService.updateProfile({
        fullName: data.fullName,
        bio: data.bio ?? null,
        careerStatus: data.careerStatus ?? null,
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể lưu thông tin.";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /** Xử lý lưu Thông tin cá nhân */
  const handleSavePersonalInfo = async (data: Partial<FullCandidateProfileRecord>) => {
    if (!isLiveWritesEnabled()) {
      const msg =
        "Chức năng cập nhật thông tin cá nhân đang tạm khóa trong giai đoạn nghiệm thu CP8A/CP8C (ENABLE_LIVE_WRITES=false). " +
        "Thay đổi chưa được lưu lên cơ sở dữ liệu.";
      setErrorMessage(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    setIsSaving(true);
    try {
      await candidateProfileService.updateProfile({
        fullName: data.fullName,
        phone: data.phone ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        gender: data.gender ?? null,
        countryCode: data.countryCode ?? "VN",
        provinceId: data.provinceId ?? null,
        wardId: data.wardId ?? null,
        addressLine: data.addressLine ?? null,
        bio: data.bio ?? null,
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể lưu thông tin cá nhân.";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /** Xử lý thêm Học vấn */
  const handleAddEducation = async (edu: Omit<CandidateEducationRecord, "id">) => {
    if (!isLiveWritesEnabled()) {
      const msg = "Chức năng thêm học vấn đang tạm khóa trong giai đoạn nghiệm thu CP8A/CP8C (ENABLE_LIVE_WRITES=false).";
      setErrorMessage(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    setIsSaving(true);
    try {
      await candidateProfileService.createEducation(toCreateEducationDto(edu));
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể thêm học vấn.";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /** Xử lý xóa Học vấn */
  const handleDeleteEducation = async (id: string) => {
    if (!isLiveWritesEnabled()) {
      const msg = "Chức năng xóa học vấn đang tạm khóa trong giai đoạn nghiệm thu CP8A/CP8C (ENABLE_LIVE_WRITES=false).";
      setErrorMessage(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    setIsSaving(true);
    try {
      await candidateProfileService.deleteEducation(id);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể xóa học vấn.";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /** Xử lý thêm Kinh nghiệm */
  const handleAddExperience = async (exp: Omit<CandidateExperienceRecord, "id">) => {
    if (!isLiveWritesEnabled()) {
      const msg = "Chức năng thêm kinh nghiệm đang tạm khóa trong giai đoạn nghiệm thu CP8A/CP8C (ENABLE_LIVE_WRITES=false).";
      setErrorMessage(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    setIsSaving(true);
    try {
      await candidateProfileService.createExperience(toCreateExperienceDto(exp));
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể thêm kinh nghiệm.";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /** Xử lý xóa Kinh nghiệm */
  const handleDeleteExperience = async (id: string) => {
    if (!isLiveWritesEnabled()) {
      const msg = "Chức năng xóa kinh nghiệm đang tạm khóa trong giai đoạn nghiệm thu CP8A/CP8C (ENABLE_LIVE_WRITES=false).";
      setErrorMessage(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    setIsSaving(true);
    try {
      await candidateProfileService.deleteExperience(id);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể xóa kinh nghiệm.";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /** Xử lý thêm Kỹ năng */
  const handleAddSkill = async (skill: Omit<CandidateSkillRecord, "id">) => {
    if (!isLiveWritesEnabled()) {
      const msg = "Chức năng thêm kỹ năng đang tạm khóa trong giai đoạn nghiệm thu CP8A/CP8C (ENABLE_LIVE_WRITES=false).";
      setErrorMessage(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    setIsSaving(true);
    try {
      await candidateProfileService.createSkill(toCreateSkillDto(skill));
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể thêm kỹ năng.";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /** Xử lý xóa Kỹ năng */
  const handleDeleteSkill = async (id: string) => {
    if (!isLiveWritesEnabled()) {
      const msg = "Chức năng xóa kỹ năng đang tạm khóa trong giai đoạn nghiệm thu CP8A/CP8C (ENABLE_LIVE_WRITES=false).";
      setErrorMessage(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    setIsSaving(true);
    try {
      await candidateProfileService.deleteSkill(id);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể xóa kỹ năng.";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /** Xử lý thêm Ngoại ngữ */
  const handleAddLanguage = async (lang: Omit<CandidateLanguageRecord, "id">) => {
    if (!isLiveWritesEnabled()) {
      const msg = "Chức năng thêm ngoại ngữ đang tạm khóa trong giai đoạn nghiệm thu CP8A/CP8C (ENABLE_LIVE_WRITES=false).";
      setErrorMessage(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    setIsSaving(true);
    try {
      await candidateProfileService.createLanguage(toCreateLanguageDto(lang));
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể thêm ngoại ngữ.";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /** Xử lý xóa Ngoại ngữ */
  const handleDeleteLanguage = async (id: string) => {
    if (!isLiveWritesEnabled()) {
      const msg = "Chức năng xóa ngoại ngữ đang tạm khóa trong giai đoạn nghiệm thu CP8A/CP8C (ENABLE_LIVE_WRITES=false).";
      setErrorMessage(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    setIsSaving(true);
    try {
      await candidateProfileService.deleteLanguage(id);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể xóa ngoại ngữ.";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /** Xử lý lưu Nguyện vọng nghề nghiệp */
  const handleSaveCareerPreference = async (pref: NonNullable<FullCandidateProfileRecord["careerPreference"]>) => {
    if (!isLiveWritesEnabled()) {
      const msg = "Chức năng lưu nguyện vọng đang tạm khóa trong giai đoạn nghiệm thu CP8A/CP8C (ENABLE_LIVE_WRITES=false).";
      setErrorMessage(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    setIsSaving(true);
    try {
      await candidateProfileService.putCareerPreference(toPutCareerPreferenceDto(pref));
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể lưu nguyện vọng.";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /** Xử lý lưu Quyền riêng tư */
  const handleSavePrivacy = async (privacy: CandidatePrivacySettingRecord) => {
    if (!isLiveWritesEnabled()) {
      const msg = "Chức năng cập nhật quyền riêng tư đang tạm khóa trong giai đoạn nghiệm thu CP8A/CP8C (ENABLE_LIVE_WRITES=false).";
      setErrorMessage(msg);
      throw new CandidateServiceError(msg, 403, "WRITE_GATE_BLOCKED");
    }

    setIsSaving(true);
    try {
      await candidateProfileService.updatePrivacy(toUpdatePrivacyDto(privacy));
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể lưu quyền riêng tư.";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    presentationState,
    profile,
    rawDraft,
    draftSummary,
    detectedAssets,
    bootstrapData,
    isLoading,
    isSaving,
    isImporting,
    errorMessage,
    importError,
    validationErrors,
    showImportModal,
    setShowImportModal,
    isLiveWritesEnabled: isLiveWritesEnabled(),
    refetch: loadData,
    handleConfirmImport,
    handleSaveOverview,
    handleSavePersonalInfo,
    handleAddEducation,
    handleDeleteEducation,
    handleAddExperience,
    handleDeleteExperience,
    handleAddSkill,
    handleDeleteSkill,
    handleAddLanguage,
    handleDeleteLanguage,
    handleSaveCareerPreference,
    handleSavePrivacy,
  };
}
