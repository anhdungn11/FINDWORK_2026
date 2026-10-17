import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, ArrowRight, Trash2, MapPin, DollarSign, Briefcase, Info, RefreshCw, AlertTriangle } from "lucide-react";
import { useSavedJobs } from "@/features/candidate/savedJobs/useSavedJobs";
import { savedJobsService } from "@/features/candidate/savedJobs/savedJobsService";
import { isLiveWritesEnabled } from "@/features/candidate/profile/config/candidateIntegrationConfig";
import { PageHeader, Badge } from "@/components/ui";
import styles from "./CandidateSavedJobsPage.module.css";

const CandidateSavedJobsPage = () => {
  const { savedJobs, unsaveJob, savedCount, refresh, userId } = useSavedJobs();
  const [syncing, setSyncing] = useState(false);
  const liveWrites = isLiveWritesEnabled();

  const handleManualSync = async () => {
    if (!userId) return;
    setSyncing(true);
    await savedJobsService.syncFromBackend(userId);
    refresh();
    setSyncing(false);
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title="Việc làm đã lưu"
        subtitle={`Bạn đang theo dõi ${savedCount} vị trí tuyển dụng`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {liveWrites && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncing}
                className={styles.unsaveBtn}
                style={{ padding: "6px 12px", height: "auto" }}
                title="Đồng bộ từ máy chủ"
              >
                <RefreshCw size={14} className={syncing ? "animate-spin" : ""} aria-hidden="true" />
                <span>{syncing ? "Đang đồng bộ..." : "Đồng bộ"}</span>
              </button>
            )}
            <Link to="/jobs" className={styles.exploreLink}>
              Khám phá thêm việc làm <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        }
      />

      <aside className={styles.disclosureBanner} role="note">
        <Info size={16} aria-hidden="true" className={styles.infoIcon} />
        <div>
          {liveWrites ? (
            <span>
              <strong>Đã kết nối Backend Saved Jobs API:</strong> Danh sách tin đã lưu được đồng bộ trực tiếp với máy chủ (POST/GET/DELETE /candidate/saved-jobs). Các tin tuyển dụng mẫu vẫn được lưu riêng trong trình duyệt.
            </span>
          ) : (
            <span>
              <strong>Chế độ an toàn kiểm thử (ENABLE_LIVE_WRITES: false):</strong> Danh sách việc làm đã lưu hiện được bảo toàn theo tài khoản của bạn trên trình duyệt này. API Backend (/candidate/saved-jobs) đã sẵn sàng tích hợp khi cổng ghi được kích hoạt. Không có dữ liệu ghi đè vào PostgreSQL.
            </span>
          )}
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
          {savedJobs.map((item) => {
            const isClosed = item.isAvailable === false;
            return (
              <article key={item.id} className={styles.jobCard} style={isClosed ? { opacity: 0.85, background: "#fcfcfd" } : undefined}>
                <div className={styles.jobHeader}>
                  <div className={styles.jobTitleArea}>
                    <div className={styles.titleRow}>
                      <h2 className={styles.jobTitle}>
                        {isClosed ? (
                          <span>{item.title}</span>
                        ) : (
                          <Link to={`/jobs/${item.id}`}>{item.title}</Link>
                        )}
                      </h2>
                      {item.isMock && (
                        <Badge tone="warning">Bản tin mẫu</Badge>
                      )}
                      {isClosed && (
                        <Badge tone="danger">Không khả dụng (Tin đã đóng/hết hạn)</Badge>
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

                {!isClosed && (
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
                )}

                {isClosed && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0", color: "#b91c1c", fontSize: 13 }}>
                    <AlertTriangle size={15} aria-hidden="true" />
                    <span>Tin tuyển dụng này hiện không còn nhận hồ sơ hoặc công ty đã tạm ngừng tuyển.</span>
                  </div>
                )}

                <div className={styles.cardFooter}>
                  <span className={styles.savedTime}>
                    Đã lưu lúc: {new Date(item.savedAt).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>

                  <div className={styles.actions}>
                    {isClosed ? (
                      <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
                        Không thể ứng tuyển
                      </span>
                    ) : (
                      <>
                        <Link to={`/jobs/${item.id}`} className={styles.viewDetailBtn}>
                          Xem chi tiết
                        </Link>
                        <Link to={`/jobs/${item.id}/apply`} className={styles.applyBtn}>
                          Ứng tuyển ngay <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CandidateSavedJobsPage;
