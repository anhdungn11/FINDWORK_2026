import type {
  ReactNode,
} from "react";

import styles from "../styles/JobsHero.module.css";

interface JobsHeroProps {
  searchContent: ReactNode;
  filterContent: ReactNode;
}

const JobsHero = ({
  searchContent,
  filterContent,
}: JobsHeroProps) => {
  return (
    <section className={styles.hero}>
      <div className="container">
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Khám phá công việc phù hợp với bạn
          </h1>

          <p className={styles.description}>
            Tìm kiếm cơ hội theo kỹ năng, ngành nghề và khu vực
            bạn mong muốn.
          </p>

          <div className={styles.searchWrapper}>
            {searchContent}
          </div>

          {filterContent}
        </div>
      </div>
    </section>
  );
};

export default JobsHero;
