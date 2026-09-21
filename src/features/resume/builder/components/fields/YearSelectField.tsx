import styles from "../ResumeEditor.module.css";

interface YearSelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
}

const YearSelectField = ({
  label,
  value,
  onChange,
  disabled = false,
  minYear = 1950,
  maxYear = new Date().getFullYear() + 8,
}: YearSelectFieldProps) => {
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => String(maxYear - index));
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <select
        className={styles.nativeSelect}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Chọn năm</option>
        {years.map((year) => <option value={year} key={year}>{year}</option>)}
      </select>
    </label>
  );
};

export default YearSelectField;
