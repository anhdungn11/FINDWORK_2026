import { RESUME_TEMPLATES } from "@/features/resume/builder/data/resumeTemplates";
import type { ResumeTemplateCode } from "@/features/resume/types/resume.types";

import styles from "./ResumeBuilder.module.css";

interface ResumeTemplatePickerProps {
  value: ResumeTemplateCode;
  onChange: (value: ResumeTemplateCode) => void;
}

const ResumeTemplatePicker = ({ value, onChange }: ResumeTemplatePickerProps) => (
  <aside className={styles.templatePanel} aria-label="Chọn mẫu CV">
    <div className={styles.templatePanelHeader}>
      <span className={styles.panelEyebrow}>Mẫu CV</span>
      <h2>Chọn bố cục</h2>
      <p>Mỗi mẫu có cấu trúc thật khác nhau, không chỉ đổi màu hay đường viền.</p>
    </div>

    <div className={styles.templateList}>
      {RESUME_TEMPLATES.map((template) => {
        const active = value === template.code;

        return (
          <button
            key={template.code}
            type="button"
            className={`${styles.templateCard} ${
              active ? styles.templateCardActive : ""
            }`}
            onClick={() => onChange(template.code)}
            aria-pressed={active}
          >
            <TemplateThumbnail code={template.code} />

            <div className={styles.templateCopy}>
              <div className={styles.templateTitleRow}>
                <strong>{template.name}</strong>
                {active && <span className={styles.selectedBadge}>Đang dùng</span>}
              </div>
              <p>{template.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  </aside>
);

const TemplateThumbnail = ({ code }: { code: ResumeTemplateCode }) => {
  if (code === "modern") {
    return (
      <div className={`${styles.templatePreview} ${styles.previewModern}`}>
        <div className={styles.previewSidebar}>
          <i className={styles.previewAvatar} />
          <i />
          <i />
          <i />
          <i className={styles.shortLine} />
        </div>
        <div className={styles.previewMain}>
          <span />
          <b />
          <i />
          <i />
          <em />
          <i />
          <i />
        </div>
      </div>
    );
  }

  if (code === "professional") {
    return (
      <div className={`${styles.templatePreview} ${styles.previewProfessional}`}>
        <div className={styles.previewTopBand}>
          <span />
          <i />
        </div>
        <div className={styles.previewColumns}>
          <div>
            <b />
            <i />
            <i />
            <b />
            <i />
          </div>
          <div>
            <b />
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>
    );
  }

  if (code === "fresher") {
    return (
      <div className={`${styles.templatePreview} ${styles.previewFresher}`}>
        <div className={styles.previewFresherHead}>
          <span />
          <i />
        </div>
        <div className={styles.previewTimeline}>
          <b />
          <i />
          <i />
          <b />
          <i />
          <i />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.templatePreview} ${styles.previewMinimal}`}>
      <span />
      <i className={styles.centerLine} />
      <b />
      <i />
      <i />
      <b />
      <i />
      <i />
    </div>
  );
};

export default ResumeTemplatePicker;
