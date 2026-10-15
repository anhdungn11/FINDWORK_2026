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
  MOCK_FIXTURE_DRAFT_SUMMARY,
  MOCK_FIXTURE_FRESHER_PROFILE,
  MOCK_FIXTURE_FULL_PROFILE,
} from "@/features/candidate/profile/fixtures/mockProfileData";

const CandidateProfilePage = () => {
  const isDev = Boolean(import.meta.env?.DEV);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPreview = searchParams.get("preview");
  const previewParam = isDev ? rawPreview : null;
  const user = useAuthStore((state) => state.user);
  const accountEmail = user?.email || "candidate@findwork.vn";

  // Quản lý riêng biệt dữ liệu giả định theo từng kịch bản trong bộ nhớ khi bật chế độ Preview
  const [fullDemoProfile, setFullDemoProfile] = useState<FullCandidateProfileRecord>(() => ({
    ...MOCK_FIXTURE_FULL_PROFILE,
  }));
  const [fresherDemoProfile, setFresherDemoProfile] = useState<FullCandidateProfileRecord>(() => ({
    ...MOCK_FIXTURE_FRESHER_PROFILE,
  }));

  const activeDemoProfile = previewParam === "fresher" ? fresherDemoProfile : fullDemoProfile;

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
    demoProfile: activeDemoProfile,
    draftFixture: MOCK_FIXTURE_DRAFT_SUMMARY,
  });

  const isPreview = Boolean(isDev && previewParam);
  const isFresher = previewParam === "fresher";
  const updateActiveDemoProfile = (updater: (prev: FullCandidateProfileRecord) => FullCandidateProfileRecord) => {
    if (isFresher) {
      setFresherDemoProfile(updater);
    } else {
      setFullDemoProfile(updater);
    }
  };

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
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Info size={14} color="var(--color-primary, #4f6ef7)" aria-hidden="true" />
            <span>
              <strong>CP8C Development Preview:</strong>{" "}
              {previewParam
                ? `Đang xem kịch bản mẫu (?preview=${previewParam}) — Dữ liệu tạm thời trong bộ nhớ phiên làm việc (in-memory demo), tải lại trang (F5) sẽ đặt lại dữ liệu mẫu và KHÔNG lưu vào cơ sở dữ liệu PostgreSQL.`
                : "Đang kết nối API Backend thực tế (GET /api/v1/candidate/bootstrap). Tầng ghi được bảo vệ an toàn (ENABLE_LIVE_WRITES=false)."}
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
        state={integration.presentationState}
        profile={isPreview ? activeDemoProfile : integration.profile}
        draftSummary={integration.draftSummary}
        draftData={integration.rawDraft?.data}
        accountEmail={accountEmail}
        errorMessage={integration.errorMessage || "Chưa thể kết nối tới dịch vụ hồ sơ ứng viên. Vui lòng thử lại sau."}
        isSaving={integration.isSaving || integration.isImporting}
        isPreview={isPreview}
        isLiveWritesEnabled={integration.isLiveWritesEnabled}
        onRetry={integration.refetch}
        onConfirmImport={async (payload) => {
          if (isDev && previewParam) {
            setFullDemoProfile((prev) => ({
              ...prev,
              fullName: MOCK_FIXTURE_DRAFT_SUMMARY.fullName || prev.fullName,
              phone: MOCK_FIXTURE_DRAFT_SUMMARY.phone || prev.phone,
              updatedAt: new Date().toISOString(),
            }));
            setSearchParams({ preview: "full" });
            return;
          }
          await integration.handleConfirmImport(payload);
        }}
        onSaveOverview={async (data) => {
          if (isDev && previewParam) {
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
          if (isDev && previewParam) {
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
          if (isDev && previewParam) {
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
          if (isDev && previewParam) {
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
          if (isDev && previewParam) {
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
          if (isDev && previewParam) {
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
          if (isDev && previewParam) {
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
          if (isDev && previewParam) {
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
          if (isDev && previewParam) {
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
          if (isDev && previewParam) {
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
          if (isDev && previewParam) {
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
          if (isDev && previewParam) {
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