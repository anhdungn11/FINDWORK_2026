import type {
  ChangeEvent,
} from "react";

import type {
  ResumeInfo,
} from "@/features/candidate/types/onboarding.types";

import {
  formatResumeFileSize,
  RESUME_ACCEPT,
} from "../utils/resume.utils";

import styles from "../styles/ResumeCard.module.css";

interface ResumeCardProps {
  value: ResumeInfo;
  error: string;
  onFileSelect: (
    file: File,
  ) => void;
  onResumeNameChange: (
    value: string,
  ) => void;
  onResumeNameBlur: () => void;
  onPreview: () => void;
  onRemove: () => void;
}

const ResumeCard = ({
  value,
  error,
  onFileSelect,
  onResumeNameChange,
  onResumeNameBlur,
  onPreview,
  onRemove,
}: ResumeCardProps) => {
  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      onFileSelect(file);
    }

    event.target.value = "";
  };

  return (
    <section className={styles.card}>
      <div className={styles.fileSummary}>
        <div className={styles.fileIcon}>
          PDF
        </div>

        <div className={styles.fileDetails}>
          <strong>
            {value.fileName}
          </strong>

          <span>
            {formatResumeFileSize(
              value.fileSize,
            )}
            {value.mimeType
              ? " · PDF"
              : ""}
          </span>
        </div>

        <span className={styles.readyBadge}>
          Sẵn sàng
        </span>
      </div>

      <div className={styles.nameField}>
        <label htmlFor="resume-name">
          Tên CV
          <span>*</span>
        </label>

        <input
          id="resume-name"
          type="text"
          maxLength={100}
          value={value.resumeName}
          placeholder="Ví dụ: CV Backend Developer"
          onChange={(event) =>
            onResumeNameChange(
              event.target.value,
            )
          }
          onBlur={onResumeNameBlur}
        />

        <p>
          Tên này sẽ giúp bạn nhận biết đúng CV khi chọn hồ sơ để ứng tuyển sau này.
        </p>
      </div>

      {error && (
        <p
          className={styles.errorMessage}
          role="alert"
        >
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onPreview}
        >
          Xem trước
        </button>

        <label
          className={styles.secondaryButton}
          htmlFor="candidate-resume-replace"
        >
          <input
            id="candidate-resume-replace"
            className={styles.fileInput}
            type="file"
            accept={RESUME_ACCEPT}
            onChange={handleFileChange}
          />
          Thay file
        </label>

        <button
          type="button"
          className={styles.removeButton}
          onClick={onRemove}
        >
          Xóa CV
        </button>
      </div>
    </section>
  );
};

export default ResumeCard;
