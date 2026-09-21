import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ResumeBuilderForm from "@/features/resume/builder/components/ResumeBuilderForm";
import ResumeBuilderNav from "@/features/resume/builder/components/ResumeBuilderNav";
import ResumePreview from "@/features/resume/builder/components/ResumePreview";
import {
  useResumeBuilder,
  type ResumeBuilderInitialState,
} from "@/features/resume/builder/hooks/useResumeBuilder";
import { resumeService } from "@/features/resume/services/resumeService";
import type { Resume } from "@/features/resume/types/resume.types";

import styles from "./ResumeBuilderPage.module.css";

const ResumeBuilderPage = () => {
  const { resumeId } = useParams();
  const [existingResume, setExistingResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(resumeId));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!resumeId) return;

    let active = true;
    setIsLoading(true);
    setLoadError("");

    void resumeService.getById(resumeId).then((resume) => {
      if (!active) return;

      if (!resume) {
        setLoadError("Không tìm thấy CV cần chỉnh sửa.");
      } else if (resume.sourceType !== "builder") {
        setLoadError("CV PDF chỉ có thể thay file, không thể chỉnh sửa bằng CV Builder.");
      } else {
        setExistingResume(resume);
      }

      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [resumeId]);

  if (isLoading) {
    return <main className={styles.page}><div className={styles.pageState}>Đang tải CV...</div></main>;
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
        <button type="button" onClick={() => navigate("/cv")}>Quay lại CV Center</button>
      </div>
    </main>
  );
};

const ResumeBuilderEditor = ({ existingResume }: { existingResume: Resume | null }) => {
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const initialState = getInitialState(existingResume);
  const builder = useResumeBuilder(initialState);
  const isEditing = Boolean(existingResume);

  const handleSave = async () => {
    if (!builder.isSavable || isSaving) return;

    setSaveError("");
    setIsSaving(true);

    try {
      if (existingResume) {
        await resumeService.updateBuilderResume({
          resumeId: existingResume.id,
          name: builder.resumeName,
          templateCode: builder.templateCode,
          content: builder.content,
          settings: builder.settings,
        });
      } else {
        await resumeService.createBuilderResume({
          name: builder.resumeName,
          templateCode: builder.templateCode,
          content: builder.content,
          settings: builder.settings,
        });
      }

      navigate("/cv");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Không thể lưu CV.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button type="button" className={styles.backButton} onClick={() => navigate("/cv")}>← CV của tôi</button>
          <div className={styles.breadcrumbDivider} />
          <div className={styles.productTitle}>
            <span>FINDWORK</span>
            <strong>{isEditing ? "Chỉnh sửa CV" : "Trình tạo CV"}</strong>
          </div>
        </div>

        <label className={styles.documentName}>
          <span>Tên CV</span>
          <input value={builder.resumeName} onChange={(event) => builder.setResumeName(event.target.value)} maxLength={80} aria-label="Tên CV" />
        </label>

        <div className={styles.topbarActions}>
          <div className={styles.saveState}>
            <span className={styles.saveDot} />
            {existingResume ? `Phiên bản ${existingResume.currentVersion.versionNumber}` : "Bản nháp"}
          </div>
          <button type="button" className={styles.saveButton} disabled={!builder.isSavable || isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Lưu CV"}
          </button>
        </div>
      </header>

      {saveError && <div className={styles.errorBanner} role="alert">{saveError}</div>}

      <section className={styles.contextBar}>
        <div>
          <strong>{isEditing ? "Chỉnh sửa CV hiện có" : "Tạo CV chuyên nghiệp cho mọi ngành nghề"}</strong>
          <span>
            {isEditing
              ? "Khi lưu, CV sẽ chuyển sang phiên bản mới mà không thay đổi các Application Snapshot cũ trong kiến trúc backend sau này."
              : "Điền nội dung, chọn mẫu và kiểm tra bản xem trước theo thời gian thực."}
          </span>
        </div>
        <div className={styles.contextMeta}>
          <span>{builder.completionPercent}% hồ sơ chính</span>
          <span>•</span>
          <span>Dữ liệu chỉ được lưu khi bạn bấm nút lưu</span>
        </div>
      </section>

      <div className={styles.workspace}>
        <ResumeBuilderNav value={builder.activeSection} completion={builder.sectionCompletion} completionPercent={builder.completionPercent} onChange={builder.setActiveSection} />
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
        <ResumePreview content={builder.content} settings={builder.settings} templateCode={builder.templateCode} />
      </div>
    </main>
  );
};

const getInitialState = (resume: Resume | null): ResumeBuilderInitialState | undefined => {
  if (!resume || resume.sourceType !== "builder") return undefined;

  const { currentVersion } = resume;

  if (
    !currentVersion.builderContent ||
    !currentVersion.builderSettings ||
    !currentVersion.templateCode
  ) {
    return undefined;
  }

  return {
    resumeName: resume.name,
    templateCode: currentVersion.templateCode,
    content: currentVersion.builderContent,
    settings: currentVersion.builderSettings,
  };
};

export default ResumeBuilderPage;
