import type { ChangeEvent } from "react";

import type {
  PersonalInfo,
} from "@/features/candidate/types/onboarding.types";

import type {
  UpdatePersonalInfoField,
} from "../types/personal-info.types";

import SectionHeader from "./SectionHeader";

import styles from "../PersonalInfoStep.module.css";

interface BioSectionProps {
  value: PersonalInfo;
  updateField: UpdatePersonalInfoField;
}

const BioSection = ({
  value,
  updateField,
}: BioSectionProps) => {
  return (
    <section>
      <SectionHeader
        eyebrow="GIỚI THIỆU"
        title="Giới thiệu bản thân"
        description="Một đoạn ngắn về định hướng, thế mạnh hoặc mục tiêu nghề nghiệp của bạn."
      />

      <div className={styles.field}>
        <label htmlFor="bio">
          Mô tả ngắn
        </label>

        <textarea
          id="bio"
          rows={5}
          maxLength={500}
          value={value.bio}
          placeholder="Ví dụ: Tôi là sinh viên CNTT định hướng Frontend Development..."
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            updateField(
              "bio",
              event.target.value,
            )
          }
        />

        <div className={styles.textareaFooter}>
          <small>
            Không chia sẻ thông tin nhạy cảm ở đây.
          </small>

          <span>
            {value.bio.length}/500
          </span>
        </div>
      </div>
    </section>
  );
};

export default BioSection;
