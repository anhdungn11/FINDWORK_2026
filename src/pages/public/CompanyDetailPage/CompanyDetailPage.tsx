import {
  useParams,
} from "react-router-dom";

import {
  companies,
} from "@/data/mock/companies.mock";

import CompanyAboutCard from "./components/CompanyAboutCard";
import CompanyDetailHero from "./components/CompanyDetailHero";
import CompanyDetailNotFound from "./components/CompanyDetailNotFound";
import CompanyDetailSidebar from "./components/CompanyDetailSidebar";
import CompanyJobsCard from "./components/CompanyJobsCard";

import styles from "./styles/CompanyDetailLayout.module.css";

const CompanyDetailPage = () => {
  const { id } = useParams();

  const company = companies.find(
    (item) =>
      item.id === Number(id),
  );

  if (!company) {
    return <CompanyDetailNotFound />;
  }

  return (
    <main className={styles.page}>
      <CompanyDetailHero
        company={company}
      />

      <section
        className={
          styles.contentSection
        }
      >
        <div
          className={`container ${styles.contentGrid}`}
        >
          <div className={styles.mainContent}>
            <CompanyAboutCard
              company={company}
            />

            <CompanyJobsCard
              company={company}
            />
          </div>

          <CompanyDetailSidebar
            company={company}
          />
        </div>
      </section>
    </main>
  );
};

export default CompanyDetailPage;
