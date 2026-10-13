import styles from "../styles/CandidateDashboard.module.css";

export const DashboardSkeleton = () => {
  return (
    <div
      className={styles.dashboard}
      role="status"
      aria-busy="true"
      aria-label="Đang tải dữ liệu bảng điều khiển ứng viên"
    >
      <div className={`${styles.skeleton} ${styles.skeletonHeader}`} />

      <div className={`${styles.skeleton} ${styles.skeletonCard}`} />

      <div className={styles.twoColGrid}>
        <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
      </div>

      <div className={`${styles.skeleton} ${styles.skeletonCard}`} style={{ height: "160px" }} />

      <div className={styles.quickActionsGrid}>
        <div className={styles.skeleton} style={{ height: "140px" }} />
        <div className={styles.skeleton} style={{ height: "140px" }} />
        <div className={styles.skeleton} style={{ height: "140px" }} />
        <div className={styles.skeleton} style={{ height: "140px" }} />
      </div>
    </div>
  );
};
