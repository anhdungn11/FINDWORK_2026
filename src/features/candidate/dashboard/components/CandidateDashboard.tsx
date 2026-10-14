import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useCandidateDashboardData } from "../hooks/useCandidateDashboardData";
import { CandidateDashboardHeader } from "./CandidateDashboardHeader";
import { OnboardingProgressCard } from "./OnboardingProgressCard";
import { ProfileSummaryCard } from "./ProfileSummaryCard";
import { CvSummaryCard } from "./CvSummaryCard";
import { ApplicationsStatusCard } from "./ApplicationsStatusCard";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { DashboardErrorState } from "./DashboardErrorState";
import styles from "../styles/CandidateDashboard.module.css";

export const CandidateDashboard = () => {
  const {
    data,
    isLoading,
    isError,
    errorMessage,
    isAuthenticated,
    refetch,
  } = useCandidateDashboardData();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <DashboardErrorState
        errorMessage={errorMessage}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!isAuthenticated || !data) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.card} style={{ alignItems: "center", textAlign: "center", padding: "3rem" }}>
          <h2 className={styles.headerTitle}>Vui lòng đăng nhập để xem bảng điều khiển</h2>
          <p className={styles.headerSubtitle}>
            Bạn cần đăng nhập tài khoản ứng viên để truy cập hồ sơ và quản lý hoạt động tìm việc.
          </p>
          <Link to="/login" className={styles.buttonPrimary}>
            <LogIn size={16} aria-hidden="true" />
            Đến trang đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <CandidateDashboardHeader
        user={data.user}
        displayName={data.displayName}
      />

      <OnboardingProgressCard progress={data.progress} />

      <div className={styles.twoColGrid}>
        <ProfileSummaryCard
          user={data.user}
          progress={data.progress}
          profileState={data.profileState}
          onRetryProfile={() => {
            void refetch();
          }}
        />
        <CvSummaryCard resumes={data.resumes} />
      </div>

      <ApplicationsStatusCard />

      <QuickActionsPanel />
    </div>
  );
};
