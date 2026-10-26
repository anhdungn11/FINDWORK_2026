import { useNavigate } from "react-router-dom";
import type {
  JobRecord,
} from "@/features/jobs/types/job.types";

import styles from "./JobCard.module.css";

interface JobCardProps {
  job: JobRecord;
}

const JobCard = ({ job }: JobCardProps) => {
  const navigate = useNavigate();

  const handleOpen = () => {
    navigate(`/jobs/${job.id}`);
  };

  return (
    <article
      className={styles.card}
      onClick={handleOpen}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <h3 className={styles.title}>
        {job.title}
      </h3>

      <p className={styles.company}>
        {job.company}
      </p>

      <div className={styles.meta}>
        <span>{job.location}</span>
        <span>{job.salary}</span>
        <span>{job.type}</span>
      </div>
    </article>
  );
};

export default JobCard;