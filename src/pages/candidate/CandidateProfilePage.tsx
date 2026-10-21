/**
 * FINDWORK CP8C — CANDIDATE PROFILE PAGE (INTEGRATION ROUTE)
 *
 * Vị trí: src/pages/candidate/CandidateProfilePage.tsx
 * Phạm vi: Kết nối tầng tích hợp API (Read-side) và chuẩn bị Adapter CRUD (Phase 4, 5, 6, 7).
 *
 * ĐẢM BẢO RÀNG BUỘC KỸ THUẬT:
 * - Read-side được tích hợp trực tiếp với API backend: GET /api/v1/candidate/bootstrap.
 * - Phân định rõ 401 != 403 != 404, không coi lỗi API là hồ sơ rỗng.
 * - Không gửi mutation ghi dữ liệu khi Activation Safety Gate (ENABLE_LIVE_WRITES) đang tắt.
 * - Bảo toàn chế độ preview (?preview=...) trong môi trường DEV để phục vụ kiểm thử giao diện.
 * - Không để lọt dữ liệu fixture giả mạo vào môi trường sản xuất.
 */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Info } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  CandidateProfileView,
  resolveCandidateProfilePageState,
  useCandidateProfileIntegration,
  type FullCandidateProfileRecord,
} from "@/features/candidate/profile";
import {
  buildSimulatedProfileFromDemoDraft,
  createScenarioDemoProfile,
  MOCK_FIXTURE_DRAFT_SUMMARY,
  MOCK_FIXTURE_FULL_PROFILE,
} from "@/features/candidate/profile/fixtures/mockProfileData";

/**
 * Vỏ trang: mỗi kịch bản (hoặc chế độ thật) là một instance độc lập nhờ `key`.
 * Chuyển kịch bản sẽ hủy toàn bộ state cũ (hồ sơ demo, lỗi, request đang bay) —
 * không thể rò rỉ dữ liệu giữa các kịch bản; F5 khôi phục đúng fixture gốc.
 */
const CandidateProfilePage = () => {
  const isDev = Boolean(import.meta.env?.DEV);
  const [searchParams, setSearchParams] = useSearchParams();
  const previewParam = isDev ? searchParams.get("preview") : null;

  return (
    <CandidateProfileScenario
      key={previewParam ?? "__real__"}
      isDev={isDev}
      previewParam={previewParam}
      setSearchParams={setSearchParams}
    />
  );
};

interface CandidateProfileScenarioProps {
  isDev: boolean;
  previewParam: string | null;
  setSearchParams: ReturnType<typeof useSearchParams>[1];
}

