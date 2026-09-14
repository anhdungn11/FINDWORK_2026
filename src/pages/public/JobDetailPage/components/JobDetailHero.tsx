import {
  Link,
} from "react-router-dom";

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
}

const JobDetailHero = ({
  job,
}: JobDetailHeroProps) => {
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

        <div className={styles.heroCard}>
          <div className={styles.heroMain}>
            <div className={styles.companyLogo}>
              {job.company.charAt(0)}
            </div>

            <div className={styles.heroInfo}>
              <span className={styles.category}>
                {job.category}
              </span>

              <h1>{job.title}</h1>

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
              className={actionStyles.saveButton}
            >
              <BookmarkIcon />

              Lưu
            </button>

            <button
              type="button"
              className={actionStyles.applyButton}
            >
              Ứng tuyển ngay

              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JobDetailHero;
