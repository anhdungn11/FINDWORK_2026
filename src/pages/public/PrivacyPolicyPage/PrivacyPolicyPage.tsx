import { Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, ShieldCheck } from "lucide-react";
import styles from "./PrivacyPolicyPage.module.css";

const PrivacyPolicyPage = () => {
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
          <span className={styles.eyebrow}>QUYỀN RIÊNG TƯ & AN TOÀN DỮ LIỆU</span>
          <h1 className={styles.title}>Chính Sách Bảo Mật Thông Tin</h1>
          <p className={styles.meta}>Phiên bản dự thảo v1.0 • Cập nhật lần cuối: Tháng 10/2026</p>
        </header>

        {/* Owner & Legal Review Disclaimer */}
        <aside className={styles.reviewNotice} role="note">
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <strong>Lưu ý xác thực (Bản dự thảo pháp lý):</strong> Tài liệu này mô tả minh bạch cách thức
            hệ thống FINDWORK thu thập, lưu trữ và bảo vệ dữ liệu kỹ thuật theo đúng hành vi chức năng thực tế của
            sản phẩm. Các cam kết pháp lý thương mại, thông tin bổ nhiệm Cán bộ phụ trách bảo vệ dữ liệu (DPO) và
            pháp nhân chính thức đang chờ chủ sở hữu và ban pháp chế phê duyệt trước khi công bố văn bản hành chính cuối cùng.
          </div>
        </aside>

        {/* Document Content Card */}
        <main className={styles.contentCard}>
          {/* Section 1 */}
          <section className={styles.section} aria-labelledby="section-1">
            <h2 id="section-1" className={styles.sectionTitle}>
              <span className={styles.number}>1</span>
              <span>Dữ liệu thực tế được thu thập</span>
            </h2>
            <p className={styles.paragraph}>
              Hệ thống FINDWORK chỉ thu thập các danh mục thông tin thiết yếu phục vụ trực tiếp cho hoạt động
              kết nối ứng viên và nhà tuyển dụng:
            </p>
            <ul className={styles.list}>
              <li>
                <strong>Thông tin tài khoản:</strong> Địa chỉ email xác thực, mật khẩu (được băm mã hóa an toàn), họ và tên, loại tài khoản (Ứng viên hoặc Doanh nghiệp).
              </li>
              <li>
                <strong>Hồ sơ ứng viên:</strong> Thông tin cá nhân tự nguyện cập nhật (số điện thoại, giới tính, ngày sinh, địa chỉ tỉnh thành), tiểu sử nghề nghiệp, quá trình làm việc, quá trình học vấn, kỹ năng, và các tài liệu CV được lưu trong CV Center.
              </li>
              <li>
                <strong>Hồ sơ doanh nghiệp:</strong> Tên công ty, ngành nghề hoạt động, website, quy mô, địa chỉ trụ sở và chi nhánh, thông tin liên hệ pháp lý (email, điện thoại đại diện).
              </li>
              <li>
                <strong>Dữ liệu ứng tuyển:</strong> Trạng thái hồ sơ nộp, câu trả lời sàng lọc ứng viên, lịch hẹn phỏng vấn và trao đổi tin nhắn giữa ứng viên và nhà tuyển dụng.
              </li>
              <li>
                <strong>Dữ liệu kỹ thuật:</strong> Địa chỉ IP kết nối, mã định danh phiên (JWT token), thời gian đăng nhập phục vụ bảo mật hệ thống và ngăn ngừa tấn công mạng.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className={styles.section} aria-labelledby="section-2">
            <h2 id="section-2" className={styles.sectionTitle}>
              <span className={styles.number}>2</span>
              <span>Mục đích và phương thức sử dụng</span>
            </h2>
            <p className={styles.paragraph}>
              Chúng tôi cam kết sử dụng thông tin thu thập được đúng mục đích chức năng của nền tảng:
            </p>
            <ul className={styles.list}>
              <li>
                <strong>Xử lý ứng tuyển:</strong> Chuyển hồ sơ ứng tuyển của bạn đến đúng nhà tuyển dụng khi bạn chủ động nhấn nộp hồ sơ.
              </li>
              <li>
                <strong>Cung cấp công cụ CV:</strong> Lưu trữ bản nháp và định dạng tài liệu CV của bạn để chỉnh sửa hoặc xuất PDF.
              </li>
              <li>
                <strong>Hỗ trợ thông minh qua AI:</strong> Trợ lý FINDWORK AI chỉ xử lý nội dung văn bản trong phiên trao đổi để gợi ý việc làm và tư vấn, không sử dụng dữ liệu mật khẩu hay thông tin nhạy cảm của bạn vào mục đích quảng cáo bên thứ ba.
              </li>
              <li>
                <strong>Bảo vệ an ninh hệ thống:</strong> Giám sát các dấu hiệu spam, đăng tin tuyển dụng giả mạo hoặc truy cập bất thường để bảo vệ cộng đồng người dùng.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className={styles.section} aria-labelledby="section-3">
            <h2 id="section-3" className={styles.sectionTitle}>
              <span className={styles.number}>3</span>
              <span>Bảo đảm an toàn và bảo mật dữ liệu</span>
            </h2>
            <p className={styles.paragraph}>
              FINDWORK triển khai các tiêu chuẩn an toàn kỹ thuật nghiêm ngặt trong kiến trúc phần mềm:
            </p>
            <div className={styles.highlightBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <ShieldCheck size={18} color="var(--color-primary)" aria-hidden="true" />
                <strong>Nguyên tắc bảo vệ an toàn (Fail-Closed Architecture):</strong>
              </div>
              Tất cả mật khẩu đăng nhập đều được băm một chiều bằng thuật toán mã hóa hiện đại trước khi lưu vào cơ sở dữ liệu.
              Mọi quyền truy cập dữ liệu doanh nghiệp và hồ sơ ứng viên đều được kiểm soát nghiêm ngặt theo phân quyền vai trò (RBAC),
              chặn hoàn toàn truy cập trái phép.
            </div>
            <p className={styles.paragraph}>
              Mã xác thực phiên (Access Token) được quản lý với thời hạn hợp lệ hạn chế. Người dùng đăng xuất sẽ lập tức vô hiệu hóa
              quyền truy cập phiên làm việc hiện tại trên thiết bị.
            </p>
          </section>

          {/* Section 4 */}
          <section className={styles.section} aria-labelledby="section-4">
            <h2 id="section-4" className={styles.sectionTitle}>
              <span className={styles.number}>4</span>
              <span>Quyền kiểm soát của người dùng</span>
            </h2>
            <p className={styles.paragraph}>
              Người dùng có toàn quyền kiểm soát dữ liệu cá nhân của mình trên hệ thống FINDWORK:
            </p>
            <ul className={styles.list}>
              <li>
                <strong>Quyền xem và cập nhật:</strong> Xem lại và chỉnh sửa thông tin hồ sơ bất kỳ lúc nào tại{" "}
                <Link to="/candidate/profile" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Quản lý hồ sơ</Link>{" "}
                hoặc <Link to="/employer/profile" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Hồ sơ doanh nghiệp</Link>.
              </li>
              <li>
                <strong>Quyền xóa tài liệu:</strong> Xóa các bản CV đã lưu trong CV Center hoặc xóa danh sách việc làm đã đánh dấu.
              </li>
              <li>
                <strong>Quyền rút lại phiên:</strong> Đăng xuất khỏi hệ thống để xóa sạch dữ liệu phiên duyệt web trên trình duyệt hiện tại.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className={styles.section} aria-labelledby="section-5">
            <h2 id="section-5" className={styles.sectionTitle}>
              <span className={styles.number}>5</span>
              <span>Đầu mối tiếp nhận yêu cầu bảo mật</span>
            </h2>
            <p className={styles.paragraph}>
              Nếu bạn có bất kỳ câu hỏi nào liên quan đến bảo mật hoặc muốn gửi yêu cầu hỗ trợ về dữ liệu cá nhân,
              vui lòng truy cập trang <Link to="/contact" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Liên hệ & Hỗ trợ</Link>{" "}
              hoặc gửi email theo hướng dẫn chính thức từ ban quản trị hệ thống.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
