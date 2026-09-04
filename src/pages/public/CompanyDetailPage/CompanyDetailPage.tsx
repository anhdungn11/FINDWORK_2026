import { Link, useParams } from "react-router-dom";

import { companies } from "@/data/mock/companies.mock";

import styles from "./CompanyDetailPage.module.css";

const CompanyDetailPage = () => {
  const { id } = useParams();

  const company = companies.find(
    (item) => item.id === Number(id),
  );

  if (!company) {
    return (
      <main className={styles.page}>
        <div className="container">
          <div className={styles.notFound}>
            <h1>Không tìm thấy công ty</h1>

            <p>
              Công ty bạn đang tìm không tồn tại hoặc đã bị xóa.
            </p>

            <Link to="/companies">
              Quay lại danh sách công ty
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.cover}>
            <img
              src={company.cover}
              alt={`${company.name} cover`}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>

          <div className={styles.companyHeader}>
            <div className={styles.logo}>
              <img
                src={company.logo}
                alt={company.name}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />

              <span>
                {company.name.charAt(0)}
              </span>
            </div>

            <div className={styles.companyInfo}>
              <span className={styles.eyebrow}>
                COMPANY PROFILE
              </span>

              <h1>{company.name}</h1>

              <div className={styles.meta}>
                <span>{company.industry}</span>
                <span className={styles.dot} />
                <span>{company.location}</span>
              </div>
            </div>

            <div className={styles.jobsBadge}>
              <strong>{company.jobsCount}</strong>
              <span>việc làm đang tuyển</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className={`container ${styles.contentGrid}`}>
          <div className={styles.mainContent}>
            <section className={styles.sectionCard}>
              <span className={styles.sectionLabel}>
                GIỚI THIỆU
              </span>

              <h2>Về {company.name}</h2>

              <p className={styles.description}>
                {company.description}
              </p>
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.sectionLabel}>
                    CƠ HỘI NGHỀ NGHIỆP
                  </span>

                  <h2>Việc làm đang tuyển</h2>
                </div>

                <span className={styles.jobCount}>
                  {company.jobsCount} vị trí
                </span>
              </div>

              <div className={styles.emptyJobs}>
                <div className={styles.emptyJobsIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <rect
                      x="3"
                      y="7"
                      width="18"
                      height="13"
                      rx="2"
                    />

                    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M3 12h18" />
                  </svg>
                </div>

                <h3>
                  Danh sách việc làm sẽ được hiển thị ở đây
                </h3>

                <p>
                  Hiện tại dữ liệu công ty và dữ liệu việc làm
                  chưa được liên kết với nhau trong mock data.
                </p>
              </div>
            </section>
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.infoCard}>
              <span className={styles.sectionLabel}>
                THÔNG TIN CÔNG TY
              </span>

              <div className={styles.infoList}>
                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M3 21h18" />
                      <path d="M5 21V7l7-4 7 4v14" />
                      <path d="M9 21v-5h6v5" />
                    </svg>
                  </span>

                  <div>
                    <span>Quy mô</span>
                    <strong>{company.size}</strong>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="16"
                        rx="2"
                      />

                      <path d="M16 3v4M8 3v4M3 10h18" />
                    </svg>
                  </span>

                  <div>
                    <span>Thành lập</span>
                    <strong>{company.foundedYear}</strong>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
                      <circle
                        cx="12"
                        cy="10"
                        r="2"
                      />
                    </svg>
                  </span>

                  <div>
                    <span>Địa điểm</span>
                    <strong>{company.location}</strong>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                      />

                      <path d="M3 12h18" />
                      <path d="M12 3a15 15 0 0 1 0 18" />
                      <path d="M12 3a15 15 0 0 0 0 18" />
                    </svg>
                  </span>

                  <div>
                    <span>Website</span>

                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Truy cập website
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/companies"
              className={styles.backLink}
            >
              ← Quay lại danh sách công ty
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default CompanyDetailPage;