import { useMemo, useState } from "react";

import CompanyCard from "@/features/companies/components/CompanyCard/CompanyCard";
import { companies } from "@/data/mock/companies.mock";

import styles from "./CompaniesPage.module.css";

const CompaniesPage = () => {
  const [keyword, setKeyword] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");

  const industryOptions = useMemo(() => {
    return Array.from(
      new Set(companies.map((company) => company.industry)),
    ).sort();
  }, []);

  const locationOptions = useMemo(() => {
    return Array.from(
      new Set(companies.map((company) => company.location)),
    ).sort();
  }, []);

  const filteredCompanies = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesKeyword =
        !normalizedKeyword ||
        company.name.toLowerCase().includes(normalizedKeyword) ||
        company.industry.toLowerCase().includes(normalizedKeyword);

      const matchesIndustry =
        !industry || company.industry === industry;

      const matchesLocation =
        !location || company.location === location;

      return (
        matchesKeyword &&
        matchesIndustry &&
        matchesLocation
      );
    });
  }, [keyword, industry, location]);

  const hasFilters =
    keyword.trim() !== "" ||
    industry !== "" ||
    location !== "";

  const clearFilters = () => {
    setKeyword("");
    setIndustry("");
    setLocation("");
  };

  return (
    <main className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroContent}`}>
          <span className={styles.eyebrow}>
            FINDWORK COMPANIES
          </span>

          <h1 className={styles.title}>
            Khám phá nơi bạn muốn làm việc
          </h1>

          <p className={styles.description}>
            Tìm hiểu doanh nghiệp, lĩnh vực hoạt động
            và những cơ hội việc làm đang mở.
          </p>

          <div className={styles.searchPanel}>
            <div className={styles.searchField}>
              <span className={styles.searchIcon}>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />

                  <path d="m16.5 16.5 4 4" />
                </svg>
              </span>

              <input
                type="text"
                value={keyword}
                placeholder="Tên công ty hoặc lĩnh vực..."
                onChange={(event) =>
                  setKeyword(event.target.value)
                }
              />
            </div>

            <div className={styles.divider} />

            <div className={styles.selectField}>
              <span className={styles.selectLabel}>
                Ngành nghề
              </span>

              <select
                value={industry}
                onChange={(event) =>
                  setIndustry(event.target.value)
                }
              >
                <option value="">
                  Tất cả ngành nghề
                </option>

                {industryOptions.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.divider} />

            <div className={styles.selectField}>
              <span className={styles.selectLabel}>
                Khu vực
              </span>

              <select
                value={location}
                onChange={(event) =>
                  setLocation(event.target.value)
                }
              >
                <option value="">
                  Tất cả khu vực
                </option>

                {locationOptions.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.heroMeta}>
            <span>
              {companies.length} doanh nghiệp
            </span>

            <span className={styles.metaDot} />

            <span>
              {companies.reduce(
                (total, company) =>
                  total + company.jobsCount,
                0,
              )}{" "}
              cơ hội việc làm
            </span>
          </div>
        </div>
      </section>

      {/* COMPANIES */}
      <section className={styles.resultsSection}>
        <div className="container">
          <div className={styles.resultsHeader}>
            <div>
              <span className={styles.sectionEyebrow}>
                DOANH NGHIỆP
              </span>

              <h2>
                Công ty đang tuyển dụng
              </h2>

              <p>
                Hiển thị {filteredCompanies.length} trên{" "}
                {companies.length} doanh nghiệp
              </p>
            </div>

            {hasFilters && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={clearFilters}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {filteredCompanies.length > 0 ? (
            <div className={styles.companyGrid}>
              {filteredCompanies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M4 20V8l8-4 8 4v12" />
                  <path d="M9 20v-5h6v5" />
                  <path d="M8 10h.01M12 10h.01M16 10h.01" />
                </svg>
              </div>

              <h3>
                Không tìm thấy doanh nghiệp phù hợp
              </h3>

              <p>
                Thử thay đổi từ khóa, ngành nghề hoặc
                khu vực tìm kiếm.
              </p>

              <button
                type="button"
                onClick={clearFilters}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default CompaniesPage;