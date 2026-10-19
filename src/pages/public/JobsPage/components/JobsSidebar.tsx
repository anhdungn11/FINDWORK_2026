import { Link } from "react-router-dom";
import JobsMarketCard from "./JobsMarketCard";

import styles from "../styles/JobsSidebar.module.css";

const JobsSidebar = () => {
  return (
    <aside className={styles.sidebar}>
      <JobsMarketCard />

      <Link
        to="/candidate/profile"
        className={styles.sideAction}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div>
          <strong>
            Nguyện vọng nghề nghiệp
          </strong>

          <span>
            Thiết lập tiêu chí để nhận cơ hội phù hợp
          </span>
        </div>

        <span aria-hidden="true">→</span>
      </Link>

      <Link
        to="/candidate/saved-jobs"
        className={styles.sideAction}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div>
          <strong>Việc làm đã lưu</strong>

          <span>
            Xem danh sách các vị trí bạn đang theo dõi
          </span>
        </div>

        <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
};

export default JobsSidebar;
