import {
  Link,
} from "react-router-dom";

import styles from "../styles/CompanyDetailNotFound.module.css";

const CompanyDetailNotFound = () => {
  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.notFound}>
          <h1>
            Không tìm thấy công ty
          </h1>

          <p>
            Công ty bạn đang tìm không tồn tại hoặc đã bị xóa.
          </p>

          <Link to="/companies">
            Quay lại danh sách công ty
          </Link>
        </div>
      </div>
    </main>
  );
};

export default CompanyDetailNotFound;
