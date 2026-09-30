import { Link } from "react-router-dom";

import type { Resume } from "@/features/resume/types/resume.types";

import styles from "./ResumeSelectionStep.module.css";

interface ResumeSelectionStepProps {
  resumes: Resume[];
  selectedResumeId: string;
  onSelectResume: (resumeId: string) => void;
  onContinue: () => void;
}

const ResumeSelectionStep = ({
  resumes,
  selectedResumeId,
  onSelectResume,
  onContinue,
}: ResumeSelectionStepProps) => {
  if (resumes.length === 0) {
    return (
      <section className={styles.card}>
        <div className={styles.heading}>
          <span>Bước 1</span>
          <h2>Chọn CV để ứng tuyển</h2>
          <p>
            Chọn một CV phù hợp với vị trí đang ứng tuyển.
          </p>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>CV</div>

          <h3>Bạn chưa có CV sẵn sàng</h3>

          <p>
            Tạo CV trực tiếp trên FINDWORK hoặc tải lên CV PDF
            trước khi tiếp tục ứng tuyển.
          </p>

          <div className={styles.emptyActions}>
            <Link
              to="/cv/create"
              className={styles.primaryAction}
            >
              Tạo CV mới
            </Link>

            <Link
              to="/cv"
              className={styles.secondaryAction}
            >
              Trung tâm CV
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.headingRow}>
        <div className={styles.heading}>
          <span>Bước 1</span>
          <h2>Chọn CV để ứng tuyển</h2>
          <p>
            Chọn hồ sơ phù hợp nhất với vị trí này.
          </p>
        </div>

        <Link
          to="/cv"
          className={styles.manageLink}
        >
          Quản lý CV
        </Link>
      </div>

      <div className={styles.resumeList}>
        {resumes.map((resume) => {
          const isSelected =
            resume.id === selectedResumeId;

          return (
            <label
              key={resume.id}
              className={`${styles.resumeCard} ${
                isSelected ? styles.selected : ""
              }`}
            >
              <input
                type="radio"
                name="application-resume"
                checked={isSelected}
                onChange={() =>
                  onSelectResume(resume.id)
                }
              />

              <div className={styles.resumeInfo}>
                <div className={styles.resumeTitle}>
                  <strong>{resume.name}</strong>

                  {resume.isDefault && (
                    <span>CV mặc định</span>
                  )}
                </div>

                <p>
                  {resume.sourceType === "builder"
                    ? "CV tạo trên FINDWORK"
                    : "PDF tải lên"}
                  {" • "}
                  Phiên bản{" "}
                  {resume.currentVersion.versionNumber}
                </p>
              </div>

              <Link
                to={`/cv/${resume.id}/preview`}
                target="_blank"
                className={styles.previewLink}
              >
                Xem trước
              </Link>
            </label>
          );
        })}
      </div>

      <div className={styles.footer}>
        <span>
          {selectedResumeId
            ? "CV đã được chọn"
            : "Chọn một CV để tiếp tục"}
        </span>

        <button
          type="button"
          disabled={!selectedResumeId}
          onClick={onContinue}
        >
          Tiếp tục →
        </button>
      </div>
    </section>
  );
};

export default ResumeSelectionStep;