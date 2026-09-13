import type { ChangeEvent } from "react";

import type {
  PersonalInfo,
} from "@/features/candidate/types/onboarding.types";

import type {
  PersonalInfoEditorController,
} from "../hooks/usePersonalInfoEditor";

import styles from "../PersonalInfoStep.module.css";

interface AvatarSectionProps {
  value: PersonalInfo;
  editor: PersonalInfoEditorController;
}

const AvatarSection = ({
  value,
  editor,
}: AvatarSectionProps) => {
  return (
    <section className={styles.avatarSection}>
      <div className={styles.avatar}>
        {value.avatarUrl ? (
          <img
            src={value.avatarUrl}
            alt={
              value.fullName ||
              "Ảnh đại diện"
            }
          />
        ) : (
          <span>
            {value.fullName
              ? value.fullName
                  .charAt(0)
                  .toUpperCase()
              : "U"}
          </span>
        )}
      </div>

      <div className={styles.avatarContent}>
        <strong>Ảnh đại diện</strong>

        <p>
          Ảnh rõ khuôn mặt giúp hồ sơ của bạn
          chuyên nghiệp hơn.
        </p>

        <div className={styles.avatarActions}>
          <label className={styles.uploadButton}>
            Tải ảnh lên

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                editor.updateAvatarFromFile(
                  event.target.files?.[0],
                )
              }
            />
          </label>

          {value.avatarUrl && (
            <button
              type="button"
              className={styles.removeAvatar}
              onClick={editor.removeAvatar}
            >
              Xóa ảnh
            </button>
          )}
        </div>

        <span className={styles.avatarHint}>
          PNG, JPG hoặc WebP. Tối đa 5MB khi
          backend được triển khai.
        </span>
      </div>
    </section>
  );
};

export default AvatarSection;
