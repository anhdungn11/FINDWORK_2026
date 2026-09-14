import type {
  JobDetailRecord,
} from "../types/job-detail.types";

import JobCompanyCard from "./JobCompanyCard";
import JobMatchCard from "./JobMatchCard";

import styles from "../styles/JobDetailSidebar.module.css";

interface JobDetailSidebarProps {
  job: JobDetailRecord;
}

const JobDetailSidebar = ({
  job,
}: JobDetailSidebarProps) => {
  return (
    <aside className={styles.sidebar}>
      <JobMatchCard job={job} />
      <JobCompanyCard job={job} />
    </aside>
  );
};

export default JobDetailSidebar;
