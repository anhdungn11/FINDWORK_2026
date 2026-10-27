import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
} from "lucide-react";
import styles from "./ContactPage.module.css";

const ContactPage = () => {
  // Read verified configuration from environment
  const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || "";
  const supportHotline = (import.meta.env.VITE_SUPPORT_HOTLINE as string | undefined)?.trim() || "";
  const supportHours =
    (import.meta.env.VITE_SUPPORT_HOURS as string | undefined)?.trim() ||
    "Thứ Hai - Thứ Sáu: 08:30 - 17:30";

  const hasVerifiedEmail = Boolean(supportEmail);
  const hasVerifiedHotline = Boolean(supportHotline);

  const handleOpenAi = () => {
    window.dispatchEvent(new CustomEvent("open-findwork-ai"));
  };

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
          <span className={styles.eyebrow}>LIÊN HỆ & HỖ TRỢ</span>
          <h1 className={styles.title}>Trung Tâm Hỗ Trợ Người Dùng</h1>
          <p className={styles.description}>
            FINDWORK cung cấp các kênh giải đáp trực tuyến tức thì và tiếp nhận thông tin hỗ trợ minh bạch.
          </p>
        </header>

        {/* Channel Grid */}
        <div className={styles.grid}>
          {/* Channel 1: AI Assistant (Instant 24/7) */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <Sparkles size={22} aria-hidden="true" />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Trợ lý FINDWORK AI</h2>
                <p className={styles.cardSubtitle}>Hỗ trợ trực tuyến 24/7</p>
              </div>
              <span className={styles.verifiedBadge}>
                <CheckCircle2 size={13} aria-hidden="true" />
                <span>Hoạt động</span>
              </span>
            </div>
            <div className={styles.cardBody}>
              <p>
                Trợ lý thông minh sẵn sàng giải đáp thắc mắc về cách sử dụng hệ thống, quy trình tạo CV,
                tìm việc làm, và quản trị tin tuyển dụng bất kỳ lúc nào mà không cần chờ đợi.
              </p>
              <div className={styles.contactValue}>Trò chuyện trực tiếp trên màn hình</div>
              <div className={styles.contactSubtext}>Nhấn nút bên dưới để mở khung trò chuyện ngay</div>
            </div>
            <div className={styles.cardFooter}>
              <button
                type="button"
                className={styles.aiActionBtn}
                onClick={handleOpenAi}
              >
                <Sparkles size={16} aria-hidden="true" />
                <span>Mở Trợ lý AI ngay</span>
              </button>
            </div>
          </article>

          {/* Channel 2: Help Center (Self-Service) */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <HelpCircle size={22} aria-hidden="true" />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Trung tâm Trợ giúp</h2>
                <p className={styles.cardSubtitle}>Tra cứu hướng dẫn chi tiết</p>
              </div>
              <span className={styles.verifiedBadge}>
                <CheckCircle2 size={13} aria-hidden="true" />
                <span>Sẵn sàng</span>
              </span>
            </div>
            <div className={styles.cardBody}>
              <p>
                Tổng hợp đầy đủ hướng dẫn từng bước dành cho cả ứng viên và nhà tuyển dụng, bao gồm quản trị
                hồ sơ, xác thực email, phục hồi mật khẩu và phân quyền thành viên công ty.
              </p>
              <div className={styles.contactValue}>Hướng dẫn & Câu hỏi thường gặp</div>
              <div className={styles.contactSubtext}>Tra cứu nhanh chóng theo từ khóa</div>
            </div>
            <div className={styles.cardFooter}>
              <Link to="/help" className={styles.outlineActionBtn}>
                <HelpCircle size={16} aria-hidden="true" />
                <span>Xem Trung tâm Trợ giúp</span>
              </Link>
            </div>
          </article>

          {/* Channel 3: Email Support */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <Mail size={22} aria-hidden="true" />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Hộp thư Hỗ trợ</h2>
                <p className={styles.cardSubtitle}>Tiếp nhận yêu cầu bằng văn bản</p>
              </div>
              {hasVerifiedEmail ? (
                <span className={styles.verifiedBadge}>
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>Đã xác thực</span>
                </span>
              ) : (
                <span className={styles.pendingBadge}>
                  <AlertCircle size={13} aria-hidden="true" />
                  <span>Chờ cấu hình</span>
                </span>
              )}
            </div>
            <div className={styles.cardBody}>
              {hasVerifiedEmail ? (
                <>
                  <p>Gửi thư yêu cầu hỗ trợ tài khoản hoặc phản ánh sự cố kỹ thuật:</p>
                  <div className={styles.contactValue}>{supportEmail}</div>
                  <div className={styles.contactSubtext}>Thời gian phản hồi dự kiến: 24h làm việc</div>
                </>
              ) : (
                <>
                  <p>
                    Địa chỉ email hỗ trợ chính thức đang chờ ban điều hành hệ thống cấu hình và công bố trên
                    môi trường triển khai này.
                  </p>
                  <div className={styles.contactValue}>Chưa cấu hình VITE_SUPPORT_EMAIL</div>
                  <div className={styles.contactSubtext}>
                    FINDWORK không hiển thị hộp thư giả lập nhằm đảm bảo độ tin cậy.
                  </div>
                </>
              )}
            </div>
            <div className={styles.cardFooter}>
              {hasVerifiedEmail ? (
                <a href={`mailto:${supportEmail}`} className={styles.primaryActionBtn}>
                  <Mail size={16} aria-hidden="true" />
                  <span>Gửi thư hỗ trợ</span>
                </a>
              ) : (
                <Link to="/help" className={styles.outlineActionBtn}>
                  <span>Xem hướng dẫn thay thế</span>
                </Link>
              )}
            </div>
          </article>

          {/* Channel 4: Phone / Hotline */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <Phone size={22} aria-hidden="true" />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Tổng đài Hotline</h2>
                <p className={styles.cardSubtitle}>Hỗ trợ thoại trực tiếp</p>
              </div>
              {hasVerifiedHotline ? (
                <span className={styles.verifiedBadge}>
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>Đã xác thực</span>
                </span>
              ) : (
                <span className={styles.pendingBadge}>
                  <AlertCircle size={13} aria-hidden="true" />
                  <span>Chờ xác thực viễn thông</span>
                </span>
              )}
            </div>
            <div className={styles.cardBody}>
              {hasVerifiedHotline ? (
                <>
                  <p>Liên hệ trực tiếp đội ngũ chăm sóc khách hàng trong giờ làm việc:</p>
                  <div className={styles.contactValue}>{supportHotline}</div>
                  <div className={styles.contactSubtext}>
                    <Clock size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    {supportHours}
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Đường dây nóng chính thức đang trong quá trình nghiệm thu viễn thông với nhà mạng.
                    Hệ thống không cung cấp số hotline giả mạo để tránh hiểu lầm cho người dùng.
                  </p>
                  <div className={styles.contactValue}>Chưa cấu hình VITE_SUPPORT_HOTLINE</div>
                  <div className={styles.contactSubtext}>
                    Vui lòng sử dụng Trợ lý AI hoặc Trung tâm Trợ giúp trong thời gian này.
                  </div>
                </>
              )}
            </div>
            <div className={styles.cardFooter}>
              {hasVerifiedHotline ? (
                <a href={`tel:${supportHotline.replace(/\s+/g, "")}`} className={styles.primaryActionBtn}>
                  <Phone size={16} aria-hidden="true" />
                  <span>Gọi tổng đài</span>
                </a>
              ) : (
                <button
                  type="button"
                  className={styles.outlineActionBtn}
                  onClick={handleOpenAi}
                >
                  <Sparkles size={16} aria-hidden="true" />
                  <span>Nhận trợ giúp từ AI</span>
                </button>
              )}
            </div>
          </article>
        </div>

        {/* Honest Disclosure & Deployment Notice */}
        <section className={styles.honestNoticeSection} aria-labelledby="deployment-notice-title">
          <div className={styles.noticeHeader}>
            <Terminal size={20} color="var(--color-primary)" aria-hidden="true" />
            <h3 id="deployment-notice-title">Nguyên tắc Minh bạch & Hướng dẫn Cấu hình Hệ thống</h3>
          </div>
          <p className={styles.noticeText}>
            FINDWORK cam kết trung thực về các kênh liên lạc. Chúng tôi từ chối tạo lập biểu mẫu gửi vé giả
            khi chưa có API máy chủ tương ứng hoặc xuất bản các số điện thoại chưa được xác thực.
            Quản trị viên triển khai có thể thiết lập các biến môi trường sau để kích hoạt thông tin chính thức:
          </p>
          <div className={styles.configBox}>
            <span className={styles.configComment}># Cấu hình kênh liên hệ chính thức FINDWORK (.env)</span>
            <br />
            <span className={styles.configKey}>VITE_SUPPORT_EMAIL</span>=
            <span className={styles.configValue}>{supportEmail || "support@findwork.vn"}</span>
            <br />
            <span className={styles.configKey}>VITE_SUPPORT_HOTLINE</span>=
            <span className={styles.configValue}>{supportHotline || "1900 xxxx (khi hoàn tất hợp đồng viễn thông)"}</span>
            <br />
            <span className={styles.configKey}>VITE_SUPPORT_HOURS</span>=
            <span className={styles.configValue}>{`"${supportHours}"`}</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ContactPage;
