import { Link } from "react-router-dom";
import styles from "../styles/JobsMarketCard.module.css";

const JobsMarketCard = () => {
  return (
    <div className={styles.marketCard}>
      <div className={styles.marketHeader}>
        <span className={styles.eyebrow}>
          HƯỚNG DẪN ỨNG VIÊN
        </span>

        <span className={styles.trendIcon} aria-hidden="true">
          ★
        </span>
      </div>

      <h3>Mẹo nộp đơn hiệu quả</h3>

      <p className={styles.marketDescription}>
        Tiêu chuẩn tuyển dụng trên FINDWORK
      </p>

      <div className={styles.trendList}>
        <div className={styles.trendItem}>
          <div>
            <strong>CV Builder trực tuyến</strong>
            <span>Được số hóa sẵn sàng nộp trực tiếp không cần chuyển đổi định dạng</span>
          </div>
        </div>

        <div className={styles.trendItem}>
          <div>
            <strong>Câu hỏi sàng lọc</strong>
            <span>Trả lời đầy đủ yêu cầu của nhà tuyển dụng để hồ sơ được ưu tiên duyệt</span>
          </div>
        </div>

        <div className={styles.trendItem}>
          <div>
            <strong>Theo dõi minh bạch</strong>
            <span>Cập nhật tiến trình xét duyệt từ nộp đơn đến phỏng vấn tại Không gian ứng viên</span>
          </div>
        </div>
      </div>

      <Link
        to="/cv/create"
        className={styles.analysisButton}
        style={{ display: "block", textAlign: "center", textDecoration: "none" }}
      >
        Tạo hồ sơ CV ngay
      </Link>
    </div>
  );
};

export default JobsMarketCard;
