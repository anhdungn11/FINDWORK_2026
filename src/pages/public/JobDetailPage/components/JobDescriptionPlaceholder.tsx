import {
  DocumentIcon,
} from "./JobDetailIcons";

import JobDetailSectionHeader from "./JobDetailSectionHeader";

import cardStyles from "../styles/JobDetailCards.module.css";
import styles from "../styles/JobDetailDescription.module.css";

const JobDescriptionPlaceholder = () => {
  return (
    <section className={cardStyles.card}>
      <JobDetailSectionHeader
        label="MÔ TẢ CÔNG VIỆC"
        title="Chi tiết vị trí"
      />

      <div className={styles.futureData}>
        <div className={styles.futureIcon}>
          <DocumentIcon />
        </div>

        <div>
          <strong>
            Nội dung chi tiết sẽ được cập nhật
          </strong>

          <p>
            Mô tả công việc, yêu cầu ứng viên và
            quyền lợi sẽ được lấy từ dữ liệu tuyển
            dụng khi hệ thống kết nối
          </p>
        </div>
      </div>
    </section>
  );
};

export default JobDescriptionPlaceholder;
