import { Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, FileCheck2 } from "lucide-react";
import styles from "./TermsOfUsePage.module.css";

const TermsOfUsePage = () => {
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
          <span className={styles.eyebrow}>ĐIỀU KHOẢN & QUY ĐỊNH DỊCH VỤ</span>
          <h1 className={styles.title}>Điều Khoản Sử Dụng Nền Tảng</h1>
          <p className={styles.meta}>Phiên bản dự thảo v1.0 • Cập nhật lần cuối: Tháng 10/2026</p>
        </header>

        {/* Owner & Legal Review Disclaimer */}
        <aside className={styles.reviewNotice} role="note">
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <strong>Lưu ý xác thực (Bản dự thảo pháp lý):</strong> Bản điều khoản này quy định nguyên tắc
            sử dụng và trách nhiệm giữa người dùng và nền tảng theo đúng phạm vi hoạt động kỹ thuật hiện hành của
            FINDWORK v1.0. Các điều khoản thương mại ràng buộc, chế tài pháp lý chính thức và quy chế sàn giao dịch
            việc làm đang chờ chủ sở hữu và ban pháp chế hoàn thiện trước khi ban hành chính thức.
          </div>
        </aside>

        {/* Document Content Card */}
        <main className={styles.contentCard}>
          {/* Section 1 */}
          <section className={styles.section} aria-labelledby="section-1">
            <h2 id="section-1" className={styles.sectionTitle}>
              <span className={styles.number}>1</span>
              <span>Chấp thuận điều khoản và định nghĩa</span>
            </h2>
            <p className={styles.paragraph}>
              Bằng việc truy cập hoặc đăng ký tài khoản trên FINDWORK, bạn đồng ý tuân thủ các điều khoản này.
              Nếu bạn không đồng ý với bất kỳ phần nào, vui lòng ngưng sử dụng dịch vụ của chúng tôi.
            </p>
            <ul className={styles.list}>
              <li>
                <strong>Nền tảng FINDWORK:</strong> Bao gồm hệ thống website, các giao diện quản trị tuyển dụng, trung tâm CV Center và dịch vụ trợ lý trí tuệ nhân tạo FINDWORK AI.
              </li>
              <li>
                <strong>Ứng viên (Người tìm việc):</strong> Cá nhân tạo tài khoản để tìm kiếm việc làm, tạo hồ sơ CV và nộp hồ sơ ứng tuyển.
              </li>
              <li>
                <strong>Nhà tuyển dụng (Doanh nghiệp):</strong> Tổ chức, công ty hoặc người đại diện hợp pháp sử dụng dịch vụ để đăng tin tuyển dụng và tìm kiếm nhân sự.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className={styles.section} aria-labelledby="section-2">
            <h2 id="section-2" className={styles.sectionTitle}>
              <span className={styles.number}>2</span>
              <span>Trách nhiệm và quyền hạn của Ứng viên</span>
            </h2>
            <p className={styles.paragraph}>
              Ứng viên có quyền tiếp cận các tin tuyển dụng công khai và sử dụng các công cụ hỗ trợ nghề nghiệp:
            </p>
            <ul className={styles.list}>
              <li>
                Cung cấp thông tin trung thực về học vấn, kinh nghiệm làm việc và kỹ năng chuyên môn trong hồ sơ ứng tuyển.
              </li>
              <li>
                Không tải lên CV hoặc tài liệu chứa nội dung xúc phạm, vi phạm bản quyền hoặc trái pháp luật hiện hành.
              </li>
              <li>
                Tự chịu trách nhiệm bảo mật mật khẩu tài khoản và không chia sẻ quyền truy cập tài khoản cho người khác.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className={styles.section} aria-labelledby="section-3">
            <h2 id="section-3" className={styles.sectionTitle}>
              <span className={styles.number}>3</span>
              <span>Quy định đối với Doanh nghiệp và Nhà tuyển dụng</span>
            </h2>
            <p className={styles.paragraph}>
              Doanh nghiệp tham gia tuyển dụng trên FINDWORK có trách nhiệm duy trì môi trường việc làm minh bạch:
            </p>
            <div className={styles.highlightBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <FileCheck2 size={18} color="var(--color-primary)" aria-hidden="true" />
                <strong>Cam kết minh bạch tuyển dụng:</strong>
              </div>
              Tuyệt đối không thu bất kỳ khoản chi phí nào từ ứng viên dưới mọi hình thức (phí hồ sơ, phí đào tạo, phí đặt cọc).
              Tin tuyển dụng phải thể hiện chính xác địa điểm làm việc, mô tả công việc và mức lương dự kiến.
            </div>
            <ul className={styles.list}>
              <li>
                Chỉ sử dụng dữ liệu hồ sơ ứng viên nhận được cho mục đích đánh giá và tuyển dụng của chính doanh nghiệp.
              </li>
              <li>
                Tuân thủ phân quyền nội bộ (Chủ sở hữu, Quản trị viên, Chuyên viên tuyển dụng) và chịu trách nhiệm về các hành động của thành viên được phân quyền.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className={styles.section} aria-labelledby="section-4">
            <h2 id="section-4" className={styles.sectionTitle}>
              <span className={styles.number}>4</span>
              <span>Quy định sử dụng Trợ lý AI FINDWORK</span>
            </h2>
            <p className={styles.paragraph}>
              FINDWORK AI là công cụ đồng hành thông minh hỗ trợ người dùng tìm kiếm thông tin và định hướng nghề nghiệp:
            </p>
            <ul className={styles.list}>
              <li>
                Các câu trả lời và gợi ý của Trợ lý AI mang tính chất tham khảo, không cấu thành cam kết tuyển dụng hay tư vấn pháp lý chính thức.
              </li>
              <li>
                Người dùng không được cố ý nhập các chuỗi câu lệnh độc hại (Prompt Injection) hoặc lợi dụng AI để tạo nội dung giả mạo.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className={styles.section} aria-labelledby="section-5">
            <h2 id="section-5" className={styles.sectionTitle}>
              <span className={styles.number}>5</span>
              <span>Giới hạn trách nhiệm pháp lý</span>
            </h2>
            <p className={styles.paragraph}>
              FINDWORK đóng vai trò là nền tảng công nghệ trung gian kết nối giữa người tìm việc và doanh nghiệp.
              Mối quan hệ lao động, thỏa thuận tiền lương và hợp đồng tuyển dụng thuộc phạm vi thỏa thuận trực tiếp
              giữa hai bên theo quy định của pháp luật lao động.
            </p>
          </section>

          {/* Section 6 */}
          <section className={styles.section} aria-labelledby="section-6">
            <h2 id="section-6" className={styles.sectionTitle}>
              <span className={styles.number}>6</span>
              <span>Giải quyết thắc mắc & Đầu mối liên hệ</span>
            </h2>
            <p className={styles.paragraph}>
              Khi phát sinh tranh chấp hoặc cần phản ánh tin tuyển dụng vi phạm, người dùng vui lòng thông báo qua{" "}
              <Link to="/contact" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Kênh Liên hệ</Link>{" "}
              hoặc tham khảo các bài hướng dẫn xử lý tại{" "}
              <Link to="/help" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Trung tâm trợ giúp</Link>.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};

export default TermsOfUsePage;
