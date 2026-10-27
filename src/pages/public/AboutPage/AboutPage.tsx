import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";
import styles from "./AboutPage.module.css";

const AboutPage = () => {
  return (
    <div className={styles.page}>
      <div className="container">
        {/* Navigation Breadcrumb */}
        <nav className={styles.backNav} aria-label="Điều hướng trang">
          <Link to="/" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Quay lại trang chủ</span>
          </Link>
        </nav>

        {/* Hero Section */}
        <header className={styles.hero}>
          <span className={styles.eyebrow}>GIỚI THIỆU FINDWORK</span>
          <h1 className={styles.title}>Nền tảng Tuyển dụng & Tìm việc Hiện đại</h1>
          <p className={styles.description}>
            FINDWORK kết nối nhân tài và các doanh nghiệp hàng đầu thông qua dữ liệu việc làm
            minh bạch, công cụ tạo hồ sơ chuẩn hóa và trợ lý trí tuệ nhân tạo (AI) thông minh.
          </p>
        </header>

        {/* Owner & Legal Review Disclaimer */}
        <aside className={styles.reviewNotice} role="note">
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <strong>Lưu ý xác thực (Bản dự thảo sản phẩm):</strong> Nội dung trang mô tả chính xác các
            tính năng kỹ thuật đang hoạt động trong hệ thống FINDWORK v1.0. Các thông tin pháp nhân đăng ký
            kinh doanh, mã số doanh nghiệp và giấy phép sàn giao dịch việc làm đang chờ chủ sở hữu và ban
            pháp chế phê duyệt trước khi công bố thông tin pháp lý chính thức.
          </div>
        </aside>

        {/* Core Product Capabilities */}
        <section aria-labelledby="features-title">
          <h2 id="features-title" className="visually-hidden">Các năng lực cốt lõi</h2>
          <div className={styles.grid}>
            {/* Candidate Card */}
            <article className={styles.card}>
              <div className={styles.cardIcon}>
                <User size={24} aria-hidden="true" />
              </div>
              <h3 className={styles.cardTitle}>Dành cho Ứng viên</h3>
              <p className={styles.cardText}>
                Tìm việc làm nhanh chóng theo tiêu chí linh hoạt, xây dựng hồ sơ chuyên nghiệp và theo
                dõi tiến độ ứng tuyển minh bạch.
              </p>
              <ul className={styles.cardFeatures}>
                <li>
                  <CheckCircle2 size={16} color="var(--color-primary)" aria-hidden="true" />
                  <span>Tìm kiếm theo địa điểm, ngành nghề và hình thức làm việc</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="var(--color-primary)" aria-hidden="true" />
                  <span>Trung tâm CV Center với mẫu CV chuẩn hóa & xuất PDF</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="var(--color-primary)" aria-hidden="true" />
                  <span>Theo dõi lịch phỏng vấn và trạng thái hồ sơ trực tiếp</span>
                </li>
              </ul>
              <div className={styles.cardAction}>
                <Link to="/jobs" className={styles.cardLink}>
                  <span>Khám phá việc làm</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </article>

            {/* Employer Card */}
            <article className={styles.card}>
              <div className={styles.cardIcon}>
                <Building2 size={24} aria-hidden="true" />
              </div>
              <h3 className={styles.cardTitle}>Dành cho Nhà tuyển dụng</h3>
              <p className={styles.cardText}>
                Không gian làm việc chuyên nghiệp (Employer Workspace) giúp tối ưu hóa toàn diện quy
                trình tuyển dụng và kết nối ứng viên tiềm năng.
              </p>
              <ul className={styles.cardFeatures}>
                <li>
                  <CheckCircle2 size={16} color="var(--color-primary)" aria-hidden="true" />
                  <span>Đăng và quản trị tin tuyển dụng theo trạng thái vòng đời</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="var(--color-primary)" aria-hidden="true" />
                  <span>Phân quyền thành viên (Chủ sở hữu, Quản trị, Tuyển dụng)</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="var(--color-primary)" aria-hidden="true" />
                  <span>Quản lý chi nhánh, lịch phỏng vấn và đánh giá ứng viên</span>
                </li>
              </ul>
              <div className={styles.cardAction}>
                <Link to="/employer" className={styles.cardLink}>
                  <span>Không gian doanh nghiệp</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </article>

            {/* AI Assistant Card */}
            <article className={styles.card}>
              <div className={styles.cardIcon}>
                <Sparkles size={24} aria-hidden="true" />
              </div>
              <h3 className={styles.cardTitle}>FINDWORK AI Assistant</h3>
              <p className={styles.cardText}>
                Trợ lý thông minh đồng hành 24/7 giúp định hướng nghề nghiệp, giải đáp thắc mắc và gợi
                ý các cơ hội việc làm tương thích nhất.
              </p>
              <ul className={styles.cardFeatures}>
                <li>
                  <CheckCircle2 size={16} color="var(--color-primary)" aria-hidden="true" />
                  <span>Tư vấn định hướng kỹ năng và ngành nghề mục tiêu</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="var(--color-primary)" aria-hidden="true" />
                  <span>Gợi ý các vị trí tuyển dụng phù hợp với năng lực</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="var(--color-primary)" aria-hidden="true" />
                  <span>Hỗ trợ tức thì qua nút chat nổi ở mọi trang web</span>
                </li>
              </ul>
              <div className={styles.cardAction}>
                <Link to="/career" className={styles.cardLink}>
                  <span>Định hướng nghề nghiệp</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* Core Values */}
        <section className={styles.valuesSection} aria-labelledby="values-title">
          <div className={styles.valuesHeader}>
            <h2 id="values-title">Giá trị cốt lõi của FINDWORK</h2>
            <p>Xây dựng môi trường tuyển dụng đáng tin cậy dựa trên công nghệ hiện đại</p>
          </div>

          <div className={styles.valuesGrid}>
            <div className={styles.valueItem}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Search size={20} color="var(--color-primary)" aria-hidden="true" />
                <h3>Thông tin minh bạch</h3>
              </div>
              <p>
                Mọi tin tuyển dụng đều được phân loại chi tiết theo mức lương, địa điểm làm việc thực
                tế và yêu cầu kỹ năng cụ thể, loại bỏ các tin tuyển dụng thiếu trung thực.
              </p>
            </div>

            <div className={styles.valueItem}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldCheck size={20} color="var(--color-primary)" aria-hidden="true" />
                <h3>Bảo mật quyền riêng tư</h3>
              </div>
              <p>
                Bảo vệ tuyệt đối thông tin ứng viên và doanh nghiệp. Hệ thống phân quyền chặt chẽ, dữ
                liệu cá nhân chỉ được chia sẻ khi ứng viên chủ động nộp hồ sơ.
              </p>
            </div>

            <div className={styles.valueItem}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={20} color="var(--color-primary)" aria-hidden="true" />
                <h3>Trải nghiệm liền mạch</h3>
              </div>
              <p>
                Giao diện tinh gọn, phản hồi nhanh chóng trên mọi thiết bị máy tính bảng và điện thoại.
                Hệ thống lưu trữ bản nháp giúp người dùng không bị mất tiến trình thao tác.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Box */}
        <section className={styles.ctaBox} aria-label="Bắt đầu cùng FINDWORK">
          <div className={styles.ctaContent}>
            <h2>Sẵn sàng bắt đầu chặng đường mới?</h2>
            <p>
              Tạo tài khoản miễn phí để tiếp cận hàng nghìn cơ hội việc làm hoặc bắt đầu đăng tuyển
              những ứng viên tài năng cho doanh nghiệp của bạn.
            </p>
          </div>
          <div className={styles.ctaActions}>
            <Link to="/register" className={styles.primaryBtn}>
              Đăng ký ứng viên
            </Link>
            <Link to="/employer/register" className={styles.secondaryBtn}>
              Đăng ký doanh nghiệp
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
