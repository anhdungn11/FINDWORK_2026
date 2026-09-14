import {
  Link,
} from "react-router-dom";

import styles from "../styles/JobDetailNotFound.module.css";

const JobDetailNotFound = () => {
  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.notFound}>
          <span className={styles.notFoundCode}>
            404
          </span>

          <h1>
            Không tìm thấy việc làm
          </h1>

          <p>
            Việc làm bạn đang tìm không tồn tại hoặc
            không còn khả dụng.
          </p>

          <Link to="/jobs">
            Quay lại danh sách việc làm
          </Link>
        </div>
      </div>
    </main>
  );
};

export default JobDetailNotFound;
