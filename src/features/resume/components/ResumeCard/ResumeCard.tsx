import type { Resume } from "@/features/resume/types/resume.types";
import {
  formatFileSize,
  formatResumeUpdatedAt,
} from "@/features/resume/utils/resume.utils";

import styles from "./ResumeCard.module.css";

interface ResumeCardProps {
  resume: Resume;
  onSetDefault: (resumeId: string) => void;
}

const ResumeCard = ({ resume, onSetDefault }: ResumeCardProps) => {
  const handlePreview = () => {
    if (resume.sourceType === "uploaded" && resume.currentVersion.file) {
      const previewWindow = window.open(
        resume.currentVersion.file.previewUrl,
        "_blank",
        "noopener,noreferrer",
      );
      if (previewWindow) previewWindow.opener = null;
      return;
    }

    const content = resume.currentVersion.builderContent;
    if (!content) return;

    const previewWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!previewWindow) return;

    previewWindow.opener = null;
    previewWindow.document.write(buildBuilderPreviewHtml(resume.name, content));
    previewWindow.document.close();
  };

  const file = resume.currentVersion.file;

  return (
    <article className={styles.card}>
      <div className={styles.documentIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v5h5M10 13h5M10 17h5" />
        </svg>
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3>{resume.name}</h3>
          {resume.isDefault && <span className={styles.defaultBadge}>★ CV mặc định</span>}
        </div>

        <div className={styles.meta}>
          <span>{resume.sourceType === "builder" ? "CV tạo trên FINDWORK" : "PDF"}</span>
          {file && <><span aria-hidden="true">•</span><span>{formatFileSize(file.fileSize)}</span></>}
          <span aria-hidden="true">•</span>
          <span>Cập nhật {formatResumeUpdatedAt(resume.updatedAt)}</span>
        </div>

        <p className={styles.fileName} title={file?.originalFileName}>
          {file?.originalFileName ?? "Mẫu CV có thể chỉnh sửa trực tiếp trên FINDWORK"}
        </p>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} onClick={handlePreview}>Xem trước</button>
        {!resume.isDefault && (
          <button type="button" className={styles.defaultButton} onClick={() => onSetDefault(resume.id)}>Đặt mặc định</button>
        )}
      </div>
    </article>
  );
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const buildBuilderPreviewHtml = (name: string, content: NonNullable<Resume["currentVersion"]["builderContent"]>) => {
  const skills = content.skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("");
  const experience = content.experience.map((item) => `<section><strong>${escapeHtml(item.position || "Vị trí")}</strong><b>${escapeHtml(item.company || "Công ty")}</b><p>${escapeHtml(item.description)}</p></section>`).join("");
  const education = content.education.map((item) => `<section><strong>${escapeHtml(item.school || "Trường học")}</strong><b>${escapeHtml([item.degree, item.major].filter(Boolean).join(" · "))}</b><p>${escapeHtml(item.description)}</p></section>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(name)}</title><style>body{margin:0;background:#eef2f7;font-family:Arial,sans-serif;color:#1e293b}.paper{width:794px;min-height:1123px;margin:28px auto;background:white;padding:58px;box-sizing:border-box;box-shadow:0 18px 50px #0002;border-top:10px solid #2563eb}h1{margin:0;font-size:34px}h2{margin:7px 0 13px;color:#475569;font-size:17px}.contact{font-size:12px;color:#64748b}.block{margin-top:28px}.block>h3{text-transform:uppercase;letter-spacing:.12em;font-size:12px;border-bottom:1px solid #cbd5e1;padding-bottom:7px;color:#1d4ed8}.block p{white-space:pre-line;line-height:1.6;font-size:13px}.block section{margin:12px 0}.block section strong,.block section b{display:block}.block section b{font-size:12px;color:#64748b;margin-top:3px}.tags{display:flex;flex-wrap:wrap;gap:7px}.tags span{background:#f1f5f9;padding:6px 9px;border-radius:6px;font-size:12px}</style></head><body><main class="paper"><h1>${escapeHtml(content.fullName || "Họ và tên")}</h1><h2>${escapeHtml(content.professionalTitle || "Vị trí nghề nghiệp")}</h2><div class="contact">${[content.email,content.phone,content.location].filter(Boolean).map(escapeHtml).join(" · ")}</div>${content.summary ? `<div class="block"><h3>Giới thiệu</h3><p>${escapeHtml(content.summary)}</p></div>` : ""}${experience ? `<div class="block"><h3>Kinh nghiệm</h3>${experience}</div>` : ""}${education ? `<div class="block"><h3>Học vấn</h3>${education}</div>` : ""}${skills ? `<div class="block"><h3>Kỹ năng</h3><div class="tags">${skills}</div></div>` : ""}</main></body></html>`;
};

export default ResumeCard;
