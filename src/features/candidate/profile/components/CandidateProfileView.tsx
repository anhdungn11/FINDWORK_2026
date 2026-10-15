/**
 * FINDWORK CP8B — CANDIDATE PROFILE VIEW (MASTER PRESENTATION CONTAINER)
 * 
 * Container điều phối toàn bộ tầng hiển thị của Candidate Profile.
 * Quản lý 9 trạng thái giao diện một cách độc lập, nhận typed props,
 * không tự ý gọi network API.
 */

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import type { CandidateProfileViewProps } from "../types/uiProfileProps.types";
import { buildGuidanceChecklist } from "../utils/profileFormatters";
import { CareerPreferencesSection } from "./CareerPreferencesSection";
import { CvCenterReferenceCard } from "./CvCenterReferenceCard";
import { EducationSection } from "./EducationSection";
import { ExperienceSection } from "./ExperienceSection";
import { OnboardingImportBanner } from "./OnboardingImportBanner";
import { OnboardingImportPreviewModal } from "./OnboardingImportPreviewModal";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { PrivacySettingsSection } from "./PrivacySettingsSection";
import { ProfileGuidanceChecklist } from "./ProfileGuidanceChecklist";
import { ProfileOverviewCard } from "./ProfileOverviewCard";
import { ProfileQuickNav } from "./ProfileQuickNav";
import { ProfileSkeletonLoader } from "./ProfileSkeletonLoader";
import { ProfileStateFeedback } from "./ProfileStateFeedback";
import { SkillsAndLanguagesSection } from "./SkillsAndLanguagesSection";
import layoutStyles from "../styles/CandidateProfileLayout.module.css";

