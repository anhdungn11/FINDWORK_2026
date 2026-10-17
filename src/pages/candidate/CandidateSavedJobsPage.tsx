import { Link } from "react-router-dom";
import { Bookmark, ArrowRight, Trash2, MapPin, DollarSign, Briefcase, Info } from "lucide-react";
import { useSavedJobs } from "@/features/candidate/savedJobs/useSavedJobs";
import { PageHeader, Badge } from "@/components/ui";
import styles from "./CandidateSavedJobsPage.module.css";

const CandidateSavedJobsPage = () => {
  const { savedJobs, unsaveJob, savedCount } = useSavedJobs();

  return (
    <div className={styles.container}>
      <PageHeader
        title="Việc làm đã lưu"
        subtitle={`Bạn đang theo dõi ${savedCount} vị trí tuyển dụng`}
        actions={
          <Link to="/jobs" className={styles.exploreLink}>
            Khám phá thêm việc làm <ArrowRight size={15} aria-hidden="true" />
          </Link>
        }
      />

      <aside className={styles.disclosureBanner} role="note">
        <Info size={16} aria-hidden="true" className={styles.infoIcon} />
        <div>
          <strong>Lưu trữ tài khoản cục bộ:</strong> Danh sách việc làm đã lưu được bảo toàn theo tài khoản của bạn trên trình duyệt này. Tính năng đồng bộ lưu việc làm lên máy chủ (Server Bookmark API) sẽ được kích hoạt ngay khi backend hoàn tất endpoint tương ứng.
        </div>
      </aside>

      {savedJobs.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconCircle}>
            <Bookmark size={32} aria-hidden="true" />
          </div>
          <h2 className={styles.emptyTitle}>Chưa có việc làm nào được lưu</h2>
          <p className={styles.emptyText}>
            Khi tìm thấy các vị trí tuyển dụng tiềm năng trên sàn FINDWORK, hãy nhấn nút lưu để dễ dàng theo dõi và ứng tuyển sau.
          </p>
          <Link to="/jobs" className={styles.emptyButton}>
            Tìm việc làm ngay <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className={styles.jobList}>
          {savedJobs.map((item) => (
            <article key={item.id} className={styles.jobCard}>
              <div className={styles.jobHeader}>
                <div className={styles.jobTitleArea}>
                  <div className={styles.titleRow}>
                    <h2 className={styles.jobTitle}>
                      <Link to={`/jobs/${item.id}`}>{item.title}</Link>
                    </h2>
                    {item.isMock && (
                      <Badge tone="warning">Bản tin mẫu</Badge>
                    )}
                  </div>
                  <p className={styles.companyName}>{item.company}</p>
                </div>

                <button
                  type="button"
                  className={styles.unsaveBtn}
                  onClick={() => unsaveJob(item.id)}
                  title="Bỏ lưu việc làm này"
                  aria-label={`Bỏ lưu việc làm ${item.title}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  <span>Bỏ lưu</span>
                </button>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaItem}>
                  <DollarSign size={14} aria-hidden="true" />
                  <strong>{item.salary}</strong>
                </span>
                <span className={styles.metaItem}>
                  <MapPin size={14} aria-hidden="true" />
                  {item.location}
                </span>
                {item.workplace && (
                  <span className={styles.metaItem}>
                    <Briefcase size={14} aria-hidden="true" />
                    {item.workplace}
                  </span>
                )}
                {item.type && (
                  <span className={styles.typeBadge}>{item.type}</span>
                )}
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.savedTime}>
                  Đã lưu lúc: {new Date(item.savedAt).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </span>

                <div className={styles.actions}>
                  <Link to={`/jobs/${item.id}`} className={styles.viewDetailBtn}>
                    Xem chi tiết
                  </Link>
                  <Link to={`/jobs/${item.id}/apply`} className={styles.applyBtn}>
                    Ứng tuyển ngay <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidateSavedJobsPage;
