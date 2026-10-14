import {
  Link,
  useParams,
} from "react-router-dom";

import { parseJobId } from "@/app/router/jobId";
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
  const parsedJobId = parseJobId(id);

  if (parsedJobId.kind === "backend") {
    return (
      <main className={styles.page}>
        <div className="container">
          <h1>Chưa hỗ trợ hiển thị tin tuyển dụng này</h1>
          <p>Tin tuyển dụng từ hệ thống chính chưa được kết nối với trang này.</p>
          <Link to="/jobs">Quay lại danh sách việc làm</Link>
        </div>
      </main>
    );
  }

  const job = parsedJobId.kind === "mock"
    ? jobs.find((item) => item.id === parsedJobId.id)
    : null;

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
