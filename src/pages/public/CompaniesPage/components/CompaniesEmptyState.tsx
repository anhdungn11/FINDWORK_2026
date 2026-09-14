import styles from "../styles/CompaniesEmptyState.module.css";

interface CompaniesEmptyStateProps {
  onClearFilters: () => void;
}

const CompaniesEmptyState = ({
  onClearFilters,
}: CompaniesEmptyStateProps) => {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M4 20V8l8-4 8 4v12" />
          <path d="M9 20v-5h6v5" />
          <path d="M8 10h.01M12 10h.01M16 10h.01" />
        </svg>
      </div>

      <h3>
        Không tìm thấy doanh nghiệp phù hợp
      </h3>

      <p>
        Thử thay đổi từ khóa, ngành nghề hoặc
        khu vực tìm kiếm.
      </p>

      <button
        type="button"
        onClick={onClearFilters}
      >
        Xóa bộ lọc
      </button>
    </div>
  );
};

export default CompaniesEmptyState;
