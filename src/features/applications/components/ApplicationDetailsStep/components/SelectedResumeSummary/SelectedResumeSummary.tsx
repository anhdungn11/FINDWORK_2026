import type {
  Resume,
} from "@/features/resume/types/resume.types";

import styles from "./SelectedResumeSummary.module.css";

interface SelectedResumeSummaryProps {
  resume: Resume | null;

  onChangeResume: () => void;
}

const SelectedResumeSummary = ({
  resume,
  onChangeResume,
}: SelectedResumeSummaryProps) => {
  if (!resume) {
    return null;
  }

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h3>CV đang sử dụng</h3>

        <p>
          CV này sẽ được gắn với hồ sơ ứng tuyển hiện tại.
        </p>
      </header>

      <div className={styles.resume}>
        <div className={styles.icon}>
          CV
        </div>

        <div className={styles.info}>
          <strong>
            {resume.name}
          </strong>

          <span>
            {resume.sourceType === "builder"
              ? "CV tạo trên FINDWORK"
              : "PDF tải lên"}

            {" • "}

            Phiên bản{" "}
            {
              resume.currentVersion
                .versionNumber
            }
          </span>
        </div>

        <button
          type="button"
          className={styles.button}
          onClick={onChangeResume}
        >
          Đổi CV
        </button>
      </div>
    </section>
  );
};

export default SelectedResumeSummary;