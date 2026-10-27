import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, ArrowRight, Trash2, MapPin, DollarSign, Briefcase, Info, RefreshCw, AlertTriangle } from "lucide-react";
import { useSavedJobs } from "@/features/candidate/savedJobs/useSavedJobs";
import { savedJobsService } from "@/features/candidate/savedJobs/savedJobsService";
import { isLiveWritesEnabled } from "@/features/candidate/profile/config/candidateIntegrationConfig";
import { PageHeader, Badge } from "@/components/ui";
import { useI18n } from "@/i18n/i18nStore";
import styles from "./CandidateSavedJobsPage.module.css";

const CandidateSavedJobsPage = () => {
  const { savedJobs, unsaveJob, savedCount, refresh, userId } = useSavedJobs();
  const [syncing, setSyncing] = useState(false);
  const liveWrites = isLiveWritesEnabled();
  const t = useI18n((s) => s.t);
  const locale = useI18n((s) => s.locale);

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
        title={t.nav.savedJobs}
        subtitle={
          locale === "en"
            ? `You are tracking ${savedCount} saved job positions`
            : `Bạn đang theo dõi ${savedCount} vị trí tuyển dụng`
        }
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {liveWrites && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncing}
                className={styles.unsaveBtn}
                style={{ padding: "6px 12px", height: "auto" }}
                title={locale === "en" ? "Sync with server" : "Đồng bộ từ máy chủ"}
              >
                <RefreshCw size={14} className={syncing ? "animate-spin" : ""} aria-hidden="true" />
                <span>{syncing ? (locale === "en" ? "Syncing..." : "Đang đồng bộ...") : (locale === "en" ? "Sync" : "Đồng bộ")}</span>
              </button>
            )}
            <Link to="/jobs" className={styles.exploreLink}>
              {locale === "en" ? "Explore more jobs" : "Khám phá thêm việc làm"} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        }
      />

      {savedJobs.length > 0 && (
        <aside className={styles.disclosureBanner} role="note">
          <Info size={16} aria-hidden="true" className={styles.infoIcon} />
          <div>
            <span>
              {locale === "en"
                ? "Saved jobs are stored with your account. You can apply directly or remove them when no longer interested."
                : "Các tin việc làm đã lưu được đồng bộ với tài khoản của bạn. Bạn có thể ứng tuyển trực tiếp hoặc bỏ lưu khi không còn nhu cầu."}
            </span>
          </div>
        </aside>
      )}

      {savedJobs.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconCircle}>
            <Bookmark size={32} aria-hidden="true" />
          </div>
          <h2 className={styles.emptyTitle}>{t.jobs.emptySavedTitle}</h2>
          <p className={styles.emptyText}>
            {t.jobs.emptySavedDesc}
          </p>
          <Link to="/jobs" className={styles.emptyButton}>
            {locale === "en" ? "Find jobs now" : "Tìm việc làm ngay"} <ArrowRight size={16} aria-hidden="true" />
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
                        <Badge tone="warning">{t.jobs.sampleBadge}</Badge>
                      )}
                      {isClosed && (
                        <Badge tone="danger">{t.jobs.closedBadge}</Badge>
                      )}
                    </div>
                    <p className={styles.companyName}>{item.company}</p>
                  </div>

                  <button
                    type="button"
                    className={styles.unsaveBtn}
                    onClick={() => unsaveJob(item.id)}
                    title={locale === "en" ? "Remove saved job" : "Bỏ lưu việc làm này"}
                    aria-label={`${locale === "en" ? "Remove" : "Bỏ lưu"} ${item.title}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    <span>{locale === "en" ? "Remove" : "Bỏ lưu"}</span>
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
                    <span>{locale === "en" ? "This job is closed or no longer accepting applications." : "Tin tuyển dụng này hiện không còn nhận hồ sơ hoặc công ty đã tạm ngừng tuyển."}</span>
                  </div>
                )}

                <div className={styles.cardFooter}>
                  <span className={styles.savedTime}>
                    {locale === "en" ? "Saved at" : "Đã lưu lúc"}: {new Date(item.savedAt).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>

                  <div className={styles.actions}>
                    {isClosed ? (
                      <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
                        {locale === "en" ? "Unavailable" : "Không thể ứng tuyển"}
                      </span>
                    ) : (
                      <>
                        <Link to={`/jobs/${item.id}`} className={styles.viewDetailBtn}>
                          {locale === "en" ? "View Details" : "Xem chi tiết"}
                        </Link>
                        <Link to={`/jobs/${item.id}/apply`} className={styles.applyBtn}>
                          {locale === "en" ? "Apply Now" : "Ứng tuyển ngay"} <ArrowRight size={14} aria-hidden="true" />
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
