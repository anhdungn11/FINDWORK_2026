import JobsMarketCard from "./JobsMarketCard";

import styles from "../styles/JobsSidebar.module.css";

const JobsSidebar = () => {
  return (
    <aside className={styles.sidebar}>
      <JobsMarketCard />

      <div className={styles.sideAction}>
        <div>
          <strong>
            Nhận việc làm phù hợp
          </strong>

          <span>
            Đăng ký để nhận việc mới mỗi ngày
          </span>
        </div>

        <span>→</span>
      </div>

      <div className={styles.sideAction}>
        <div>
          <strong>Việc đã lưu</strong>

          <span>
            Xem danh sách việc bạn đã lưu
          </span>
        </div>

        <span>→</span>
      </div>
    </aside>
  );
};

export default JobsSidebar;
