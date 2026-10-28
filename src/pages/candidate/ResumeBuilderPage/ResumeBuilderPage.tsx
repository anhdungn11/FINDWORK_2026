import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getReturnDestination } from "@/app/router/returnDestination";

import ResumeBuilderForm from "@/features/resume/builder/components/ResumeBuilderForm";
import ResumeBuilderNav from "@/features/resume/builder/components/ResumeBuilderNav";
import ResumePreview from "@/features/resume/builder/components/ResumePreview";
import ResumeTemplateDocument from "@/features/resume/builder/components/ResumeTemplateDocument";
import {
  useResumeBuilder,
  type ResumeBuilderInitialState,
  INITIAL_CONTENT,
  INITIAL_SETTINGS,
} from "@/features/resume/builder/hooks/useResumeBuilder";
import { useAuthStore } from "@/store/authStore";
import { resumeService } from "@/features/resume/services/resumeService";
import type { Resume } from "@/features/resume/types/resume.types";

import styles from "./ResumeBuilderPage.module.css";


const DRAFT_PREFIX = "findwork.builder.draft";
const getDraftKey = (userId: string | null | undefined, resumeId: string | null | undefined) =>
  `${DRAFT_PREFIX}.${userId ?? "anon"}.${resumeId ?? "new"}`;

interface BuilderDraft {
  resumeName: string;
  templateCode: any;
  content: any;
  settings: any;
  savedAt: number;
}

function saveBuilderDraft(userId: string | null | undefined, resumeId: string | null | undefined, draft: Omit<BuilderDraft, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    const key = getDraftKey(userId, resumeId);
    window.sessionStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Best effort
  }
}

function loadBuilderDraft(userId: string | null | undefined, resumeId: string | null | undefined): BuilderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const key = getDraftKey(userId, resumeId);
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as BuilderDraft;
  } catch {
    return null;
  }
}

function clearBuilderDraft(userId: string | null | undefined, resumeId: string | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    const key = getDraftKey(userId, resumeId);
    window.sessionStorage.removeItem(key);
  } catch {
    // Best effort
  }
}

const ResumeBuilderPage = () => {
  const { resumeId } = useParams();
  const authStatus = useAuthStore((s) => s.status);
  const [existingResume, setExistingResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(resumeId));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!resumeId) return;

    if (authStatus === "idle" || authStatus === "loading") {
      setIsLoading(true);
      return;
    }

    let active = true;
    setIsLoading(true);
    setLoadError("");

    void resumeService.getById(resumeId).then((resume) => {
      if (!active) return;

      if (!resume) {
        setLoadError("Không tìm thấy CV cần chỉnh sửa.");
      } else if (resume.sourceType !== "builder") {
        setLoadError(
          "CV PDF chỉ có thể thay file, không thể chỉnh sửa bằng CV Builder.",
        );
      } else {
        setExistingResume(resume);
      }

      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [resumeId, authStatus]);

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.pageState}>Đang tải CV...</div>
      </main>
    );
  }

  if (loadError) {
    return <BuilderLoadError message={loadError} />;
  }

  return (
    <ResumeBuilderEditor
      key={existingResume?.id ?? "new-resume"}
      existingResume={existingResume}
    />
  );
};

const BuilderLoadError = ({ message }: { message: string }) => {
  const navigate = useNavigate();

  return (
    <main className={styles.page}>
      <div className={styles.pageState}>
        <strong>{message}</strong>
        <button type="button" onClick={() => navigate("/cv")}>
          Quay lại CV Center
        </button>
      </div>
    </main>
  );
};

