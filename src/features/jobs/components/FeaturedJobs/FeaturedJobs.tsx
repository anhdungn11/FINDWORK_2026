import { jobs } from "@/data/mock/jobs.mock";

import JobCard from "@/features/jobs/components/JobCard";

import styles from "./FeaturedJobs.module.css";

const FeaturedJobs = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.heading}>
          <h2 className={styles.title}>
            Việc làm nổi bật
          </h2>

          <p className={styles.description}>
            Khám phá những cơ hội việc làm mới và phù hợp.
          </p>
        </div>

        <div className={styles.grid}>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedJobs;