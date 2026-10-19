import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "@/services/api/publicApi";
import type { PublicCompanyDto } from "@/services/api/apiTypes";
import CompanyCard from "@/features/companies/components/CompanyCard/CompanyCard";
import { LoadingBlock, EmptyState } from "@/components/ui";

import styles from "./FeaturedCompanies.module.css";

const FeaturedCompanies = () => {
  const [companiesList, setCompaniesList] = useState<PublicCompanyDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    publicApi
      .listCompanies({ page: 1, pageSize: 6 })
      .then((paged) => {
        if (!active) return;
        setCompaniesList(paged.data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setCompaniesList([]);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

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