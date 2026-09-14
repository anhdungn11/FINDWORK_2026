import {
  JOB_MARKET_TRENDS,
} from "../jobs-page.constants";

import styles from "../styles/JobsMarketCard.module.css";

const JobsMarketCard = () => {
  return (
    <div className={styles.marketCard}>
      <div className={styles.marketHeader}>
        <span className={styles.eyebrow}>
          THỊ TRƯỜNG VIỆC LÀM
        </span>

        <span className={styles.trendIcon}>
          ↗
        </span>
      </div>

      <h3>Xu hướng tuyển dụng</h3>

      <p
        className={
          styles.marketDescription
        }
      >
        Dữ liệu cập nhật tuần này
      </p>

      <div className={styles.trendList}>
        {JOB_MARKET_TRENDS.map(
          (trend) => (
            <div
              key={trend.name}
              className={
                styles.trendItem
              }
            >
              <div>
                <strong>
                  {trend.name}
                </strong>

                <span>
                  {trend.description}
                </span>
              </div>

              <b>{trend.change}</b>
            </div>
          ),
        )}
      </div>

      <button
        type="button"
        className={
          styles.analysisButton
        }
      >
        Xem phân tích chi tiết
      </button>
    </div>
  );
};

export default JobsMarketCard;
