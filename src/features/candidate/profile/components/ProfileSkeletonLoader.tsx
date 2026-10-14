/**
 * FINDWORK CP8B — PROFILE SKELETON LOADER
 * 
 * Hiển thị khung chờ tải dữ liệu nhẹ nhàng (Shimmer skeleton).
 * Hỗ trợ tắt chuyển động khi người dùng bật prefers-reduced-motion.
 */

import layoutStyles from "../styles/CandidateProfileLayout.module.css";
import styles from "../styles/ProfileGuidance.module.css";

export const ProfileSkeletonLoader = () => {
  return (
    <div className={layoutStyles.pageContainer} aria-busy="true" aria-label="Đang tải dữ liệu hồ sơ">
      <div className={layoutStyles.pageHeader}>
        <div className={styles.skeletonRow} style={{ width: "120px", marginBottom: "8px" }} />
        <div className={styles.skeletonRow} style={{ width: "240px", height: "28px" }} />
      </div>

      <div className={layoutStyles.workspaceGrid}>
        <div className={layoutStyles.mainColumn}>
          {/* Overview Skeleton */}
          <div className={styles.skeletonCard} style={{ minHeight: "160px" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div
                className={styles.skeletonRow}
                style={{ width: "80px", height: "80px", borderRadius: "9999px", flexShrink: 0 }}
              />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                <div className={styles.skeletonRow} style={{ width: "60%" }} />
                <div className={styles.skeletonRow} style={{ width: "40%" }} />
                <div className={styles.skeletonRow} style={{ width: "80%" }} />
              </div>
            </div>
          </div>

          {/* Personal Info Skeleton */}
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonRow} style={{ width: "30%", marginBottom: "1rem" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className={styles.skeletonRow} style={{ height: "40px" }} />
              <div className={styles.skeletonRow} style={{ height: "40px" }} />
              <div className={styles.skeletonRow} style={{ height: "40px" }} />
              <div className={styles.skeletonRow} style={{ height: "40px" }} />
            </div>
          </div>

          {/* Education / Experience Skeleton */}
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonRow} style={{ width: "25%", marginBottom: "1rem" }} />
            <div className={styles.skeletonRow} style={{ height: "60px", marginBottom: "8px" }} />
            <div className={styles.skeletonRow} style={{ height: "60px" }} />
          </div>
        </div>

        {/* Right Rail Skeleton */}
        <div className={layoutStyles.rightRail}>
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonRow} style={{ width: "50%", marginBottom: "1rem" }} />
            <div className={styles.skeletonRow} style={{ height: "24px", marginBottom: "6px" }} />
            <div className={styles.skeletonRow} style={{ height: "24px", marginBottom: "6px" }} />
            <div className={styles.skeletonRow} style={{ height: "24px", marginBottom: "6px" }} />
            <div className={styles.skeletonRow} style={{ height: "24px" }} />
          </div>
        </div>
      </div>
    </div>
  );
};