export const CandidateProfileView = ({
  state,
  profile,
  draftSummary,
  draftData,
  accountEmail,
  errorMessage,
  isSaving = false,
  isPreview = false,
  isLiveWritesEnabled = false,
  onRetry,
  onGoToOnboarding = () => {
    window.location.href = "/candidate/onboarding";
  },
  onConfirmImport,
  onSavePersonalInfo,
  onSaveOverview,
  onAddEducation,
  onUpdateEducation,
  onDeleteEducation,
  onAddExperience,
  onUpdateExperience,
  onDeleteExperience,
  onAddSkill,
  onUpdateSkill,
  onDeleteSkill,
  onAddLanguage,
  onUpdateLanguage,
  onDeleteLanguage,
  onSaveCareerPreference,
  onSavePrivacy,
}: CandidateProfileViewProps) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // 1. Loading State
  if (state === "loading") {
    return <ProfileSkeletonLoader />;
  }

  // 2. Error / Boundary States (Other than existing or not_created_with_draft)
  if (
    state === "not_created_no_draft" ||
    state === "eligibility_unknown" ||
    state === "forbidden" ||
    state === "import_conflict" ||
    state === "profile_already_exists" ||
    state === "network_error"
  ) {
    return (
      <div className={layoutStyles.pageContainer}>
        <header className={layoutStyles.pageHeader}>
          <span className={layoutStyles.pageEyebrow}>Ứng viên · Hồ sơ cá nhân</span>
          <h1 className={layoutStyles.pageTitle}>Hồ sơ ứng viên</h1>
        </header>

        <ProfileStateFeedback
          state={state}
          errorMessage={errorMessage}
          onRetry={onRetry}
          onGoToOnboarding={onGoToOnboarding}
        />
      </div>
    );
  }

  // 3. Not Created BUT Has Onboarding Draft
  if (state === "not_created_with_draft" && draftSummary) {
    return (
      <div className={layoutStyles.pageContainer}>
        <header className={layoutStyles.pageHeader}>
          <span className={layoutStyles.pageEyebrow}>Ứng viên · Khởi tạo hồ sơ</span>
          <h1 className={layoutStyles.pageTitle}>Khởi tạo hồ sơ chính thức</h1>
          <p className={layoutStyles.pageSubtitle}>
            Hồ sơ chính thức sẽ giúp các thông tin học vấn, kỹ năng và kinh nghiệm được lưu trữ hoàn chỉnh và sẵn sàng để ứng tuyển việc làm.
          </p>
        </header>

        <OnboardingImportBanner
          draftSummary={draftSummary}
          onOpenImportPreview={() => setIsImportModalOpen(true)}
          onGoToOnboarding={onGoToOnboarding}
        />

        {isImportModalOpen && onConfirmImport && (
          <OnboardingImportPreviewModal
            isOpen={isImportModalOpen}
            draftSummary={draftSummary}
            draftData={draftData}
            isImporting={isSaving}
            importError={importError}
            onClose={() => setIsImportModalOpen(false)}
            onGoToOnboarding={onGoToOnboarding}
            onConfirmImport={async (payload) => {
              try {
                setImportError(null);
                await onConfirmImport(payload);
                setIsImportModalOpen(false);
              } catch (err) {
                setImportError(err instanceof Error ? err.message : "Đã có lỗi khi tạo hồ sơ.");
              }
            }}
          />
        )}
      </div>
    );
  }

  // 4. Existing Profile (Official Profile Active)
  if (!profile) {
    return (
      <div className={layoutStyles.pageContainer}>
        <ProfileStateFeedback
          state="network_error"
          errorMessage="Không tìm thấy bản ghi dữ liệu hồ sơ để hiển thị."
          onRetry={onRetry}
        />
      </div>
    );
  }

  const guidanceItems = buildGuidanceChecklist(profile);

  return (
    <div className={layoutStyles.pageContainer}>
      <header className={layoutStyles.pageHeader}>
        <span className={layoutStyles.pageEyebrow}>Ứng viên · Không gian làm việc</span>
        <h1 className={layoutStyles.pageTitle}>Hồ sơ cá nhân</h1>
        <p className={layoutStyles.pageSubtitle}>
          Quản lý thông tin nghề nghiệp, học vấn, kỹ năng và các tùy chọn bảo mật tài khoản của bạn trên FINDWORK.
        </p>
      </header>

      {errorMessage && (
        <div
          role="alert"
          style={{
            background: "#fee2e2",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            color: "#b91c1c",
            fontSize: "0.8125rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className={layoutStyles.workspaceGrid}>
        {/* CỘT CHÍNH (70% trên Desktop) */}
        <div className={layoutStyles.mainColumn}>
          {/* Section 1: Overview */}
          <ProfileOverviewCard
            fullName={profile.fullName}
            email={accountEmail}
            careerStatus={profile.careerStatus ?? null}
            bio={profile.bio}
            locationName={profile.province?.name}
            updatedAt={profile.updatedAt}
            isSaving={isSaving}
            isPreview={isPreview}
            isLiveWritesEnabled={isLiveWritesEnabled}
            onSaveOverview={onSaveOverview}
          />

          {/* Section 2: Personal Info */}
          <PersonalInfoSection
            profile={profile}
            accountEmail={accountEmail}
            isSaving={isSaving}
            isPreview={isPreview}
            isLiveWritesEnabled={isLiveWritesEnabled}
            onSavePersonalInfo={onSavePersonalInfo}
          />

          {/* Section 3: Education */}
          <EducationSection
            educationList={profile.education || []}
            isSaving={isSaving}
            onAddEducation={onAddEducation}
            onUpdateEducation={onUpdateEducation}
            onDeleteEducation={onDeleteEducation}
          />

          {/* Section 4: Experience (Tùy chọn) */}
          <ExperienceSection
            experienceList={profile.experience || []}
            isSaving={isSaving}
            onAddExperience={onAddExperience}
            onUpdateExperience={onUpdateExperience}
            onDeleteExperience={onDeleteExperience}
          />

          {/* Section 5: Skills & Languages */}
          <SkillsAndLanguagesSection
            skills={profile.skills || []}
            languages={profile.languages || []}
            isSaving={isSaving}
            onAddSkill={onAddSkill}
            onUpdateSkill={onUpdateSkill}
            onDeleteSkill={onDeleteSkill}
            onAddLanguage={onAddLanguage}
            onUpdateLanguage={onUpdateLanguage}
            onDeleteLanguage={onDeleteLanguage}
          />

          {/* Section 6: Career Preferences */}
          <CareerPreferencesSection
            careerPreference={profile.careerPreference}
            isSaving={isSaving}
            onSaveCareerPreference={onSaveCareerPreference}
          />

          {/* Section 7: Privacy Settings */}
          <PrivacySettingsSection
            privacySetting={
              profile.privacySetting || {
                searchableProfile: false,
                showEmail: false,
                showPhone: false,
                allowResumeDownload: false,
                allowJobMatching: true,
              }
            }
            isSaving={isSaving}
            onSavePrivacy={onSavePrivacy}
          />
        </div>

        {/* CỘT PHỤ RIGHT RAIL (30% trên Desktop) */}
        <aside className={layoutStyles.rightRail}>
          {/* Guidance Checklist (No %) */}
          <ProfileGuidanceChecklist items={guidanceItems} />

          {/* Quick Anchor Navigation */}
          <ProfileQuickNav />

          {/* Static CV Center Reference Card */}
          <CvCenterReferenceCard />
        </aside>
      </div>
    </div>
  );
};
