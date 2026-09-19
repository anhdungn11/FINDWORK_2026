import type {
  KeyboardEvent,
} from "react";

import {
  MAX_DESIRED_POSITIONS,
} from "../utils/career-preferences.constants";

import styles from "../styles/PreferenceField.module.css";

interface DesiredPositionsFieldProps {
  positions: string[];
  inputValue: string;
  error: string;
  onInputChange: (
    value: string,
  ) => void;
  onAdd: () => void;
  onRemove: (
    position: string,
  ) => void;
}

const DesiredPositionsField = ({
  positions,
  inputValue,
  error,
  onInputChange,
  onAdd,
  onRemove,
}: DesiredPositionsFieldProps) => {
  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    onAdd();
  };

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>
            VỊ TRÍ MONG MUỐN
          </span>
          <h4>Bạn muốn làm công việc nào?</h4>
        </div>

        <span className={styles.counter}>
          {positions.length}/{MAX_DESIRED_POSITIONS}
        </span>
      </div>

      <p className={styles.helper}>
        Chọn tối đa 3 vị trí chính để FINDWORK ưu tiên các công việc phù hợp hơn.
      </p>

      <div className={styles.inputActionRow}>
        <input
          type="text"
          value={inputValue}
          placeholder="Ví dụ: Backend Developer"
          onChange={(event) =>
            onInputChange(event.target.value)
          }
          onKeyDown={handleKeyDown}
          disabled={
            positions.length >=
            MAX_DESIRED_POSITIONS
          }
        />

        <button
          type="button"
          onClick={onAdd}
          disabled={
            positions.length >=
              MAX_DESIRED_POSITIONS ||
            !inputValue.trim()
          }
        >
          Thêm
        </button>
      </div>

      {error && (
        <p className={styles.error}>
          {error}
        </p>
      )}

      {positions.length > 0 && (
        <div className={styles.chips}>
          {positions.map((position) => (
            <span
              key={position}
              className={styles.chip}
            >
              {position}
              <button
                type="button"
                aria-label={`Xóa ${position}`}
                onClick={() =>
                  onRemove(position)
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
};

export default DesiredPositionsField;
