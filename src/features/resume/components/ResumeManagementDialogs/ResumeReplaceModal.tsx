import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, MouseEvent } from "react";

import type { Resume } from "@/features/resume/types/resume.types";
import {
  formatFileSize,
  validateResumeFile,
} from "@/features/resume/utils/resume.utils";

import styles from "./ResumeManagementDialogs.module.css";

interface ResumeReplaceModalProps {
  resume: Resume | null;
  onClose: () => void;
  onSubmit: (resumeId: string, file: File) => Promise<boolean>;
}

const ResumeReplaceModal = ({
  resume,
  onClose,
  onSubmit,
}: ResumeReplaceModalProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFile(null);
    setError("");
    setIsDragging(false);
    setIsSubmitting(false);
  }, [resume]);

  if (!resume) return null;

  const acceptFile = (nextFile: File) => {
    const validationError = validateResumeFile(nextFile);

    if (validationError) {
      setFile(null);
      setError(validationError);
      return;
    }

    setFile(nextFile);
    setError("");
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Hãy chọn file PDF mới trước khi tiếp tục.");
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit(resume.id, file);
    setIsSubmitting(false);

    if (success) onClose();
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-replace-title"
        onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>CV PDF</span>
            <h2 id="resume-replace-title">Thay file CV</h2>
            <p>{resume.name} · phiên bản hiện tại {resume.currentVersion.versionNumber}</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Đóng">×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.notice}>
            File mới sẽ trở thành phiên bản {resume.currentVersion.versionNumber + 1}. Các đơn ứng tuyển đã gửi trước đó sẽ không bị thay đổi khi backend snapshot được tích hợp.
          </div>

          <input
            ref={inputRef}
            className={styles.hiddenInput}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const selected = event.target.files?.[0];
              if (selected) acceptFile(selected);
              event.currentTarget.value = "";
            }}
          />

          <div
            className={`${styles.dropzone} ${isDragging ? styles.dragging : ""}`}
            onDragEnter={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
            onDragLeave={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              setIsDragging(false);
              const droppedFile = event.dataTransfer.files?.[0];
              if (droppedFile) acceptFile(droppedFile);
            }}
          >
            <strong>Kéo thả PDF mới vào đây</strong>
            <span>PDF · tối đa 10 MB</span>
            <button type="button" className={styles.chooseButton} onClick={() => inputRef.current?.click()}>
              Chọn file PDF
            </button>
          </div>

          {file && (
            <div className={styles.selectedFile}>
              <div>
                <strong>{file.name}</strong>
                <span>{formatFileSize(file.size)}</span>
              </div>
              <button type="button" onClick={() => setFile(null)}>Bỏ chọn</button>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>Hủy</button>
          <button type="button" className={styles.primaryButton} disabled={isSubmitting} onClick={() => void handleSubmit()}>
            {isSubmitting ? "Đang thay..." : "Thay file CV"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ResumeReplaceModal;
