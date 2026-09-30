import type {
  ApplicationContactMethod,
} from "@/features/applications/types/application.types";

import styles from "./PreferredContactSection.module.css";

interface PreferredContactSectionProps {
  value: ApplicationContactMethod;

  onChange: (
    value: ApplicationContactMethod,
  ) => void;
}

const PreferredContactSection = ({
  value,
  onChange,
}: PreferredContactSectionProps) => {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h3>
          Phương thức liên hệ ưu tiên
        </h3>

        <p>
          Chọn cách bạn muốn nhà tuyển dụng ưu tiên
          liên hệ.
        </p>
      </header>

      <div className={styles.grid}>
        <label
          className={`${styles.card} ${
            value === "email"
              ? styles.active
              : ""
          }`}
        >
          <input
            type="radio"
            name="preferred-contact"
            checked={value === "email"}
            onChange={() =>
              onChange("email")
            }
          />

          <div>
            <strong>Email</strong>

            <span>
              Nhận thông tin và lịch hẹn qua email
            </span>
          </div>
        </label>

        <label
          className={`${styles.card} ${
            value === "phone"
              ? styles.active
              : ""
          }`}
        >
          <input
            type="radio"
            name="preferred-contact"
            checked={value === "phone"}
            onChange={() =>
              onChange("phone")
            }
          />

          <div>
            <strong>Điện thoại</strong>

            <span>
              Ưu tiên trao đổi trực tiếp qua số điện thoại
            </span>
          </div>
        </label>
      </div>
    </section>
  );
};

export default PreferredContactSection;