import {
  useParams,
} from "react-router-dom";

import {
  jobs,
} from "@/data/mock/jobs.mock";

import JobDescriptionPlaceholder from "./components/JobDescriptionPlaceholder";
import JobDetailHero from "./components/JobDetailHero";
import JobDetailNotFound from "./components/JobDetailNotFound";
import JobDetailSidebar from "./components/JobDetailSidebar";
import JobOverviewCard from "./components/JobOverviewCard";
import JobSkillsCard from "./components/JobSkillsCard";

import styles from "./styles/JobDetailLayout.module.css";

const JobDetailPage = () => {
  const { id } = useParams();

  const job = jobs.find(
    (item) =>
      item.id === Number(id),
  );

  if (!job) {
    return <JobDetailNotFound />;
  }

  return (
    <main className={styles.page}>
      <JobDetailHero job={job} />

      <section
        className={
          styles.contentSection
        }
      >
        <div
          className={`container ${styles.contentGrid}`}
        >
          <div className={styles.mainContent}>
            <JobOverviewCard job={job} />

            <JobSkillsCard job={job} />

            <JobDescriptionPlaceholder />
          </div>

          <JobDetailSidebar job={job} />
        </div>
      </section>
    </main>
  );
};

export default JobDetailPage;
