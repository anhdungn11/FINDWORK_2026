import { resolveApiUrl } from "@/services/http/apiClient";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useSavedJobs } from "@/features/candidate/savedJobs/useSavedJobs";

import type {
  JobDetailRecord,
} from "../types/job-detail.types";

import {
  ArrowRightIcon,
  BackIcon,
  BookmarkIcon,
  ClockIcon,
  LocationIcon,
} from "./JobDetailIcons";

import actionStyles from "../styles/JobDetailHeroActions.module.css";
import styles from "../styles/JobDetailHero.module.css";

interface JobDetailHeroProps {
  job: JobDetailRecord;
  isMock?: boolean;
}

const JobDetailHero = ({
  job,
  isMock,
}: JobDetailHeroProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { isSaved, toggleSave } = useSavedJobs();

  const saved = isSaved(job.id);
  const isMockJob = isMock ?? (typeof job.id === "number");

  const handleToggleSave = () => {
    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    toggleSave({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      workplace: job.workplace,
      type: job.type,
      isMock: isMockJob,
    });
  };

  return (
    <section className={styles.hero}>
      <div className="container">
        <Link
          to="/jobs"
          className={styles.backLink}
        >
          <BackIcon />

          Việc làm
        </Link>

        {isMockJob && (
          <aside className={styles.demoNotice} role="note">
            <strong>Bản tin mẫu (Demo):</strong> Đây là tin tuyển dụng mẫu dùng để kiểm thử giao diện. Chức năng nộp hồ sơ thực tế chỉ khả dụng với các tin tuyển dụng được đăng từ hệ thống Backend.
          </aside>
        )}

        <div className={styles.heroCard}>
          <div className={styles.heroMain}>
            <div className={styles.companyLogo}>
              {job.companyLogoUrl ? (
                <img
                  src={resolveApiUrl(job.companyLogoUrl) ?? undefined}
                  alt={job.company}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                job.company.charAt(0)
              )}
            </div>

            <div className={styles.heroInfo}>
              <span className={styles.category}>
                {job.category}
              </span>

              <h1>
                {job.title}
                {isMockJob && (
                  <span className={styles.mockBadge}>Bản tin mẫu</span>
                )}
              </h1>

              <p className={styles.company}>
                {job.company}
              </p>

              <div className={styles.heroMeta}>
                <span>
                  <LocationIcon />
                  {job.location}
                </span>

                <span>
                  <ClockIcon />
                  {job.postedAt}
                </span>
              </div>
            </div>
          </div>

          <div className={actionStyles.heroActions}>
            <button
              type="button"
              className={`${actionStyles.saveButton} ${saved ? actionStyles.savedActive : ""}`}
              onClick={handleToggleSave}
              aria-pressed={saved}
              aria-label={saved ? "Bỏ lưu việc làm này" : "Lưu việc làm này"}
              title={saved ? "Bỏ lưu việc làm" : "Lưu việc làm vào danh sách"}
            >
              <BookmarkIcon />

              {saved ? "Đã lưu" : "Lưu"}
            </button>

            <Link
              to={`/jobs/${job.id}/apply`}
              className={actionStyles.applyButton}
            >
              Ứng tuyển ngay

              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JobDetailHero;
