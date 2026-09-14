import styles from "../styles/AdvancedFilterFields.module.css";

interface JobFilterSelectProps {
  label: string;
  value: string;
  placeholder: string;
  options: string[];

  onChange: (
    value: string,
  ) => void;
}

const JobFilterSelect = ({
  label,
  value,
  placeholder,
  options,
  onChange,
}: JobFilterSelectProps) => {
  return (
    <label className={styles.filterField}>
      <span>{label}</span>

      <div className={styles.selectWrapper}>
        <select
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
        >
          <option value="">
            {placeholder}
          </option>

          {options.map((option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
};

export default JobFilterSelect;