const CandidateProfileScenario = ({ isDev, previewParam, setSearchParams }: CandidateProfileScenarioProps) => {
  const user = useAuthStore((state) => state.user);
  // Email tài khoản thật: không bịa giá trị dự phòng; chỉ dùng cho chế độ thật
  const accountEmail = user?.email ?? "";

  // Dữ liệu demo độc lập theo kịch bản, chỉ nằm trong bộ nhớ (không bao giờ ghi DB)
  const [demoProfile, setDemoProfile] = useState<FullCandidateProfileRecord | null>(() =>
    createScenarioDemoProfile(previewParam),
  );
  const activeDemoProfile = demoProfile ?? undefined;

  // Hook tích hợp API thực tế và quản lý Activation Safety Gate
  const integration = useCandidateProfileIntegration({
    isDev,
    previewParam,
    demoProfileFixture: activeDemoProfile,
    draftSummaryFixture: MOCK_FIXTURE_DRAFT_SUMMARY,
  });

  // Điều khiển thanh xem trước (Chỉ bật khi ở Development mode)
  const { showDevBanner } = resolveCandidateProfilePageState({
    isDev,
    previewParam,
    demoProfile: activeDemoProfile ?? MOCK_FIXTURE_FULL_PROFILE,
    draftFixture: MOCK_FIXTURE_DRAFT_SUMMARY,
  });

  const isPreview = Boolean(isDev && previewParam);
  const updateActiveDemoProfile = (updater: (prev: FullCandidateProfileRecord) => FullCandidateProfileRecord) => {
    setDemoProfile((prev) => (prev ? updater(prev) : prev));
  };
  // Hồ sơ mô phỏng (sau khi "import demo") thay thế màn hình bản nháp trong cùng kịch bản
  const demoShowsProfile = isPreview && demoProfile !== null;

  return (
    <div>
      {/* Banner hướng dẫn kiểm thử giao diện (Chỉ hiển thị trong Development) */}
      {showDevBanner && (
        <aside
          style={{
            background: "var(--color-surface-soft, #f1f5f9)",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            padding: "0.5rem 1rem",
            fontSize: "0.75rem",
            color: "var(--color-text-secondary, #64748b)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
          aria-label="Thanh điều khiển chế độ xem trước CP8C"
          role="status"
          data-testid="dev-preview-banner"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Info size={14} color="var(--color-primary, #4f6ef7)" aria-hidden="true" />
            <span>
              <strong>{previewParam ? "DEMO / NOT SAVED" : "DỮ LIỆU THẬT"} · CP8C Development Preview:</strong>{" "}
              {previewParam
                ? `Đang xem kịch bản mẫu (?preview=${previewParam}) — nhân vật hư cấu, dữ liệu chỉ nằm trong bộ nhớ trình duyệt, không liên quan tới tài khoản đăng nhập. Tải lại trang (F5) sẽ khôi phục dữ liệu mẫu; KHÔNG lưu vào cơ sở dữ liệu.`
                : "Đang dùng dữ liệu thật từ API Backend (GET /api/v1/candidate/bootstrap). Các thao tác ghi đang bị khóa (ENABLE_LIVE_WRITES=false)."}
            </span>
          </div>

          {/* Nút chuyển đổi nhanh các kịch bản preview phục vụ Review */}
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
            <span style={{ alignSelf: "center", marginRight: "4px", fontWeight: 600 }}>Xem kịch bản:</span>
            <button
              type="button"
              style={{
                padding: "2px 6px",
                fontSize: "0.6875rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                background: previewParam === "full" ? "var(--color-primary)" : "#ffffff",
                color: previewParam === "full" ? "#ffffff" : "inherit",
                cursor: "pointer",
              }}
              onClick={() => setSearchParams({ preview: "full" })}
            >
              Hồ sơ đầy đủ
            </button>
            <button
              type="button"
              style={{
                padding: "2px 6px",
                fontSize: "0.6875rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                background: previewParam === "fresher" ? "var(--color-primary)" : "#ffffff",
                color: previewParam === "fresher" ? "#ffffff" : "inherit",
                cursor: "pointer",
              }}
              onClick={() => setSearchParams({ preview: "fresher" })}
            >
              Sinh viên/Fresher
            </button>
            <button
              type="button"
              style={{
                padding: "2px 6px",
                fontSize: "0.6875rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                background: previewParam === "draft" ? "var(--color-primary)" : "#ffffff",
                color: previewParam === "draft" ? "#ffffff" : "inherit",
                cursor: "pointer",
              }}
              onClick={() => setSearchParams({ preview: "draft" })}
            >
              Có bản nháp (Import)
            </button>
            <button
              type="button"
              style={{
                padding: "2px 6px",
                fontSize: "0.6875rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                background: previewParam === "nodraft" ? "var(--color-primary)" : "#ffffff",
                color: previewParam === "nodraft" ? "#ffffff" : "inherit",
                cursor: "pointer",
              }}
              onClick={() => setSearchParams({ preview: "nodraft" })}
            >
              Chưa có nháp
            </button>
            <button
              type="button"
              style={{
                padding: "2px 6px",
                fontSize: "0.6875rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                background: previewParam === "loading" ? "var(--color-primary)" : "#ffffff",
                color: previewParam === "loading" ? "#ffffff" : "inherit",
                cursor: "pointer",
              }}
              onClick={() => setSearchParams({ preview: "loading" })}
            >
              Skeleton Loading
            </button>
            {previewParam && (
              <button
                type="button"
                style={{
                  padding: "2px 6px",
                  fontSize: "0.6875rem",
                  borderRadius: "4px",
                  border: "1px solid var(--color-border)",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
                onClick={() => setSearchParams({})}
              >
                Kết nối API
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Presentation Master Container */}
      <CandidateProfileView
        state={demoShowsProfile ? "existing_profile" : integration.presentationState}
        profile={isPreview ? demoProfile : integration.profile}
        draftSummary={integration.draftSummary}
        draftData={integration.rawDraft?.data}
        accountEmail={accountEmail}
        errorMessage={integration.errorMessage}
        errorStatus={integration.errorStatus}
        errorCode={integration.errorCode}
        isSaving={integration.isSaving || integration.isImporting}
        isPreview={isPreview}
        isLiveWritesEnabled={integration.isLiveWritesEnabled}
        onRetry={integration.refetch}
        onCreateManualProfile={async (dto) => {
          if (isPreview) {
            setDemoProfile({
              id: "demo-profile-manual",
              userId: user?.id ?? "demo-user",
              fullName: dto.fullName,
              contactEmail: accountEmail,
              phone: dto.phone ?? null,
              dateOfBirth: null,
              gender: null,
              countryCode: "VN",
              provinceId: null,
              wardId: null,
              addressLine: null,
              bio: dto.bio ?? null,
              avatarAssetKey: null,
              careerStatus: null,
              isSampleData: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              education: [],
              experience: [],
              skills: [],
              languages: [],
              careerPreference: null,
              privacySetting: {
                searchableProfile: false,
                showEmail: false,
                showPhone: false,
                allowResumeDownload: false,
                allowJobMatching: true,
              },
            });
            return;
          }
          await integration.handleCreateManualProfile(dto);
        }}
        onConfirmImport={async (payload) => {
          if (isPreview) {
            // MÔ PHỎNG trong bộ nhớ: không gọi endpoint import thật, không đổi kịch bản khác
            setDemoProfile(buildSimulatedProfileFromDemoDraft(MOCK_FIXTURE_DRAFT_SUMMARY));
            return;
          }
          await integration.handleConfirmImport(payload);
        }}
        onSaveOverview={async (data) => {
          if (isPreview) {
            updateActiveDemoProfile((prev) => ({
              ...prev,
              fullName: data.fullName,
              careerStatus: data.careerStatus,
              bio: data.bio,
              updatedAt: new Date().toISOString(),
            }));
            return;
          }
          await integration.handleSaveOverview(data);
        }}
        onSavePersonalInfo={async (data) => {
          if (isPreview) {
            updateActiveDemoProfile((prev) => ({
              ...prev,
              ...data,
              updatedAt: new Date().toISOString(),
            }));
            return;
          }
          await integration.handleSavePersonalInfo(data);
        }}
        onAddEducation={async (edu) => {
          if (isPreview) {
            updateActiveDemoProfile((prev) => ({
              ...prev,
              education: [
                ...prev.education,
                { ...edu, id: `edu-${Date.now()}` },
              ],
              updatedAt: new Date().toISOString(),
            }));
            return;
          }
          await integration.handleAddEducation(edu);
        }}
        onDeleteEducation={async (id) => {
          if (isPreview) {
            updateActiveDemoProfile((prev) => ({
              ...prev,
              education: prev.education.filter((e) => e.id !== id),
              updatedAt: new Date().toISOString(),
            }));
            return;
          }
          await integration.handleDeleteEducation(id);
        }}
        onAddExperience={async (exp) => {
          if (isPreview) {
            updateActiveDemoProfile((prev) => ({
              ...prev,
              experience: [
                ...prev.experience,
                { ...exp, id: `exp-${Date.now()}` },
              ],
              updatedAt: new Date().toISOString(),
            }));
            return;
          }
          await integration.handleAddExperience(exp);
        }}
        onDeleteExperience={async (id) => {
          if (isPreview) {
            updateActiveDemoProfile((prev) => ({
              ...prev,
              experience: prev.experience.filter((e) => e.id !== id),
              updatedAt: new Date().toISOString(),
            }));
            return;
          }
          await integration.handleDeleteExperience(id);
        }}
        onAddSkill={async (skill) => {
          if (isPreview) {
            updateActiveDemoProfile((prev) => ({
              ...prev,
              skills: [
                ...prev.skills,
                { ...skill, id: `sk-${Date.now()}` },
              ],
              updatedAt: new Date().toISOString(),
            }));
            return;
          }
          await integration.handleAddSkill(skill);
        }}
        onDeleteSkill={async (id) => {
          if (isPreview) {
            updateActiveDemoProfile((prev) => ({
              ...prev,
              skills: prev.skills.filter((s) => s.id !== id),
              updatedAt: new Date().toISOString(),
            }));
            return;
          }
          await integration.handleDeleteSkill(id);
        }}
        onAddLanguage={async (lang) => {
          if (isPreview) {
            updateActiveDemoProfile((prev) => ({
              ...prev,
              languages: [
                ...prev.languages,
                { ...lang, id: `lang-${Date.now()}` },
              ],
              updatedAt: new Date().toISOString(),
            }));
            return;
          }
          await integration.handleAddLanguage(lang);
        }}
        onDeleteLanguage={async (id) => {
          if (isPreview) {
            updateActiveDemoProfile((prev) => ({
              ...prev,
              languages: prev.languages.filter((l) => l.id !== id),
              updatedAt: new Date().toISOString(),
            }));
            return;
          }
          await integration.handleDeleteLanguage(id);
        }}
        onSaveCareerPreference={async (pref) => {
          if (isPreview) {
            updateActiveDemoProfile((prev) => ({
              ...prev,
              careerPreference: pref,
              updatedAt: new Date().toISOString(),
            }));
            return;
          }
          await integration.handleSaveCareerPreference(pref);
        }}
        onSavePrivacy={async (privacy) => {
          if (isPreview) {
            updateActiveDemoProfile((prev) => ({
              ...prev,
              privacySetting: privacy,
              updatedAt: new Date().toISOString(),
            }));
            return;
          }
          await integration.handleSavePrivacy(privacy);
        }}
      />
    </div>
  );
};

export default CandidateProfilePage;