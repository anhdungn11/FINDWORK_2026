import type { Job } from "@/data/mock/jobs.mock";

import styles from "./JobCard.module.css";

interface JobCardProps {
  job: Job;
}

const JobCard = ({ job }: JobCardProps) => {
  return (
    <article className={styles.card}>
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