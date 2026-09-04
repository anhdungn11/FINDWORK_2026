import type {
  PersonalInfo,
} from "@/features/candidate/types/onboarding.types";

import styles from "./PersonalInfoStep.module.css";

interface PersonalInfoStepProps {
  value: PersonalInfo;
  onChange: (value: PersonalInfo) => void;
}

const PersonalInfoStep = ({
  value,
  onChange,
}: PersonalInfoStepProps) => {
  const updateField = <
    Key extends keyof PersonalInfo,
  >(
    key: Key,
    fieldValue: PersonalInfo[Key],
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  return (
    <div className={styles.wrapper}>
      {/* AVATAR */}
      <section className={styles.avatarSection}>
        <div className={styles.avatar}>
          {value.avatarUrl ? (
            <img
              src={value.avatarUrl}
              alt={value.fullName || "Ảnh đại diện"}
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
                onChange={(event) => {
                  const file =
                    event.target.files?.[0];

                  if (!file) {
                    return;
                  }

                  const previewUrl =
                    URL.createObjectURL(file);

                  updateField(
                    "avatarUrl",
                    previewUrl,
                  );
                }}
              />
            </label>

            {value.avatarUrl && (
              <button
                type="button"
                className={styles.removeAvatar}
                onClick={() =>
                  updateField("avatarUrl", "")
                }
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

      <div className={styles.divider} />

      {/* IDENTITY */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>
              THÔNG TIN CƠ BẢN
            </span>

            <h3>Thông tin cá nhân</h3>

            <p>
              Những thông tin dùng để xây dựng hồ sơ
              ứng viên của bạn.
            </p>
          </div>
        </div>

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
              onChange={(event) =>
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
              onChange={(event) =>
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
              onChange={(event) =>
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
              onChange={(event) =>
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
              onChange={(event) =>
                updateField(
                  "gender",
                  event.target.value,
                )
              }
            >
              <option value="">
                Không muốn cung cấp
              </option>

              <option value="male">
                Nam
              </option>

              <option value="female">
                Nữ
              </option>

              <option value="other">
                Khác
              </option>
            </select>
          </div>
        </div>
      </section>

      <div className={styles.divider} />

      {/* LOCATION */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>
              KHU VỰC
            </span>

            <h3>Địa chỉ hiện tại</h3>

            <p>
              FINDWORK sử dụng khu vực để ưu tiên
              các cơ hội phù hợp gần bạn.
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="province">
              Tỉnh / Thành phố
              <span>*</span>
            </label>

            <select
              id="province"
              value={value.province}
              onChange={(event) => {
                updateField(
                  "province",
                  event.target.value,
                );

                updateField(
                  "district",
                  "",
                );
              }}
            >
              <option value="">
                Chọn tỉnh / thành phố
              </option>

              <option value="Binh Duong">
                Bình Dương
              </option>

              <option value="Ho Chi Minh City">
                TP. Hồ Chí Minh
              </option>

              <option value="Ha Noi">
                Hà Nội
              </option>

              <option value="Dong Nai">
                Đồng Nai
              </option>
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="district">
              Quận / Huyện / Thành phố
            </label>

            <input
              id="district"
              type="text"
              value={value.district}
              placeholder="Ví dụ: Thủ Dầu Một"
              onChange={(event) =>
                updateField(
                  "district",
                  event.target.value,
                )
              }
            />
          </div>

          <div
            className={`${styles.field} ${styles.fullWidth}`}
          >
            <label htmlFor="address">
              Địa chỉ
            </label>

            <input
              id="address"
              type="text"
              value={value.address}
              placeholder="Phường, đường hoặc khu vực sinh sống"
              autoComplete="street-address"
              onChange={(event) =>
                updateField(
                  "address",
                  event.target.value,
                )
              }
            />

            <small>
              Không bắt buộc nhập số nhà cụ thể.
            </small>
          </div>
        </div>
      </section>

      <div className={styles.divider} />

      {/* BIO */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>
              GIỚI THIỆU
            </span>

            <h3>Giới thiệu bản thân</h3>

            <p>
              Một đoạn ngắn về định hướng, thế mạnh
              hoặc mục tiêu nghề nghiệp của bạn.
            </p>
          </div>
        </div>

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
            onChange={(event) =>
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

      <div className={styles.securityNotice}>
        <div className={styles.securityIcon}>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 3 5 6v5c0 4.6 2.9 8.3 7 10 4.1-1.7 7-5.4 7-10V6l-7-3Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />

            <path
              d="m9 12 2 2 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div>
          <strong>
            Kiểm soát quyền riêng tư
          </strong>

          <p>
            Email, số điện thoại và địa chỉ không mặc
            định công khai cho nhà tuyển dụng. Bạn sẽ
            quyết định quyền chia sẻ ở bước cuối.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoStep;