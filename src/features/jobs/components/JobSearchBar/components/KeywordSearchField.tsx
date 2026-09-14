import {
  SearchIcon,
} from "./JobSearchIcons";

import styles from "../styles/KeywordSearchField.module.css";

interface KeywordSearchFieldProps {
  keyword: string;
  onKeywordChange: (
    value: string,
  ) => void;
}

const KeywordSearchField = ({
  keyword,
  onKeywordChange,
}: KeywordSearchFieldProps) => {
  return (
    <div className={styles.keywordSection}>
      <span className={styles.mainIcon}>
        <SearchIcon />
      </span>

      <div className={styles.inputContent}>
        <span className={styles.fieldLabel}>
          Tìm công việc
        </span>

        <input
          type="text"
          value={keyword}
          placeholder="Chức danh, kỹ năng hoặc công ty"
          onChange={(event) =>
            onKeywordChange(
              event.target.value,
            )
          }
        />
      </div>
    </div>
  );
};

export default KeywordSearchField;
