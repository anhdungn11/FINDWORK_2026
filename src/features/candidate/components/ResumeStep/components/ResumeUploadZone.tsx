import type {
  ChangeEvent,
} from "react";

import {
  RESUME_ACCEPT,
} from "../utils/resume.utils";

import styles from "../styles/ResumeStep.module.css";

interface ResumeUploadZoneProps {
  error: string;
  onFileSelect: (
    file: File,
  ) => void;
}

const ResumeUploadZone = ({
  error,
  onFileSelect,
}: ResumeUploadZoneProps) => {
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
    <section className={styles.uploadSection}>
      <div className={styles.sectionHeading}>
        <span>CV CỦA BẠN</span>
        <h4>Tải CV của bạn lên</h4>
        <p>
          Dùng một CV PDF để sẵn sàng cho quá trình ứng tuyển. Bạn có thể quản lý nhiều CV sau khi hoàn tất onboarding.
        </p>
      </div>

      <label
        className={styles.uploadZone}
        htmlFor="candidate-resume-upload"
      >
        <input
          id="candidate-resume-upload"
          className={styles.fileInput}
          type="file"
          accept={RESUME_ACCEPT}
          onChange={handleFileChange}
        />

        <span className={styles.uploadIcon}>
          ↑
        </span>

        <strong>
          Chọn CV từ máy tính
        </strong>

        <span>
          PDF · tối đa 10 MB
        </span>
      </label>

      {error && (
        <p
          className={styles.errorMessage}
          role="alert"
        >
          {error}
        </p>
      )}
    </section>
  );
};

export default ResumeUploadZone;
