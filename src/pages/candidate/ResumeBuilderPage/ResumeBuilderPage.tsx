import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ResumeBuilderForm from "@/features/resume/builder/components/ResumeBuilderForm";
import ResumePreview from "@/features/resume/builder/components/ResumePreview";
import ResumeTemplatePicker from "@/features/resume/builder/components/ResumeTemplatePicker";
import { useResumeBuilder } from "@/features/resume/builder/hooks/useResumeBuilder";
import { resumeService } from "@/features/resume/services/resumeService";

import styles from "./ResumeBuilderPage.module.css";

const ResumeBuilderPage = () => {
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const builder = useResumeBuilder();

  const handleSave = async () => {
    if (!builder.isSavable || isSaving) return;

    setSaveError("");
    setIsSaving(true);

    try {
      await resumeService.createBuilderResume({
        name: builder.resumeName,
        templateCode: builder.templateCode,
        content: builder.content,
      });
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
          <button type="button" className={styles.backButton} onClick={() => navigate("/cv")}>
            <span>←</span>
            CV của tôi
          </button>
          <div className={styles.topbarDivider} />
          <div className={styles.brandBlock}>
            <span>FINDWORK</span>
            <strong>CV Builder</strong>
          </div>
        </div>

        <div className={styles.documentName}>
          <span>Tên CV</span>
          <input
            value={builder.resumeName}
            onChange={(event) => builder.setResumeName(event.target.value)}
            maxLength={80}
            aria-label="Tên CV"
          />
        </div>

        <div className={styles.topbarActions}>
          <span className={styles.draftBadge}>Bản nháp</span>
          <button
            type="button"
            className={styles.saveButton}
            disabled={!builder.isSavable || isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Đang lưu..." : "Lưu CV"}
          </button>
        </div>
      </header>

      {saveError && (
        <div className={styles.errorBanner} role="alert">
          {saveError}
        </div>
      )}

      <div className={styles.workspace}>
        <ResumeTemplatePicker
          value={builder.templateCode}
          onChange={builder.setTemplateCode}
        />

        <ResumeBuilderForm
          content={builder.content}
          onContentChange={builder.updateContent}
          onAddExperience={builder.addExperience}
          onUpdateExperience={builder.updateExperience}
          onRemoveExperience={builder.removeExperience}
          onAddEducation={builder.addEducation}
          onUpdateEducation={builder.updateEducation}
          onRemoveEducation={builder.removeEducation}
        />

        <ResumePreview
          content={builder.content}
          templateCode={builder.templateCode}
        />
      </div>
    </main>
  );
};

export default ResumeBuilderPage;
