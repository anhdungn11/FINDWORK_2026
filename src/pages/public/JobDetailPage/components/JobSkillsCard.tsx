import type {
  JobDetailRecord,
} from "../types/job-detail.types";

import JobDetailSectionHeader from "./JobDetailSectionHeader";

import cardStyles from "../styles/JobDetailCards.module.css";
import styles from "../styles/JobDetailSkills.module.css";

interface JobSkillsCardProps {
  job: JobDetailRecord;
}

const JobSkillsCard = ({
  job,
}: JobSkillsCardProps) => {
  return (
    <section className={cardStyles.card}>
      <JobDetailSectionHeader
        label="KỸ NĂNG"
        title="Kỹ năng liên quan"
        description="Một số kỹ năng liên quan đến vị trí tuyển dụng này."
      />

      <div className={styles.skills}>
        {job.skills.map((skill) => (
          <span
            key={skill}
            className={styles.skill}
          >
            {skill}
          </span>
        ))}
      </div>
    </section>
  );
};

export default JobSkillsCard;
