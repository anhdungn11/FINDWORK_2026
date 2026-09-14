import type {
  ReactNode,
} from "react";

import type {
  JobDetailRecord,
} from "../types/job-detail.types";

import {
  BriefcaseIcon,
  ExperienceIcon,
  SalaryIcon,
  WorkplaceIcon,
} from "./JobDetailIcons";

import JobDetailSectionHeader from "./JobDetailSectionHeader";

import styles from "../styles/JobDetailOverview.module.css";
import cardStyles from "../styles/JobDetailCards.module.css";

interface JobOverviewCardProps {
  job: JobDetailRecord;
}

const JobOverviewCard = ({
  job,
}: JobOverviewCardProps) => {
  return (
    <section className={cardStyles.card}>
      <JobDetailSectionHeader
        label="TỔNG QUAN"
        title="Thông tin việc làm"
      />

      <div className={styles.overviewGrid}>
        <OverviewItem
          icon={<BriefcaseIcon />}
          label="Hình thức"
          value={job.type}
        />

        <OverviewItem
          icon={<SalaryIcon />}
          label="Mức lương"
          value={job.salary}
        />

        <OverviewItem
          icon={<WorkplaceIcon />}
          label="Nơi làm việc"
          value={job.workplace}
        />

        <OverviewItem
          icon={<ExperienceIcon />}
          label="Kinh nghiệm"
          value={job.experience}
        />
      </div>
    </section>
  );
};

interface OverviewItemProps {
  icon: ReactNode;
  label: string;
  value: string;
}

const OverviewItem = ({
  icon,
  label,
  value,
}: OverviewItemProps) => {
  return (
    <div className={styles.overviewItem}>
      <div className={styles.overviewIcon}>
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
};

export default JobOverviewCard;
