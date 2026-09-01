import { Link } from "react-router-dom";

import styles from "./Footer.module.css";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link to="/" className={styles.logo}>
              FINDWORK
            </Link>

            <p className={styles.description}>
              Nền tảng kết nối ứng viên và doanh nghiệp, giúp quá trình tìm việc
              và tuyển dụng trở nên minh bạch, nhanh chóng và hiệu quả hơn.
            </p>

            <div className={styles.badges}>
              <span>Việc làm phù hợp</span>
              <span>Doanh nghiệp uy tín</span>
            </div>
          </div>

          <div className={styles.columns}>
            <div className={styles.column}>
              <h3>Dành cho ứng viên</h3>

              <Link to="/jobs">Tìm việc làm</Link>
              <Link to="/companies">Khám phá công ty</Link>
              <Link to="/register">Tạo hồ sơ</Link>
              <Link to="/candidate">Quản lý hồ sơ</Link>
            </div>

            <div className={styles.column}>
              <h3>Dành cho nhà tuyển dụng</h3>

              <Link to="/employer">Đăng tin tuyển dụng</Link>
              <Link to="/employer">Tìm ứng viên</Link>
              <Link to="/employer">Quản lý tuyển dụng</Link>
              <Link to="/register">Đăng ký doanh nghiệp</Link>
            </div>

            <div className={styles.column}>
              <h3>Hỗ trợ</h3>

              <Link to="/about">Về FINDWORK</Link>
              <Link to="/help">Trung tâm trợ giúp</Link>
              <Link to="/privacy">Chính sách bảo mật</Link>
              <Link to="/terms">Điều khoản sử dụng</Link>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.bottom}>
          <p>© 2026 FINDWORK. All rights reserved.</p>

          <div className={styles.bottomLinks}>
            <span>Việt Nam</span>
            <span>Tiếng Việt</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;