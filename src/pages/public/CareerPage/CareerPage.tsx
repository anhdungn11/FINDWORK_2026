import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "@/services/api/publicApi";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAuthStore } from "@/store/authStore";
import { LoadingBlock } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import type { ApiFailure } from "@/services/api/apiFailure";
import styles from "./CareerPage.module.css";

const CATEGORY_SCOPES: Record<string, string> = {
  "software-development": "Lập trình web, mobile, backend, hệ thống và kiến trúc phần mềm.",
  "data-ai": "Kỹ thuật dữ liệu, phân tích dữ liệu, Machine Learning và Trí tuệ nhân tạo.",
  "it-support-infrastructure": "Quản trị mạng, hạ tầng đám mây (Cloud), DevOps và hỗ trợ kỹ thuật IT.",
  "cybersecurity": "Bảo mật hệ thống, an toàn thông tin mạng, kiểm thử bảo mật và ứng cứu sự cố.",
  "product-project": "Quản lý sản phẩm số, quản trị dự án công nghệ và điều phối đội ngũ phát triển.",
  "design-creative": "Thiết kế UI/UX, đồ họa thương hiệu, multimedia và sáng tạo hình ảnh.",
  "marketing": "Digital marketing, SEO/SEM, quảng cáo trực tuyến, content và truyền thông thương hiệu.",
  "sales-business-development": "Tư vấn giải pháp, phát triển thị trường doanh nghiệp và chăm sóc đối tác.",
  "customer-service": "Chăm sóc khách hàng, hỗ trợ dịch vụ và quản lý trải nghiệm người dùng.",
  "finance-banking": "Tài chính doanh nghiệp, đầu tư, tín dụng ngân hàng và quản trị rủi ro tài chính.",
  "accounting-audit": "Kế toán tổng hợp, kế toán thuế, kiểm toán nội bộ và kiểm toán tài chính.",
  "human-resources": "Tuyển dụng nhân sự, chế độ đãi ngộ (C&B), đào tạo và phát triển tổ chức.",
  "administration-operations": "Hành chính văn phòng, vận hành cơ sở và hỗ trợ điều hành doanh nghiệp.",
  "legal": "Tư vấn pháp lý doanh nghiệp, soạn thảo hợp đồng thương mại và kiểm soát tuân thủ.",
  "logistics-supply-chain": "Chuỗi cung ứng, xuất nhập khẩu hàng hóa, kho bãi và điều phối vận tải.",
  "manufacturing-engineering": "Kỹ thuật cơ khí, tự động hóa, điện tử và quản lý chất lượng sản xuất.",
  "construction-real-estate": "Kỹ thuật công trình, quản lý dự án xây dựng và phát triển bất động sản.",
  "healthcare": "Y tế, dược phẩm, thiết bị y khoa và nghiên cứu chăm sóc sức khỏe.",
  "education-training": "Giảng dạy chuyên môn, đào tạo kỹ năng và phát triển giải pháp giáo dục.",
  "hospitality-tourism": "Quản trị nhà hàng, khách sạn, dịch vụ ẩm thực (F&B) và điều hành lữ hành.",
  "media-content": "Sản xuất nội dung, biên tập đa phương tiện và quan hệ công chúng (PR).",
  "agriculture-environment": "Nông nghiệp công nghệ cao, xử lý môi trường và phát triển bền vững.",
};

const CareerPage = () => {
  const [search, setSearch] = useState("");
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  const { data, error, loading, reload } = useAsyncData(
    (signal) => publicApi.listJobCategories(signal),
    []
  );

  const categories = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (CATEGORY_SCOPES[c.code] && CATEGORY_SCOPES[c.code].toLowerCase().includes(q))
    );
  }, [categories, search]);

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.hero}>
          <span className={styles.eyebrow}>ĐỊNH HƯỚNG NGHỀ NGHIỆP</span>
          <h1 className={styles.title}>Khám phá các lĩnh vực nghề nghiệp</h1>
          <p className={styles.description}>
            Tìm hiểu các nhóm ngành nghề chuyên môn chuẩn hóa trên FINDWORK và khám phá những cơ hội việc làm phù hợp với định hướng của bạn.
          </p>

          <div className={styles.searchBar}>
            <svg
              className={styles.searchIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm kiếm theo tên ngành nghề hoặc lĩnh vực..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm kiếm ngành nghề"
            />
          </div>
        </header>

        {authStatus === "authenticated" && user && (
          <aside className={styles.candidateBanner} aria-label="Định hướng nghề nghiệp cá nhân">
            <div className={styles.bannerText}>
              <h3>Thiết lập nguyện vọng nghề nghiệp</h3>
              <p>Cập nhật cấp bậc mong muốn, mức lương kỳ vọng và hình thức làm việc trong hồ sơ ứng viên của bạn.</p>
            </div>
            <Link to="/candidate/profile" className={styles.bannerAction}>
              Cập nhật hồ sơ →
            </Link>
          </aside>
        )}

        <section className={styles.categoriesSection} aria-label="Danh mục ngành nghề">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              {search.trim() ? "Kết quả tìm kiếm" : "Tất cả lĩnh vực nghề nghiệp"}
            </h2>
            <span className={styles.categoryCount}>
              {filtered.length} nhóm ngành
            </span>
          </div>

          {loading ? (
            <LoadingBlock rows={4} label="Đang nạp danh mục ngành nghề..." />
          ) : error ? (
            <ApiErrorState error={error as ApiFailure} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <h3 className={styles.emptyStateTitle}>Không tìm thấy ngành nghề phù hợp</h3>
              <p className={styles.emptyStateText}>
                Không có ngành nghề nào khớp với từ khóa &ldquo;{search}&rdquo;. Bạn có thể thử tìm kiếm bằng từ khóa khác.
              </p>
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearch("")}
              >
                Xóa bộ lọc tìm kiếm
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map((category) => {
                const scope = CATEGORY_SCOPES[category.code] || "Các vị trí chuyên môn thuộc lĩnh vực " + category.name;
                return (
                  <article key={category.id || category.code} className={styles.card}>
                    <div className={styles.cardTop}>
                      <span className={styles.badge}>{category.code}</span>
                    </div>
                    <h3 className={styles.cardName}>{category.name}</h3>
                    <p className={styles.cardHint}>{scope}</p>
                    <div className={styles.cardFooter}>
                      <Link
                        to={`/jobs?categoryCode=${encodeURIComponent(category.code)}`}
                        className={styles.viewJobsLink}
                      >
                        Khám phá việc làm →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CareerPage;
