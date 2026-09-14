import styles from "../styles/AdvancedFilterFields.module.css";

interface SalaryFilterFieldProps {
  value: number;

  onChange: (
    value: number,
  ) => void;
}

const SalaryFilterField = ({
  value,
  onChange,
}: SalaryFilterFieldProps) => {
  return (
    <label
      className={`${styles.filterField} ${styles.salaryField}`}
    >
      <span>Mức lương tối thiểu</span>

      <div className={styles.selectWrapper}>
        <select
          value={value}
          onChange={(event) =>
            onChange(
              Number(
                event.target.value,
              ),
            )
          }
        >
          <option value={0}>
            Không yêu cầu
          </option>

          <option value={10}>
            Từ 10 triệu
          </option>

          <option value={12}>
            Từ 12 triệu
          </option>

          <option value={15}>
            Từ 15 triệu
          </option>

          <option value={20}>
            Từ 20 triệu
          </option>

          <option value={25}>
            Từ 25 triệu
          </option>
        </select>
      </div>
    </label>
  );
};

export default SalaryFilterField;
