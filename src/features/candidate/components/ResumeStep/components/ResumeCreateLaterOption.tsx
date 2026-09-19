import styles from "../styles/ResumeStep.module.css";

interface ResumeCreateLaterOptionProps {
  selected: boolean;
  onSelect: () => void;
}

const ResumeCreateLaterOption = ({
  selected,
  onSelect,
}: ResumeCreateLaterOptionProps) => {
  return (
    <section className={styles.laterSection}>
      <div className={styles.divider}>
        <span>hoặc</span>
      </div>

      <button
        type="button"
        className={`${styles.laterOption} ${
          selected
            ? styles.laterOptionSelected
            : ""
        }`}
        onClick={onSelect}
        aria-pressed={selected}
      >
        <span className={styles.laterCheck}>
          {selected ? "✓" : ""}
        </span>

        <span>
          <strong>
            Tôi sẽ chuẩn bị CV sau
          </strong>
          <small>
            Bạn vẫn có thể hoàn thành hồ sơ, tìm việc và nhận gợi ý công việc. CV có thể được thêm sau tại khu vực quản lý hồ sơ.
          </small>
        </span>
      </button>
    </section>
  );
};

export default ResumeCreateLaterOption;
