import CompanySearchIcon from "./CompanySearchIcon";

import styles from "../styles/CompanySearchPanel.module.css";

interface CompanySearchPanelProps {
  keyword: string;
  industry: string;
  location: string;

  industryOptions: string[];
  locationOptions: string[];

  onKeywordChange: (
    value: string,
  ) => void;

  onIndustryChange: (
    value: string,
  ) => void;

  onLocationChange: (
    value: string,
  ) => void;
}

const CompanySearchPanel = ({
  keyword,
  industry,
  location,
  industryOptions,
  locationOptions,
  onKeywordChange,
  onIndustryChange,
  onLocationChange,
}: CompanySearchPanelProps) => {
  return (
    <div className={styles.searchPanel}>
      <div className={styles.searchField}>
        <span className={styles.searchIcon}>
          <CompanySearchIcon />
        </span>

        <input
          type="text"
          value={keyword}
          placeholder="Tên công ty hoặc lĩnh vực..."
          onChange={(event) =>
            onKeywordChange(
              event.target.value,
            )
          }
        />
      </div>

      <div className={styles.divider} />

      <div className={styles.selectField}>
        <span className={styles.selectLabel}>
          Ngành nghề
        </span>

        <select
          value={industry}
          onChange={(event) =>
            onIndustryChange(
              event.target.value,
            )
          }
        >
          <option value="">
            Tất cả ngành nghề
          </option>

          {industryOptions.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ),
          )}
        </select>
      </div>

      <div className={styles.divider} />

      <div className={styles.selectField}>
        <span className={styles.selectLabel}>
          Khu vực
        </span>

        <select
          value={location}
          onChange={(event) =>
            onLocationChange(
              event.target.value,
            )
          }
        >
          <option value="">
            Tất cả khu vực
          </option>

          {locationOptions.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ),
          )}
        </select>
      </div>
    </div>
  );
};

export default CompanySearchPanel;
