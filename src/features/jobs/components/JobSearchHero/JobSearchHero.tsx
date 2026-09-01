import Button from "@/components/common/Button";

import styles from "./JobSearchHero.module.css";

const JobSearchHero = () => {
  return (
    <section className={styles.hero}>
      <div className="container">
        <div className={styles.content}>
          <h1 className={styles.title}>
            Tìm công việc phù hợp với bạn
          </h1>

          <p className={styles.description}>
            Khám phá cơ hội nghề nghiệp và tìm công việc phù hợp
            với kỹ năng, kinh nghiệm và mục tiêu của bạn.
          </p>

          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Vị trí, kỹ năng hoặc công ty"
              className={styles.input}
            />

            <input
              type="text"
              placeholder="Địa điểm"
              className={styles.input}
            />

            <Button size="large">
              Tìm việc
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JobSearchHero;