import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "@/services/api/publicApi";
import type { PublicCompanyDto } from "@/services/api/apiTypes";
import CompanyCard from "@/features/companies/components/CompanyCard/CompanyCard";
import { LoadingBlock, EmptyState } from "@/components/ui";

import styles from "./FeaturedCompanies.module.css";

const FeaturedCompanies = () => {
  const [companiesList, setCompaniesList] = useState<PublicCompanyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(() => {
    setLoading(true);
    setError(null);
    publicApi
      .listFeaturedCompanies({ page: 1, pageSize: 12 })
      .then((paged) => {
        setCompaniesList(paged.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Không thể kết nối đến máy chủ danh sách doanh nghiệp.");
        setCompaniesList([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.heading} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h2 className={styles.title}>
              Công ty nổi bật
            </h2>

            <p className={styles.description}>
              Khám phá những doanh nghiệp đang tuyển dụng tích cực.
            </p>
          </div>
          <Link to="/companies" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600, fontSize: "0.9375rem" }}>
            Xem tất cả công ty →
          </Link>
        </div>

        {loading ? (
          <LoadingBlock rows={3} label="Đang nạp doanh nghiệp nổi bật..." />
        ) : error ? (
          <div style={{ padding: "36px 20px", textAlign: "center", background: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border)" }}>
            <p style={{ margin: "0 0 12px", color: "var(--color-danger, #ef4444)", fontWeight: 600 }}>
              {error}
            </p>
            <button
              type="button"
              style={{ padding: "8px 18px", borderRadius: "8px", cursor: "pointer", border: "1px solid var(--color-border)", background: "var(--color-surface)", fontWeight: 600, color: "var(--color-text-primary)" }}
              onClick={fetchCompanies}
            >
              Thử lại
            </button>
          </div>
        ) : companiesList.length === 0 ? (
          <EmptyState
            title="Chưa có công ty nổi bật"
            text="Hệ thống đang cập nhật các doanh nghiệp tuyển dụng. Vui lòng quay lại sau."
            actionLabel="Khám phá trang doanh nghiệp"
            actionTo="/companies"
          />
        ) : (
          <div className={styles.grid}>
            {companiesList.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedCompanies;
