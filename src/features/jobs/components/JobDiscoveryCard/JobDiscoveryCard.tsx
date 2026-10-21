import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useSavedJobs } from "@/features/candidate/savedJobs/useSavedJobs";

import type {
  JobRecord,
} from "@/features/jobs/types/job.types";

import styles from "./JobDiscoveryCard.module.css";

interface JobDiscoveryCardProps {
  job: JobRecord | {
    id: string | number;
    title: string;
    company: string;
    location: string;
    workplace?: string;
    type?: string;
    experience?: string;
    category?: string;
    salary: string;
    skills?: readonly string[];
    postedAt?: string;
    matchScore?: number;
    isMock?: boolean;
  };
}

const JobDiscoveryCard = ({ job }: JobDiscoveryCardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { isSaved, toggleSave } = useSavedJobs();

  const saved = isSaved(job.id);
  const isMockJob = "isMock" in job ? Boolean(job.isMock) : typeof job.id === "number";

  const handleOpenJob = () => {
    navigate(`/jobs/${job.id}`);
  };

  const handleSaveJob = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

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
    <article
      className={styles.card}
      onClick={handleOpenJob}
      role="link"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          handleOpenJob();
        }
      }}
    >
      <div className={styles.header}>
        <div>
          <span className={styles.category}>
            {job.category}
          </span>

          <h2 className={styles.title}>
            {job.title}
            {isMockJob && (
              <span className={styles.mockBadge} title="Dữ liệu mẫu minh họa, chưa phải tin backend thật">
                Bản tin mẫu
              </span>
            )}
          </h2>

          <p className={styles.company}>
            {job.company}
          </p>
        </div>

        <button
          type="button"
          className={`${styles.saveButton} ${saved ? styles.saveButtonActive : ""}`}
          aria-label={saved ? "Bỏ lưu việc làm này" : "Lưu việc làm này"}
          aria-pressed={saved}
          onClick={handleSaveJob}
          title={saved ? "Bỏ lưu việc làm" : "Lưu việc làm"}
        >
          {saved ? "♥" : "♡"}
        </button>
      </div>

      <div className={styles.meta}>
        <span>{job.location}</span>
        <span>{job.workplace}</span>
        <span>{job.type}</span>
        <span>{job.experience}</span>
      </div>

      <div className={styles.salary}>
        {job.salary}
      </div>

      <div className={styles.skills}>
        {(job.skills ?? []).map((skill) => (
          <span key={skill}>
            {skill}
          </span>
        ))}
      </div>

      <div className={styles.footer}>
        <span className={styles.postedAt}>
          {job.postedAt}
        </span>

        <span className={styles.match}>
          {job.matchScore}% phù hợp
        </span>
      </div>
    </article>
  );
};

export default JobDiscoveryCard;