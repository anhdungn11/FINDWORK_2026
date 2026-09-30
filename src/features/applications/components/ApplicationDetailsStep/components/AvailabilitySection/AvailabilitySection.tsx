import type {
  ApplicationDetailsForm,
} from "@/features/applications/types/application.types";

import styles from "./AvailabilitySection.module.css";

interface AvailabilitySectionProps {
  availability:
    ApplicationDetailsForm["availability"];

  error?: string;

  onChange: (
    value:
      ApplicationDetailsForm["availability"],
  ) => void;
}

const AvailabilitySection = ({
  availability,
  error,
  onChange,
}: AvailabilitySectionProps) => {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h3>Khả năng bắt đầu công việc</h3>

        <p>
          Thông tin này giúp nhà tuyển dụng chủ động
          hơn trong quá trình trao đổi.
        </p>
      </header>

      <label className={styles.field}>
        <span>
          Thời gian có thể bắt đầu
          <strong>*</strong>
        </span>

        <select
          value={availability}
          aria-invalid={Boolean(error)}
          onChange={(event) =>
            onChange(
              event.target
                .value as ApplicationDetailsForm["availability"],
            )
          }
        >
          <option value="">
            Chọn thời gian
          </option>

          <option value="immediately">
            Có thể bắt đầu ngay
          </option>

          <option value="within-1-week">
            Trong vòng 1 tuần
          </option>

          <option value="within-2-weeks">
            Trong vòng 2 tuần
          </option>

          <option value="within-1-month">
            Trong vòng 1 tháng
          </option>

          <option value="negotiable">
            Có thể thương lượng
          </option>
        </select>

        {error && (
          <small className={styles.error}>
            {error}
          </small>
        )}
      </label>
    </section>
  );
};

export default AvailabilitySection;