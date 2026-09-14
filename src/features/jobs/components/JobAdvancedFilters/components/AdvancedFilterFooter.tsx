import styles from "../styles/AdvancedFilterFooter.module.css";

interface AdvancedFilterFooterProps {
  resultCount: number;
  hasDraftFilters: boolean;
  isDirty: boolean;

  onReset: () => void;
  onApply: () => void;
}

const AdvancedFilterFooter = ({
  resultCount,
  hasDraftFilters,
  isDirty,
  onReset,
  onApply,
}: AdvancedFilterFooterProps) => {
  return (
    <div
      className={
        styles.filterPanelFooter
      }
    >
      <div
        className={
          styles.filterResultInfo
        }
      >
        <span
          className={styles.liveDot}
        />

        <span>
          {resultCount} công việc phù hợp
          với bộ lọc đang chọn
        </span>
      </div>

      <div
        className={
          styles.filterActions
        }
      >
        {hasDraftFilters && (
          <button
            type="button"
            className={
              styles.resetFilterButton
            }
            onClick={onReset}
          >
            Đặt lại
          </button>
        )}

        <button
          type="button"
          className={
            styles.applyFilterButton
          }
          onClick={onApply}
        >
          {isDirty
            ? "Áp dụng bộ lọc"
            : "Xem kết quả"}
        </button>
      </div>
    </div>
  );
};

export default AdvancedFilterFooter;
