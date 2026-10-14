/**
 * FINDWORK CP8B — CANDIDATE PROFILE PAGE (PRESENTATION ROUTE)
 *
 * Vị trí: src/pages/candidate/CandidateProfilePage.tsx
 * Phạm vi: Presentation Layer Only.
 *
 * ĐẢM BẢO RÀNG BUỘC KỸ THUẬT:
 * - Không tự ý gọi API hoặc xây TanStack Query hooks (thuộc thẩm quyền CP8C).
 * - Không hiển thị hồ sơ giả như dữ liệu thật ở production route.
 * - Trước khi CP8C tích hợp, trang phản ánh trung thực trạng thái chờ API integration.
 * - Hỗ trợ tham số URL an toàn (?preview=...) để kiểm thử giao diện các trạng thái
 *   (full, fresher, draft, loading, unknown, forbidden, error) có gắn nhãn cảnh báo rõ ràng.
 */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Info } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  CandidateProfileView,
  type CandidateProfilePresentationState,
  type FullCandidateProfileRecord,
} from "@/features/candidate/profile";
import {
  MOCK_FIXTURE_DRAFT_SUMMARY,
  MOCK_FIXTURE_FRESHER_PROFILE,
  MOCK_FIXTURE_FULL_PROFILE,
} from "@/features/candidate/profile/fixtures/mockProfileData";

const CandidateProfilePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const previewParam = searchParams.get("preview");
  const user = useAuthStore((state) => state.user);
  const accountEmail = user?.email || "candidate@findwork.vn";

  // Quản lý dữ liệu giả định chỉ trong bộ nhớ khi bật chế độ Preview
  const [demoProfile, setDemoProfile] = useState<FullCandidateProfileRecord>(
    previewParam === "fresher" ? MOCK_FIXTURE_FRESHER_PROFILE : MOCK_FIXTURE_FULL_PROFILE
  );

  // Xác định trạng thái hiển thị dựa trên URL param hoặc mặc định chưa tích hợp
  let presentationState: CandidateProfilePresentationState = "eligibility_unknown";
  let activeProfile: FullCandidateProfileRecord | null = null;
  let activeDraft = null;

  if (previewParam === "full") {
    presentationState = "existing_profile";
    activeProfile = demoProfile;
  } else if (previewParam === "fresher") {
    presentationState = "existing_profile";
    activeProfile = demoProfile;
  } else if (previewParam === "draft") {
    presentationState = "not_created_with_draft";
    activeDraft = MOCK_FIXTURE_DRAFT_SUMMARY;
  } else if (previewParam === "loading") {
    presentationState = "loading";
  } else if (previewParam === "forbidden") {
    presentationState = "forbidden";
  } else if (previewParam === "nodraft") {
    presentationState = "not_created_no_draft";
  } else if (previewParam === "error") {
    presentationState = "network_error";
  } else {
    // Mặc định Production Route: Phản ánh trung thực trạng thái chờ API Integration từ CP8C
    presentationState = "eligibility_unknown";
  }

  return (
    <div>
      {/* Banner hướng dẫn kiểm thử giao diện (Development Preview Switcher) */}
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
        aria-label="Thanh điều khiển chế độ xem trước CP8B"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Info size={14} color="var(--color-primary, #4f6ef7)" aria-hidden="true" />
          <span>
            <strong>CP8B Presentation Mode:</strong>{" "}
            {previewParam
              ? `Đang xem kịch bản mẫu (?preview=${previewParam}) — Dữ liệu Mock Fixture.`
              : "Trạng thái sẵn sàng giao diện. Kết nối dữ liệu máy chủ thực tế sẽ được bàn giao tại CP8C."}
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
              Mặc định
            </button>
          )}
        </div>
      </aside>

      {/* Presentation Master Container */}
      <CandidateProfileView
        state={presentationState}
        profile={activeProfile}
        draftSummary={activeDraft}
        accountEmail={accountEmail}
        errorMessage="Chưa thể kết nối tới dịch vụ hồ sơ ứng viên. Vui lòng thử lại sau."
        onRetry={() => {
          // Handled in CP8C
        }}
        onConfirmImport={async (payload) => {
          // Mô phỏng tương tác thành công trong chế độ preview
          window.alert(
            `[CP8B Presentation Preview]: Xác nhận Import Onboarding hợp lệ với payload: version=${payload.version}, confirmPrivacy=${payload.confirmPrivacy}. Trong CP8C, mutation POST /candidate/profile/import-onboarding sẽ được thực thi.`
          );
          setSearchParams({ preview: "full" });
        }}
        onSaveOverview={async (data) => {
          setDemoProfile((prev) => ({
            ...prev,
            fullName: data.fullName,
            careerStatus: data.careerStatus,
            bio: data.bio,
            updatedAt: new Date().toISOString(),
          }));
        }}
        onSavePersonalInfo={async (data) => {
          setDemoProfile((prev) => ({
            ...prev,
            ...data,
            updatedAt: new Date().toISOString(),
          }));
        }}
        onAddEducation={async (edu) => {
          setDemoProfile((prev) => ({
            ...prev,
            education: [
              ...prev.education,
              { ...edu, id: `edu-${Date.now()}` },
            ],
            updatedAt: new Date().toISOString(),
          }));
        }}
        onDeleteEducation={async (id) => {
          setDemoProfile((prev) => ({
            ...prev,
            education: prev.education.filter((e) => e.id !== id),
            updatedAt: new Date().toISOString(),
          }));
        }}
        onAddExperience={async (exp) => {
          setDemoProfile((prev) => ({
            ...prev,
            experience: [
              ...prev.experience,
              { ...exp, id: `exp-${Date.now()}` },
            ],
            updatedAt: new Date().toISOString(),
          }));
        }}
        onDeleteExperience={async (id) => {
          setDemoProfile((prev) => ({
            ...prev,
            experience: prev.experience.filter((e) => e.id !== id),
            updatedAt: new Date().toISOString(),
          }));
        }}
        onAddSkill={async (skill) => {
          setDemoProfile((prev) => ({
            ...prev,
            skills: [
              ...prev.skills,
              { ...skill, id: `sk-${Date.now()}` },
            ],
            updatedAt: new Date().toISOString(),
          }));
        }}
        onDeleteSkill={async (id) => {
          setDemoProfile((prev) => ({
            ...prev,
            skills: prev.skills.filter((s) => s.id !== id),
            updatedAt: new Date().toISOString(),
          }));
        }}
        onAddLanguage={async (lang) => {
          setDemoProfile((prev) => ({
            ...prev,
            languages: [
              ...prev.languages,
              { ...lang, id: `lang-${Date.now()}` },
            ],
            updatedAt: new Date().toISOString(),
          }));
        }}
        onDeleteLanguage={async (id) => {
          setDemoProfile((prev) => ({
            ...prev,
            languages: prev.languages.filter((l) => l.id !== id),
            updatedAt: new Date().toISOString(),
          }));
        }}
        onSaveCareerPreference={async (pref) => {
          setDemoProfile((prev) => ({
            ...prev,
            careerPreference: pref,
            updatedAt: new Date().toISOString(),
          }));
        }}
        onSavePrivacy={async (privacy) => {
          setDemoProfile((prev) => ({
            ...prev,
            privacySetting: privacy,
            updatedAt: new Date().toISOString(),
          }));
        }}
      />
    </div>
  );
};

export default CandidateProfilePage;