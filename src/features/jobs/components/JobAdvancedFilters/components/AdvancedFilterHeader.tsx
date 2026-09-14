import styles from "../styles/AdvancedFilterPanel.module.css";

interface AdvancedFilterHeaderProps {
  onClose: () => void;
}

const AdvancedFilterHeader = ({
  onClose,
}: AdvancedFilterHeaderProps) => {
  return (
    <div
      className={
        styles.filterPanelHeader
      }
    >
      <div>
        <span
          className={
            styles.filterEyebrow
          }
        >
          FINDWORK FILTER
        </span>

        <h3>
          Tinh chỉnh kết quả tìm kiếm
        </h3>

        <p>
          Chọn những tiêu chí phù hợp
          với công việc bạn đang tìm.
        </p>
      </div>

      <button
        type="button"
        className={
          styles.closeFilterButton
        }
        onClick={onClose}
        aria-label="Đóng bộ lọc"
      >
        ×
      </button>
    </div>
  );
};

export default AdvancedFilterHeader;
