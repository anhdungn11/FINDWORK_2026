import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, MouseEvent } from "react";

import {
  deriveResumeName,
  formatFileSize,
  validateResumeFile,
} from "@/features/resume/utils/resume.utils";

import styles from "./ResumeUploadModal.module.css";

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File, name: string) => Promise<boolean>;
}

const ResumeUploadModal = ({
  isOpen,
  onClose,
  onSubmit,
}: ResumeUploadModalProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [resumeName, setResumeName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setResumeName("");
      setError("");
      setIsSubmitting(false);
      setIsDragging(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const acceptFile = (nextFile: File) => {
    const validationError = validateResumeFile(nextFile);

    if (validationError) {
      setFile(null);
      setResumeName("");
      setError(validationError);
      return;
    }

    setFile(nextFile);
    setResumeName(deriveResumeName(nextFile.name));
    setError("");
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Hãy chọn một file PDF trước khi tiếp tục.");
      return;
    }

    if (!resumeName.trim()) {
      setError("Tên CV không được để trống.");
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit(file, resumeName.trim());
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-upload-title"
        onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>CV Center</span>
            <h2 id="resume-upload-title">Thêm CV</h2>
            <p>Tải PDF tối đa 10 MB. Bạn có thể đổi tên CV trước khi lưu.</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            ×
          </button>
        </div>

        <input
          ref={inputRef}
          className={styles.hiddenInput}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const selectedFile = event.target.files?.[0];
            if (selectedFile) acceptFile(selectedFile);
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
          <div className={styles.uploadIcon} aria-hidden="true">
            ↑
          </div>
          <strong>Kéo thả CV vào đây</strong>
          <span>hoặc</span>
          <button
            type="button"
            className={styles.chooseButton}
            onClick={() => inputRef.current?.click()}
          >
            Chọn file PDF
          </button>
        </div>

        {file && (
          <div className={styles.selectedFile}>
            <div>
              <strong>{file.name}</strong>
              <span>PDF · {formatFileSize(file.size)}</span>
            </div>
            <button type="button" onClick={() => setFile(null)}>
              Bỏ chọn
            </button>
          </div>
        )}

        <label className={styles.field}>
          <span>Tên CV</span>
          <input
            value={resumeName}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setResumeName(event.target.value)}
            placeholder="Ví dụ: CV Backend Developer"
            maxLength={100}
          />
          <small>Tên này chỉ dùng để bạn dễ quản lý CV trong FINDWORK.</small>
        </label>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className={styles.submitButton}
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang thêm..." : "Thêm CV"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ResumeUploadModal;
