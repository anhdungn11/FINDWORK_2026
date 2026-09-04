import { Link, useParams } from "react-router-dom";

import { jobs } from "@/data/mock/jobs.mock";

import styles from "./JobDetailPage.module.css";

const JobDetailPage = () => {
  const { id } = useParams();

  const job = jobs.find(
    (item) => item.id === Number(id),
  );

  if (!job) {
    return (
      <main className={styles.page}>
        <div className="container">
          <div className={styles.notFound}>
            <span className={styles.notFoundCode}>404</span>

            <h1>Không tìm thấy việc làm</h1>

            <p>
              Việc làm bạn đang tìm không tồn tại hoặc
              không còn khả dụng.
            </p>

            <Link to="/jobs">
              Quay lại danh sách việc làm
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className="container">
          <Link
            to="/jobs"
            className={styles.backLink}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>

            Việc làm
          </Link>

          <div className={styles.heroCard}>
            <div className={styles.heroMain}>
              <div className={styles.companyLogo}>
                {job.company.charAt(0)}
              </div>

              <div className={styles.heroInfo}>
                <span className={styles.category}>
                  {job.category}
                </span>

                <h1>{job.title}</h1>

                <p className={styles.company}>
                  {job.company}
                </p>

                <div className={styles.heroMeta}>
                  <span>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
                      <circle cx="12" cy="10" r="2" />
                    </svg>

                    {job.location}
                  </span>

                  <span>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>

                    {job.postedAt}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.heroActions}>
              <button
                type="button"
                className={styles.saveButton}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M6 4h12v17l-6-4-6 4V4Z" />
                </svg>

                Lưu
              </button>

              <button
                type="button"
                className={styles.applyButton}
              >
                Ứng tuyển ngay

                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m14 7 5 5-5 5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className={styles.contentSection}>
        <div className={`container ${styles.contentGrid}`}>
          <div className={styles.mainContent}>
            {/* OVERVIEW */}
            <section className={styles.card}>
              <span className={styles.sectionLabel}>
                TỔNG QUAN
              </span>

              <h2>Thông tin việc làm</h2>

              <div className={styles.overviewGrid}>
                <div className={styles.overviewItem}>
                  <div className={styles.overviewIcon}>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M4 7h16v12H4z" />
                      <path d="M8 7V5h8v2" />
                      <path d="M4 12h16" />
                    </svg>
                  </div>

                  <div>
                    <span>Hình thức</span>
                    <strong>{job.type}</strong>
                  </div>
                </div>

                <div className={styles.overviewItem}>
                  <div className={styles.overviewIcon}>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M8 12h8" />
                      <path d="M12 8v8" />
                    </svg>
                  </div>

                  <div>
                    <span>Mức lương</span>
                    <strong>{job.salary}</strong>
                  </div>
                </div>

                <div className={styles.overviewItem}>
                  <div className={styles.overviewIcon}>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M4 20V9l8-5 8 5v11" />
                      <path d="M9 20v-6h6v6" />
                    </svg>
                  </div>

                  <div>
                    <span>Nơi làm việc</span>
                    <strong>{job.workplace}</strong>
                  </div>
                </div>

                <div className={styles.overviewItem}>
                  <div className={styles.overviewIcon}>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M5 21a7 7 0 0 1 14 0" />
                    </svg>
                  </div>

                  <div>
                    <span>Kinh nghiệm</span>
                    <strong>{job.experience}</strong>
                  </div>
                </div>
              </div>
            </section>

            {/* SKILLS */}
            <section className={styles.card}>
              <span className={styles.sectionLabel}>
                KỸ NĂNG
              </span>

              <h2>Kỹ năng liên quan</h2>

              <p className={styles.sectionDescription}>
                Một số kỹ năng liên quan đến vị trí tuyển dụng này.
              </p>

              <div className={styles.skills}>
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className={styles.skill}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>

            {/* DESCRIPTION PLACEHOLDER */}
            <section className={styles.card}>
              <span className={styles.sectionLabel}>
                MÔ TẢ CÔNG VIỆC
              </span>

              <h2>Chi tiết vị trí</h2>

              <div className={styles.futureData}>
                <div className={styles.futureIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M5 3h10l4 4v14H5z" />
                    <path d="M15 3v5h5" />
                    <path d="M8 13h8M8 17h6" />
                  </svg>
                </div>

                <div>
                  <strong>
                    Nội dung chi tiết sẽ được cập nhật
                  </strong>

                  <p>
                    Mô tả công việc, yêu cầu ứng viên và
                    quyền lợi sẽ được lấy từ dữ liệu tuyển
                    dụng khi hệ thống kết nối
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className={styles.sidebar}>
            <div className={styles.matchCard}>
              <div className={styles.matchTop}>
                <span className={styles.sectionLabel}>
                  FINDWORK MATCH
                </span>

                <span className={styles.matchBadge}>
                  Gợi ý
                </span>
              </div>

              <div className={styles.matchScore}>
                <strong>{job.matchScore}%</strong>
                <span>phù hợp</span>
              </div>

              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{
                    width: `${job.matchScore}%`,
                  }}
                />
              </div>

              <p className={styles.matchDescription}>
                Điểm phù hợp hiện đang được mô phỏng từ
                dữ liệu mẫu và sẽ được tính từ hồ sơ ứng
                viên khi hệ thống hoàn thiện.
              </p>
            </div>

            <div className={styles.companyCard}>
              <span className={styles.sectionLabel}>
                NHÀ TUYỂN DỤNG
              </span>

              <div className={styles.companyHeader}>
                <div className={styles.smallLogo}>
                  {job.company.charAt(0)}
                </div>

                <div>
                  <strong>{job.company}</strong>
                  <span>{job.category}</span>
                </div>
              </div>

              <p>
                Xem thông tin doanh nghiệp và các cơ hội
                việc làm khác đang tuyển dụng.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default JobDetailPage;