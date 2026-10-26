import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Heart, MapPin, Briefcase, Clock, ArrowRight } from "lucide-react";
import { resolveApiUrl } from "@/services/http/apiClient";
import { formatSalary, WORKPLACE_TYPE_LABEL, EMPLOYMENT_TYPE_LABEL, type JobDto } from "@/services/api/apiTypes";
import { useSavedJobs } from "@/features/candidate/savedJobs/useSavedJobs";
import { useAuthStore } from "@/store/authStore";
import styles from "./CompactJobCard.module.css";

interface CompactJobCardProps {
  job: JobDto | any;
}

const formatRelativeTime = (isoString?: string | null): string => {
  if (!isoString) return "Mới đăng";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Vừa đăng";
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 30) return `${diffDays} ngày trước`;
    return new Date(isoString).toLocaleDateString("vi-VN");
  } catch {
    return "Mới đăng";
  }
};

export const CompactJobCard = ({ job }: CompactJobCardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { isSaved, toggleSave } = useSavedJobs();

  const saved = isSaved(job.id);
  const logoUrl = resolveApiUrl(job.companyLogoUrl || job.logoUrl);
  const companyName = job.companyName || job.company || "Doanh nghiệp";
  const salaryText = formatSalary(job);
  const relativeTime = formatRelativeTime(job.publishedAt || job.postedAt);

  // Extract location display
  const locationText =
    (job.locations && job.locations[0]?.province?.name) ||
    job.location ||
    "Toàn quốc";

  // Workplace and Employment labels
  const workplaceText = job.workplaceType
    ? WORKPLACE_TYPE_LABEL[job.workplaceType as keyof typeof WORKPLACE_TYPE_LABEL] || job.workplace
    : job.workplace || "Tại văn phòng";

  const employmentText = job.employmentType
    ? EMPLOYMENT_TYPE_LABEL[job.employmentType as keyof typeof EMPLOYMENT_TYPE_LABEL] || job.type
    : job.type || "Toàn thời gian";

  const handleCardClick = () => {
    navigate(`/jobs/${job.id}`);
  };

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    toggleSave({
      id: job.id,
      title: job.title,
      company: companyName,
      location: locationText,
      salary: salaryText,
      workplace: workplaceText,
      type: employmentText,
      isMock: Boolean(job.isMock),
    });
  };

  return (
    <article
      className={styles.card}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      tabIndex={0}
      role="link"
      aria-label={`Việc làm ${job.title} tại ${companyName}`}
    >
      <div className={styles.topRow}>
        <div className={styles.logoWrapper}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName}
              className={styles.logoImg}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className={styles.logoFallback}>
              {companyName.trim().charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className={styles.headerInfo}>
          <p className={styles.companyName} title={companyName}>
            {companyName}
          </p>
          <h3 className={styles.jobTitle} title={job.title}>
            {job.title}
          </h3>
        </div>

        <button
          type="button"
          className={`${styles.saveButton} ${saved ? styles.saveButtonActive : ""}`}
          onClick={handleSaveToggle}
          aria-label={saved ? "Bỏ lưu việc làm này" : "Lưu việc làm này"}
          aria-pressed={saved}
          data-testid="job-save-btn"
          title={saved ? "Đã lưu" : "Lưu việc làm"}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div className={styles.salaryRow}>
        <span className={styles.salaryBadge}>{salaryText}</span>
      </div>

      <div className={styles.tagsRow}>
        <span className={styles.tag} title={`Địa điểm: ${locationText}`}>
          <MapPin size={12} aria-hidden="true" />
          <span>{locationText}</span>
        </span>
        <span className={styles.tag} title={`Hình thức: ${workplaceText}`}>
          <Briefcase size={12} aria-hidden="true" />
          <span>{workplaceText}</span>
        </span>
      </div>

      <div className={styles.footerRow}>
        <span className={styles.postedTime}>
          <Clock size={12} aria-hidden="true" />
          <span>{relativeTime}</span>
        </span>

        <span className={styles.applyHint}>
          Ứng tuyển <ArrowRight size={12} style={{ display: "inline", verticalAlign: "middle" }} />
        </span>
      </div>
    </article>
  );
};

export default CompactJobCard;
