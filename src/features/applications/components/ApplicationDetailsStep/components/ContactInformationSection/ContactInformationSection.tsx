import type {
  ApplicationContactInfo,
  ApplicationDetailsErrors,
} from "@/features/applications/types/application.types";

import styles from "./ContactInformationSection.module.css";

interface ContactInformationSectionProps {
  contact: ApplicationContactInfo;
  currentLocation: string;

  errors: Pick<
    ApplicationDetailsErrors,
    "fullName" | "email" | "phone"
  >;

  onContactChange: <
    Key extends keyof ApplicationContactInfo,
  >(
    field: Key,
    value: ApplicationContactInfo[Key],
  ) => void;

  onLocationChange: (
    value: string,
  ) => void;
}

const ContactInformationSection = ({
  contact,
  currentLocation,
  errors,
  onContactChange,
  onLocationChange,
}: ContactInformationSectionProps) => {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h3>Thông tin liên hệ</h3>

        <p>
          Nhà tuyển dụng sẽ sử dụng các thông tin này
          để liên hệ với bạn.
        </p>
      </header>

      <div className={styles.grid}>
        <label className={styles.fullWidth}>
          <span className={styles.label}>
            Họ và tên
            <strong>*</strong>
          </span>

          <input
            type="text"
            value={contact.fullName}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            aria-invalid={Boolean(
              errors.fullName,
            )}
            onChange={(event) =>
              onContactChange(
                "fullName",
                event.target.value,
              )
            }
          />

          {errors.fullName && (
            <small className={styles.error}>
              {errors.fullName}
            </small>
          )}
        </label>

        <label>
          <span className={styles.label}>
            Email
            <strong>*</strong>
          </span>

          <input
            type="email"
            value={contact.email}
            placeholder="email@example.com"
            autoComplete="email"
            aria-invalid={Boolean(
              errors.email,
            )}
            onChange={(event) =>
              onContactChange(
                "email",
                event.target.value,
              )
            }
          />

          {errors.email && (
            <small className={styles.error}>
              {errors.email}
            </small>
          )}
        </label>

        <label>
          <span className={styles.label}>
            Số điện thoại
            <strong>*</strong>
          </span>

          <input
            type="tel"
            value={contact.phone}
            placeholder="0901 234 567"
            autoComplete="tel"
            aria-invalid={Boolean(
              errors.phone,
            )}
            onChange={(event) =>
              onContactChange(
                "phone",
                event.target.value,
              )
            }
          />

          {errors.phone && (
            <small className={styles.error}>
              {errors.phone}
            </small>
          )}
        </label>

        <label className={styles.fullWidth}>
          <span className={styles.label}>
            Khu vực hiện tại
          </span>

          <input
            type="text"
            value={currentLocation}
            placeholder="Ví dụ: TP. Hồ Chí Minh"
            autoComplete="address-level1"
            onChange={(event) =>
              onLocationChange(
                event.target.value,
              )
            }
          />
        </label>
      </div>
    </section>
  );
};

export default ContactInformationSection;