import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock, Info, Layers } from "lucide-react";
import { ONBOARDING_STEPS } from "../../utils/onboarding.constants";
import type { DashboardProgressResult } from "../types/dashboard.types";
import { formatDashboardDate } from "../utils/dashboardProgress";
import styles from "../styles/CandidateDashboard.module.css";

interface OnboardingProgressCardProps {
  progress: DashboardProgressResult;
}

export const OnboardingProgressCard = ({
  progress,
}: OnboardingProgressCardProps) => {
  const isStarted = progress.category !== "not_started";

  return (
    <article className={styles.card} aria-labelledby="onboarding-progress-title">
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleArea}>
          <div className={styles.cardIcon}>
            <Layers size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 id="onboarding-progress-title" className={styles.cardTitle}>
              Tiến độ bản nháp Onboarding (7 bước)
            </h2>
            <p className={styles.cardSubtitle}>
              Quy trình chuẩn hóa dữ liệu ứng viên đa ngành trên FINDWORK
            </p>
          </div>
        </div>

        <span
          className={`${styles.cardBadge} ${
            progress.isAtFinalStep ? styles.badgeInfo : styles.badgeDraft
          }`}
        >
          <Clock size={12} aria-hidden="true" />
          {progress.isAtFinalStep
            ? "Đang ở bước cuối 7/7 (Bản nháp)"
            : isStarted
            ? "Bản nháp đang thực hiện"
            : "Chưa bắt đầu"}
        </span>
      </div>

      {/* Transparency Banner: Distinguish step progress from verified completeness */}
      <aside className={`${styles.noticeBanner} ${styles.noticeInfo}`} role="note">
        <Info size={16} aria-hidden="true" />
        <div className={styles.noticeText}>
          <strong>Phân biệt vị trí bước và hồ sơ chính thức:</strong> Dữ liệu Onboarding được lưu tự động theo tài khoản trong cơ sở dữ liệu. Tiến độ phần trăm dưới đây chỉ phản ánh <em>vị trí bước hiện tại trong quy trình 7 bước</em>, không chứng minh toàn bộ trường dữ liệu đã hợp lệ hay hồ sơ đã được tạo/xuất bản chính thức.
        </div>
      </aside>

      {/* Progress Bar with Explicit Step-Position Label */}
      <div className={styles.progressOverview}>
        <span className={styles.progressLabel}>
          {isStarted
            ? `Vị trí bước: ${progress.stepNumber}/${progress.totalSteps} — ${progress.stepTitle}`
            : "Chưa bắt đầu bản nháp Onboarding"}
        </span>
        <span className={styles.progressPercent} title="Tiến độ vị trí bước">
          {progress.stepProgressPercent}% (Vị trí bước)
        </span>
      </div>

      <div
        className={styles.progressBarTrack}
        role="progressbar"
        aria-valuenow={progress.stepProgressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tiến độ vị trí bước trong bản nháp Onboarding"
        aria-valuetext={`Bước ${progress.stepNumber} trên ${progress.totalSteps}: ${progress.stepTitle}`}
      >
        <div
          className={styles.progressBarFill}
          style={{ width: `${progress.stepProgressPercent}%` }}
        />
      </div>

      {/* 7-Step Visual Roadmap */}
      <nav aria-label="Các bước trong quy trình Onboarding" className={styles.stepperRoadmap}>
        {ONBOARDING_STEPS.map((step, idx) => {
          const isCompleted = isStarted && idx < progress.stepIndex;
          const isActive = isStarted && idx === progress.stepIndex;

          let bubbleClass = styles.stepPending;
          if (isCompleted) bubbleClass = styles.stepCompleted;
          else if (isActive) bubbleClass = styles.stepActive;

          return (
            <div key={step.id} className={styles.stepItem}>
              <div
                className={`${styles.stepBubble} ${bubbleClass}`}
                aria-current={isActive ? "step" : undefined}
                title={`Bước ${step.number}: ${step.title}`}
              >
                {isCompleted ? (
                  <CheckCircle2 size={14} aria-hidden="true" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <span className={styles.stepName}>{step.title}</span>
            </div>
          );
        })}
      </nav>

      {/* Current Step Detail & Honest Action */}
      <div className={styles.currentStepDetail}>
        <div className={styles.stepDetailText}>
          <span className={styles.stepDetailTitle}>
            {isStarted
              ? `Bước ${progress.stepNumber}: ${progress.stepTitle}`
              : "Bắt đầu bước 1: Thông tin cá nhân"}
          </span>
          <span className={styles.stepDetailDesc}>
            {progress.stepDescription}
          </span>
          {progress.updatedAt && (
            <span className={styles.itemSub} style={{ marginTop: 4 }}>
              Lưu gần nhất: {formatDashboardDate(progress.updatedAt)}
            </span>
          )}
        </div>

        <Link to="/candidate/onboarding" className={styles.buttonPrimary}>
          {progress.category === "not_started"
            ? "Bắt đầu Onboarding"
            : progress.isAtFinalStep
            ? "Tiếp tục xem lại bản nháp 7 bước"
            : "Tiếp tục Onboarding"}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};
