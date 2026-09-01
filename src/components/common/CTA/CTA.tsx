import { Link } from "react-router-dom";

import Button from "@/components/common/Button";

import styles from "./CTA.module.css";

const CTA = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.content}>
          <div>
            <h2 className={styles.title}>
              Sẵn sàng cho cơ hội tiếp theo?
            </h2>

            <p className={styles.description}>
              Tạo hồ sơ FINDWORK và bắt đầu khám phá những công việc
              phù hợp với kỹ năng và mục tiêu nghề nghiệp của bạn.
            </p>
          </div>

          <Link to="/register">
            <Button size="large">
              Tạo tài khoản
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTA;