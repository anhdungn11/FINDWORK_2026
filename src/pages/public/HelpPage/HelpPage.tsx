import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  User,
  Building2,
  Shield,
  Sparkles,
  ChevronDown,
  Mail,
  X,
} from "lucide-react";
import styles from "./HelpPage.module.css";

type FaqCategory = "all" | "candidate" | "employer" | "account" | "ai";

interface FaqItem {
  id: string;
  category: "candidate" | "employer" | "account" | "ai";
  question: string;
  categoryLabel: string;
  answer: React.ReactNode;
}

const FAQ_DATA: FaqItem[] = [
  {
    id: "candidate-cv",
    category: "candidate",
    categoryLabel: "Ứng viên",
    question: "Làm thế nào để tạo CV chuyên nghiệp trên FINDWORK?",
    answer: (
      <>
        <p>
          FINDWORK cung cấp trung tâm <strong>CV Center</strong> tích hợp hoàn toàn miễn phí. Sau khi đăng nhập tài
          khoản ứng viên, bạn hãy truy cập mục <strong>CV Center</strong> trên thanh điều hướng hoặc vào{" "}
          <Link to="/cv">Quản lý CV</Link>.
        </p>
        <p>
          Tại đây, bạn có thể chọn mẫu CV chuẩn hóa, điền thông tin cá nhân, kinh nghiệm làm việc, học vấn và các kỹ
          năng nổi bật. Bản nháp được tự động lưu và bạn có thể xuất CV ra định dạng PDF bất kỳ lúc nào.
        </p>
      </>
    ),
  },
  {
    id: "candidate-apply",
    category: "candidate",
    categoryLabel: "Ứng viên",
    question: "Quy trình ứng tuyển và theo dõi tiến độ hồ sơ như thế nào?",
    answer: (
      <>
        <p>
          Bạn có thể duyệt hàng trăm việc làm đang mở tại trang <Link to="/jobs">Tìm việc làm</Link>. Khi tìm thấy
          vị trí phù hợp, bấm <strong>Ứng tuyển ngay</strong> để chọn CV đã tạo hoặc tải lên CV mới cùng thư giới thiệu.
        </p>
        <p>
          Sau khi nộp, bạn có thể kiểm tra trạng thái phê duyệt (Đã nộp, Chờ đánh giá, Phỏng vấn, v.v.) trong trang{" "}
          <Link to="/candidate/applications">Ứng tuyển của tôi</Link>.
        </p>
      </>
    ),
  },
  {
    id: "candidate-save",
    category: "candidate",
    categoryLabel: "Ứng viên",
    question: "Làm sao để lưu các công việc tiềm năng để xem lại sau?",
    answer: (
      <>
        <p>
          Trên danh sách hoặc trang chi tiết của mỗi tin tuyển dụng, bạn chỉ cần bấm vào biểu tượng <strong>Lưu việc</strong>.
        </p>
        <p>
          Tất cả công việc đã lưu được đồng bộ với tài khoản của bạn tại mục{" "}
          <Link to="/candidate/saved-jobs">Việc làm đã lưu</Link>, giúp bạn dễ dàng so sánh và ứng tuyển khi sẵn sàng.
        </p>
      </>
    ),
  },
  {
    id: "employer-register",
    category: "employer",
    categoryLabel: "Doanh nghiệp",
    question: "Làm thế nào để đăng ký tài khoản Nhà tuyển dụng?",
    answer: (
      <>
        <p>
          Để đăng tin và tìm kiếm nhân sự, đại diện doanh nghiệp truy cập trang{" "}
          <Link to="/employer/register">Đăng ký doanh nghiệp</Link>. Bạn chỉ cần cung cấp email công việc, thông tin tổ
          chức và hoàn tất các bước thiết lập ban đầu (Onboarding).
        </p>
        <p>
          Sau khi hoàn tất, bạn sẽ được chuyển thẳng vào không gian quản trị tuyển dụng{" "}
          <Link to="/employer">Employer Workspace</Link>.
        </p>
      </>
    ),
  },
  {
    id: "employer-roles",
    category: "employer",
    categoryLabel: "Doanh nghiệp",
    question: "Các cấp bậc vai trò (Role) trong công ty được quy định như thế nào?",
    answer: (
      <>
        <p>Hệ thống FINDWORK thiết lập cấu trúc phân quyền rõ ràng bảo vệ tính bảo mật thông tin nội bộ:</p>
        <ul>
          <li><strong>Owner (Chủ sở hữu):</strong> Toàn quyền quản trị tổ chức, chuyển nhượng quyền sở hữu và giải thể công ty.</li>
          <li><strong>Admin (Quản trị viên):</strong> Quản lý danh sách thành viên, cập nhật hồ sơ pháp lý và địa điểm làm việc.</li>
          <li><strong>Recruiter (Tuyển dụng):</strong> Đăng tin, cập nhật vòng đời tin tuyển dụng, xem ứng viên và đặt lịch phỏng vấn.</li>
          <li><strong>Viewer (Chỉ xem):</strong> Xem báo cáo và danh sách tin mà không có quyền thay đổi dữ liệu tuyển dụng.</li>
        </ul>
      </>
    ),
  },
  {
    id: "employer-jobs",
    category: "employer",
    categoryLabel: "Doanh nghiệp",
    question: "Cách tạo mới và quản lý vòng đời tin tuyển dụng?",
    answer: (
      <>
        <p>
          Trong trang <Link to="/employer/jobs">Quản lý tin tuyển dụng</Link>, bấm nút <strong>Đăng tin mới</strong>.
          Bạn có thể cấu hình chi tiết tiêu đề, mô tả công việc, mức lương, địa điểm và câu hỏi sàng lọc ứng viên.
        </p>
        <p>
          Tin tuyển dụng hỗ trợ chuyển đổi trạng thái linh hoạt: <em>Bản nháp (Draft)</em>, <em>Đang mở (Active)</em>,{" "}
          <em>Tạm dừng (Paused)</em> và <em>Đã đóng (Closed)</em>.
        </p>
      </>
    ),
  },
  {
    id: "account-password",
    category: "account",
    categoryLabel: "Tài khoản",
    question: "Tôi phải làm gì nếu quên mật khẩu đăng nhập?",
    answer: (
      <>
        <p>
          Bạn chỉ cần truy cập trang <Link to="/forgot-password">Quên mật khẩu</Link>, nhập địa chỉ email đã đăng ký tài
          khoản FINDWORK.
        </p>
        <p>
          Hệ thống sẽ gửi mã hoặc liên kết khôi phục an toàn đến hộp thư của bạn. Bạn bấm vào liên kết để thiết lập mật khẩu
          mới và đăng nhập lại ngay lập tức.
        </p>
      </>
    ),
  },
  {
    id: "account-verify",
    category: "account",
    categoryLabel: "Tài khoản",
    question: "Tại sao tôi cần xác thực email tài khoản?",
    answer: (
      <>
        <p>
          Xác thực email là bước bảo mật bắt buộc nhằm đảm bảo bạn là chủ sở hữu hợp pháp của hộp thư, đồng thời ngăn chặn
          tài khoản rác và bảo vệ hồ sơ ứng tuyển cá nhân khỏi bị mạo danh.
        </p>
        <p>
          Nếu chưa nhận được email xác thực, bạn có thể yêu cầu gửi lại tại trang{" "}
          <Link to="/verify-email">Xác thực tài khoản</Link>.
        </p>
      </>
    ),
  },
  {
    id: "ai-support",
    category: "ai",
    categoryLabel: "FINDWORK AI",
    question: "Trợ lý Trí tuệ Nhân tạo FINDWORK AI hỗ trợ những gì?",
    answer: (
      <>
        <p>
          FINDWORK AI là công cụ đồng hành thông minh được tích hợp trực tiếp trên nền tảng. Trợ lý có thể:
        </p>
        <ul>
          <li>Gợi ý lộ trình phát triển kỹ năng phù hợp với mục tiêu nghề nghiệp.</li>
          <li>Đề xuất các việc làm tương thích với năng lực và nguyện vọng của bạn.</li>
          <li>Hướng dẫn chi tiết từng bước sử dụng các tính năng trên website FINDWORK.</li>
        </ul>
        <p>
          Bạn có thể mở trợ lý bất kỳ lúc nào bằng cách nhấp vào biểu tượng AI nổi ở góc dưới bên phải màn hình.
        </p>
      </>
    ),
  },
];

const HelpPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = useMemo(() => {
    let list = FAQ_DATA;
    if (selectedCategory !== "all") {
      list = list.filter((item) => item.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.categoryLabel.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

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
          <span className={styles.eyebrow}>TRỢ GIÚP & HỖ TRỢ</span>
          <h1 className={styles.title}>Trung tâm Trợ giúp FINDWORK</h1>
          <p className={styles.description}>
            Tìm kiếm câu trả lời nhanh cho các câu hỏi thường gặp hoặc nhận trợ giúp từ Trợ lý AI và đội ngũ hỗ trợ.
          </p>

          {/* Search Box */}
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} size={18} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Tìm kiếm câu hỏi, tính năng (ví dụ: tạo CV, ứng tuyển, đăng tin...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm trợ giúp"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                }}
                aria-label="Xóa tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Category Filter Pills */}
        <div className={styles.categoriesNav} role="tablist" aria-label="Danh mục trợ giúp">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === "all"}
            className={`${styles.categoryBtn} ${selectedCategory === "all" ? styles.categoryBtnActive : ""}`}
            onClick={() => setSelectedCategory("all")}
          >
            Tất cả chủ đề
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === "candidate"}
            className={`${styles.categoryBtn} ${selectedCategory === "candidate" ? styles.categoryBtnActive : ""}`}
            onClick={() => setSelectedCategory("candidate")}
          >
            <User size={15} aria-hidden="true" />
            <span>Ứng viên</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === "employer"}
            className={`${styles.categoryBtn} ${selectedCategory === "employer" ? styles.categoryBtnActive : ""}`}
            onClick={() => setSelectedCategory("employer")}
          >
            <Building2 size={15} aria-hidden="true" />
            <span>Nhà tuyển dụng</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === "account"}
            className={`${styles.categoryBtn} ${selectedCategory === "account" ? styles.categoryBtnActive : ""}`}
            onClick={() => setSelectedCategory("account")}
          >
            <Shield size={15} aria-hidden="true" />
            <span>Tài khoản & Bảo mật</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === "ai"}
            className={`${styles.categoryBtn} ${selectedCategory === "ai" ? styles.categoryBtnActive : ""}`}
            onClick={() => setSelectedCategory("ai")}
          >
            <Sparkles size={15} aria-hidden="true" />
            <span>FINDWORK AI</span>
          </button>
        </div>

        {/* FAQ List */}
        <section aria-labelledby="faq-section-title">
          <h2 id="faq-section-title" className="visually-hidden">Danh sách câu hỏi thường gặp</h2>
          {filteredFaqs.length > 0 ? (
            <div className={styles.faqList}>
              {filteredFaqs.map((faq) => (
                <details key={faq.id} className={styles.faqItem}>
                  <summary className={styles.faqSummary}>
                    <span style={{ display: "flex", alignItems: "center" }}>
                      <span>{faq.question}</span>
                      <span className={styles.faqBadge}>{faq.categoryLabel}</span>
                    </span>
                    <ChevronDown size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                  </summary>
                  <div className={styles.faqContent}>{faq.answer}</div>
                </details>
              ))}
            </div>
          ) : (
            <div className={styles.emptyResult}>
              <h3>Không tìm thấy câu hỏi phù hợp</h3>
              <p>Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc danh mục.</p>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
              >
                Đặt lại tìm kiếm
              </button>
            </div>
          )}
        </section>

        {/* Contact & AI Banner */}
        <section className={styles.contactBanner} aria-label="Kênh hỗ trợ bổ sung">
          <div className={styles.contactInfo}>
            <h3>Vẫn cần sự trợ giúp thêm?</h3>
            <p>
              Đặt câu hỏi cho Trợ lý AI FINDWORK hoặc tham khảo kênh liên hệ chính thức của chúng tôi.
            </p>
          </div>
          <div className={styles.contactActions}>
            <button
              type="button"
              className={styles.aiActionBtn}
              onClick={handleOpenAi}
            >
              <Sparkles size={16} aria-hidden="true" />
              <span>Hỏi Trợ lý AI ngay</span>
            </button>
            <Link to="/contact" className={styles.contactLinkBtn}>
              <Mail size={16} aria-hidden="true" />
              <span>Thông tin liên hệ</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HelpPage;
