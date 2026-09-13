import type { ChangeEvent } from "react";

import type {
  PersonalInfo,
} from "@/features/candidate/types/onboarding.types";

import type {
  UpdatePersonalInfoField,
} from "../types/personal-info.types";

import SectionHeader from "./SectionHeader";

import styles from "../PersonalInfoStep.module.css";

interface BasicInfoSectionProps {
  value: PersonalInfo;
  updateField: UpdatePersonalInfoField;
}

const BasicInfoSection = ({
  value,
  updateField,
}: BasicInfoSectionProps) => {
  return (
    <section>
      <SectionHeader
        eyebrow="THÔNG TIN CƠ BẢN"
        title="Thông tin cá nhân"
        description="Những thông tin dùng để xây dựng hồ sơ ứng viên của bạn."
      />

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="fullName">
            Họ và tên
            <span>*</span>
          </label>

          <input
            id="fullName"
            type="text"
            value={value.fullName}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField(
                "fullName",
                event.target.value,
              )
            }
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="email">
            Email
            <span>*</span>
          </label>

          <input
            id="email"
            type="email"
            value={value.email}
            placeholder="you@example.com"
            autoComplete="email"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField(
                "email",
                event.target.value,
              )
            }
          />

          <small>
            Sau này email này sẽ lấy từ tài khoản
            đã xác minh.
          </small>
        </div>

        <div className={styles.field}>
          <label htmlFor="phone">
            Số điện thoại
            <span>*</span>
          </label>

          <input
            id="phone"
            type="tel"
            value={value.phone}
            placeholder="09xx xxx xxx"
            autoComplete="tel"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField(
                "phone",
                event.target.value,
              )
            }
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="dateOfBirth">
            Ngày sinh
          </label>

          <input
            id="dateOfBirth"
            type="date"
            value={value.dateOfBirth}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField(
                "dateOfBirth",
                event.target.value,
              )
            }
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="gender">
            Giới tính
          </label>

          <select
            id="gender"
            value={value.gender}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              updateField(
                "gender",
                event.target
                  .value as PersonalInfo["gender"],
              )
            }
          >
            <option value="">
              Không muốn cung cấp
            </option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </div>
      </div>
    </section>
  );
};

export default BasicInfoSection;
