import { useNavigate } from "react-router-dom";

import type { Job } from "@/data/mock/jobs.mock";

import styles from "./JobDiscoveryCard.module.css";

interface JobDiscoveryCardProps {
  job: Job;
}

const JobDiscoveryCard = ({ job }: JobDiscoveryCardProps) => {
  const navigate = useNavigate();

  const handleOpenJob = () => {
    navigate(`/jobs/${job.id}`);
  };

  const handleSaveJob = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    // Tạm thời chỉ chặn click lan ra card.
    // Sau này sẽ nối chức năng saved jobs thật.
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
          </h2>

          <p className={styles.company}>
            {job.company}
          </p>
        </div>

        <button
          type="button"
          className={styles.saveButton}
          aria-label="Lưu việc làm"
          onClick={handleSaveJob}
        >
          ♡
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
        {job.skills.map((skill) => (
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