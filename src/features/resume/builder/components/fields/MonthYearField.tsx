import styles from "../ResumeEditor.module.css";

interface MonthYearFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
}

const MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const MonthYearField = ({
  label,
  value,
  onChange,
  disabled = false,
  minYear = 1950,
  maxYear = new Date().getFullYear() + 5,
}: MonthYearFieldProps) => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const year = match?.[1] ?? "";
  const month = match?.[2] ?? "";
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => String(maxYear - index));

  const update = (nextMonth: string, nextYear: string) => {
    if (!nextMonth && !nextYear) {
      onChange("");
      return;
    }
    if (!nextMonth || !nextYear) return;
    onChange(`${nextYear}-${nextMonth}`);
  };

  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.monthYearGrid}>
        <select
          value={month}
          disabled={disabled}
          aria-label={`${label} - tháng`}
          onChange={(event) => update(event.target.value, year)}
        >
          <option value="">Chọn tháng</option>
          {MONTHS.map((name, index) => (
            <option value={String(index + 1).padStart(2, "0")} key={name}>{name}</option>
          ))}
        </select>
        <select
          value={year}
          disabled={disabled}
          aria-label={`${label} - năm`}
          onChange={(event) => update(month, event.target.value)}
        >
          <option value="">Chọn năm</option>
          {years.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
      </div>
    </label>
  );
};

export default MonthYearField;
