import Button from "@/components/common/Button";

import styles from "./JobSearchBar.module.css";

const JobSearchBar = () => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.field}>
        <span className={styles.icon}>⌕</span>

        <input
          type="text"
          placeholder="Vị trí, kỹ năng hoặc công ty"
        />
      </div>

      <div className={styles.divider} />

      <div className={styles.field}>
        <span className={styles.icon}>⌖</span>

        <input
          type="text"
          placeholder="Địa điểm"
        />
      </div>

      <Button size="large">
        Tìm kiếm
      </Button>
    </div>
  );
};

export default JobSearchBar;