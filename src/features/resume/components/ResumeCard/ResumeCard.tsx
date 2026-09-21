import type { Resume } from "@/features/resume/types/resume.types";
import {
  formatFileSize,
  formatResumeUpdatedAt,
} from "@/features/resume/utils/resume.utils";

import styles from "./ResumeCard.module.css";

interface ResumeCardProps {
  resume: Resume;
  onPreview: (resume: Resume) => void;
  onEdit: (resume: Resume) => void;
  onReplace: (resume: Resume) => void;
  onRename: (resume: Resume) => void;
  onDelete: (resume: Resume) => void;
  onSetDefault: (resumeId: string) => void;
}

const ResumeCard = ({
  resume,
  onPreview,
  onEdit,
  onReplace,
  onRename,
  onDelete,
  onSetDefault,
}: ResumeCardProps) => {
  const file = resume.currentVersion.file;
  const isBuilderResume = resume.sourceType === "builder";

  return (
    <article className={styles.card}>
      <div
        className={`${styles.documentIcon} ${
          isBuilderResume ? styles.builderIcon : styles.pdfIcon
        }`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24">
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v5h5M10 13h5M10 17h5" />
        </svg>
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3>{resume.name}</h3>
          {resume.isDefault && (
            <span className={styles.defaultBadge}>★ CV mặc định</span>
          )}
        </div>

        <div className={styles.meta}>
          <span>{isBuilderResume ? "CV tạo trên FINDWORK" : "PDF tải lên"}</span>
          <span aria-hidden="true">•</span>
          <span>Phiên bản {resume.currentVersion.versionNumber}</span>
          {file && (
            <>
              <span aria-hidden="true">•</span>
              <span>{formatFileSize(file.fileSize)}</span>
            </>
          )}
          <span aria-hidden="true">•</span>
          <span>Cập nhật {formatResumeUpdatedAt(resume.updatedAt)}</span>
        </div>

        <p className={styles.fileName} title={file?.originalFileName}>
          {file?.originalFileName ??
            "CV có thể chỉnh sửa trực tiếp trên FINDWORK"}
        </p>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.previewButton}
          onClick={() => onPreview(resume)}
        >
          Xem trước
        </button>

        {isBuilderResume ? (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onEdit(resume)}
          >
            Chỉnh sửa
          </button>
        ) : (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onReplace(resume)}
          >
            Thay file
          </button>
        )}

        <details className={styles.moreMenu}>
          <summary aria-label={`Quản lý ${resume.name}`}>•••</summary>
          <div className={styles.menuPanel}>
            <button type="button" onClick={() => onRename(resume)}>
              Đổi tên
            </button>

            {!resume.isDefault && (
              <button
                type="button"
                onClick={() => onSetDefault(resume.id)}
              >
                Đặt làm CV mặc định
              </button>
            )}

            <button
              type="button"
              className={styles.dangerAction}
              onClick={() => onDelete(resume)}
            >
              Xóa CV
            </button>
          </div>
        </details>
      </div>
    </article>
  );
};

export default ResumeCard;