const ResumeBuilderEditor = ({
  existingResume,
}: {
  existingResume: Resume | null;
}) => {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const [searchParams] = useSearchParams();
  const rawReturnTo = searchParams.get("returnTo");
  const targetReturnUrl = rawReturnTo ? getReturnDestination(rawReturnTo) : null;
  const isCustomReturn = Boolean(rawReturnTo && targetReturnUrl && targetReturnUrl === rawReturnTo);

  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const savedDraft = loadBuilderDraft(userId, existingResume?.id);
  const initialState = getInitialState(existingResume, savedDraft);
  const builder = useResumeBuilder(initialState);
  const isEditing = Boolean(existingResume);

  // Auto-save draft so changes are never lost on refresh
  useEffect(() => {
    const timer = setTimeout(() => {
      saveBuilderDraft(userId, existingResume?.id, {
        resumeName: builder.resumeName,
        templateCode: builder.templateCode,
        content: builder.content,
        settings: builder.settings,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [userId, existingResume?.id, builder.resumeName, builder.templateCode, builder.content, builder.settings]);

  const handleSave = async () => {
    if (!builder.isSavable || isSaving) return;

    setSaveError("");
    setIsSaving(true);

    try {
      let savedResume: Resume;
      if (existingResume) {
        savedResume = await resumeService.updateBuilderResume({
          resumeId: existingResume.id,
          name: builder.resumeName,
          templateCode: builder.templateCode,
          content: builder.content,
          settings: builder.settings,
        });
      } else {
        savedResume = await resumeService.createBuilderResume({
          name: builder.resumeName,
          templateCode: builder.templateCode,
          content: builder.content,
          settings: builder.settings,
        });
      }

      clearBuilderDraft(userId, existingResume?.id);
      if (isCustomReturn && targetReturnUrl) {
        const separator = targetReturnUrl.includes("?") ? "&" : "?";
        navigate(`${targetReturnUrl}${separator}createdCvId=${encodeURIComponent(savedResume.id)}`);
      } else {
        navigate("/cv");
      }
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Không thể lưu CV.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => {
              if (isCustomReturn && targetReturnUrl) {
                navigate(targetReturnUrl);
              } else {
                navigate("/cv");
              }
            }}
          >
            <span aria-hidden="true">←</span>
            {isCustomReturn ? "Quay lại đơn ứng tuyển" : "CV của tôi"}
          </button>

          <div className={styles.brandBlock}>
            <span>FINDWORK</span>
            <strong>{isEditing ? "Resume Studio" : "Tạo CV mới"}</strong>
          </div>
        </div>

        <label className={styles.documentName}>
          <span>Tên CV</span>
          <input
            value={builder.resumeName}
            onChange={(event) => builder.setResumeName(event.target.value)}
            maxLength={80}
            aria-label="Tên CV"
            placeholder="Ví dụ: CV Kế toán tổng hợp"
          />
        </label>

        <div className={styles.topbarActions}>
          <div className={styles.saveState}>
            <span className={styles.saveDot} />
            <div>
              <strong>{existingResume ? "Đã lưu" : "Bản nháp"}</strong>
              <small>
                {existingResume
                  ? `Phiên bản ${existingResume.currentVersion.versionNumber}`
                  : "Chưa lưu lên CV Center"}
              </small>
            </div>
          </div>

          <button
            type="button"
            className={styles.previewButton}
            onClick={() => setIsPreviewOpen(true)}
          >
            Xem toàn màn hình
          </button>

          <button
            type="button"
            className={styles.saveButton}
            disabled={!builder.isSavable || isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving
              ? "Đang lưu..."
              : isEditing
                ? "Lưu thay đổi"
                : "Lưu CV"}
          </button>
        </div>
      </header>

      {saveError && (
        <div className={styles.errorBanner} role="alert">
          {saveError}
        </div>
      )}

      <section className={styles.studioIntro}>
        <div>
          <span className={styles.studioEyebrow}>RESUME STUDIO</span>
          <strong>
            {isEditing
              ? "Khi lưu, CV sẽ chuyển sang phiên bản mới mà không thay đổi các Application Snapshot cũ trong kiến trúc backend sau này."
              : "Điền nội dung, chọn mẫu và kiểm tra bản xem trước theo thời gian thực."}
          </strong>
        </div>

        <div className={styles.completionCard}>
          <div>
            <span>Hồ sơ chính</span>
            <strong>{builder.completionPercent}%</strong>
          </div>
          <div className={styles.completionTrack}>
            <span style={{ width: `${builder.completionPercent}%` }} />
          </div>
        </div>
      </section>

      <div className={styles.workspace}>
        <ResumeBuilderNav
          value={builder.activeSection}
          completion={builder.sectionCompletion}
          completionPercent={builder.completionPercent}
          onChange={builder.setActiveSection}
        />

        <ResumeBuilderForm
          activeSection={builder.activeSection}
          content={builder.content}
          settings={builder.settings}
          templateCode={builder.templateCode}
          onTemplateChange={builder.setTemplateCode}
          onContentChange={builder.updateContent}
          onSettingsChange={builder.updateSettings}
          onApplyIndustryPreset={builder.applyIndustryPreset}
          onPhotoFileChange={builder.setPhotoFile}
          onAddLink={builder.addLink}
          onUpdateLink={builder.updateLink}
          onRemoveLink={builder.removeLink}
          onAddExperience={builder.addExperience}
          onUpdateExperience={builder.updateExperience}
          onRemoveExperience={builder.removeExperience}
          onAddEducation={builder.addEducation}
          onUpdateEducation={builder.updateEducation}
          onRemoveEducation={builder.removeEducation}
          onAddSkillGroup={builder.addSkillGroup}
          onUpdateSkillGroup={builder.updateSkillGroup}
          onRemoveSkillGroup={builder.removeSkillGroup}
          onAddLanguage={builder.addLanguage}
          onUpdateLanguage={builder.updateLanguage}
          onRemoveLanguage={builder.removeLanguage}
          onAddCertification={builder.addCertification}
          onUpdateCertification={builder.updateCertification}
          onRemoveCertification={builder.removeCertification}
          onAddProject={builder.addProject}
          onUpdateProject={builder.updateProject}
          onRemoveProject={builder.removeProject}
          onAddAward={builder.addAward}
          onUpdateAward={builder.updateAward}
          onRemoveAward={builder.removeAward}
          onAddActivity={builder.addActivity}
          onUpdateActivity={builder.updateActivity}
          onRemoveActivity={builder.removeActivity}
          onAddVolunteer={builder.addVolunteer}
          onUpdateVolunteer={builder.updateVolunteer}
          onRemoveVolunteer={builder.removeVolunteer}
          onAddReference={builder.addReference}
          onUpdateReference={builder.updateReference}
          onRemoveReference={builder.removeReference}
          onAddCustomSection={builder.addCustomSection}
          onUpdateCustomSection={builder.updateCustomSection}
          onRemoveCustomSection={builder.removeCustomSection}
          onAddCustomItem={builder.addCustomItem}
          onUpdateCustomItem={builder.updateCustomItem}
          onRemoveCustomItem={builder.removeCustomItem}
          onToggleSectionVisibility={builder.toggleSectionVisibility}
          onMoveSection={builder.moveSection}
        />

        <ResumePreview
          content={builder.content}
          settings={builder.settings}
          templateCode={builder.templateCode}
        />
      </div>

      {isPreviewOpen && (
        <div
          className={styles.previewOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Xem trước CV toàn màn hình"
        >
          <div className={styles.previewOverlayToolbar}>
            <div>
              <span>BẢN XEM TRƯỚC</span>
              <strong>{builder.resumeName || "CV chưa đặt tên"}</strong>
            </div>

            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              aria-label="Đóng xem trước"
            >
              Đóng
            </button>
          </div>

          <div className={styles.previewOverlayStage}>
            <div className={styles.previewOverlayPaper}>
              <ResumeTemplateDocument
                content={builder.content}
                settings={builder.settings}
                templateCode={builder.templateCode}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

const getInitialState = (
  resume: Resume | null,
  draft?: BuilderDraft | null,
): ResumeBuilderInitialState | undefined => {
  if (draft) {
    return {
      resumeName: draft.resumeName,
      templateCode: draft.templateCode || "classic",
      content: draft.content || INITIAL_CONTENT,
      settings: draft.settings || INITIAL_SETTINGS,
    };
  }

  if (!resume || resume.sourceType !== "builder") return undefined;

  const { currentVersion } = resume;

  return {
    resumeName: resume.name || "CV mới",
    templateCode: currentVersion?.templateCode || "classic",
    content: currentVersion?.builderContent || INITIAL_CONTENT,
    settings: currentVersion?.builderSettings || INITIAL_SETTINGS,
  };
};

export default ResumeBuilderPage;
