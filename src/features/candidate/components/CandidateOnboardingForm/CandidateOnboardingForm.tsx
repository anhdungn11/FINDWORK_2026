import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./CandidateOnboardingForm.module.css";

type OnboardingStep =
  | "basic"
  | "career"
  | "skills"
  | "privacy";

interface OnboardingData {
  fullName: string;
  phone: string;
  location: string;

  employmentStatus: string;
  desiredPosition: string;
  desiredLocation: string;
  workType: string;
  expectedSalary: string;

  skills: string[];

  searchableProfile: boolean;
  showEmail: boolean;
  showPhone: boolean;
  allowCvDownload: boolean;
  allowMatching: boolean;
}

const steps: {
  id: OnboardingStep;
  label: string;
  description: string;
}[] = [
  {
    id: "basic",
    label: "Thông tin cơ bản",
    description: "Thông tin liên hệ và khu vực hiện tại",
  },
  {
    id: "career",
    label: "Định hướng nghề nghiệp",
    description: "Mục tiêu và loại công việc bạn đang tìm",
  },
  {
    id: "skills",
    label: "Kỹ năng",
    description: "Những kỹ năng nổi bật của bạn",
  },
  {
    id: "privacy",
    label: "Quyền riêng tư",
    description: "Kiểm soát dữ liệu được chia sẻ",
  },
];

const initialData: OnboardingData = {
  fullName: "",
  phone: "",
  location: "",

  employmentStatus: "",
  desiredPosition: "",
  desiredLocation: "",
  workType: "",
  expectedSalary: "",

  skills: [],

  searchableProfile: true,
  showEmail: false,
  showPhone: false,
  allowCvDownload: false,
  allowMatching: true,
};

const CandidateOnboardingForm = () => {
  const navigate = useNavigate();

  const [currentStepIndex, setCurrentStepIndex] =
    useState(0);

  const [data, setData] =
    useState<OnboardingData>(initialData);

  const [skillInput, setSkillInput] =
    useState("");

  const currentStep =
    steps[currentStepIndex];

  const progress = useMemo(() => {
    return Math.round(
      ((currentStepIndex + 1) / steps.length) * 100,
    );
  }, [currentStepIndex]);

  const updateField = <
    Key extends keyof OnboardingData,
  >(
    key: Key,
    value: OnboardingData[Key],
  ) => {
    setData((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleNext = () => {
    if (
      currentStepIndex <
      steps.length - 1
    ) {
      setCurrentStepIndex(
        (current) => current + 1,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    // Frontend mock.
    // Sau này gọi API cập nhật CandidateProfile.
    console.log("Candidate onboarding:", data);

    navigate("/candidate");
  };

  const handlePrevious = () => {
    if (currentStepIndex === 0) {
      return;
    }

    setCurrentStepIndex(
      (current) => current - 1,
    );
  };

  const addSkill = () => {
    const normalizedSkill =
      skillInput.trim();

    if (!normalizedSkill) {
      return;
    }

    const alreadyExists =
      data.skills.some(
        (skill) =>
          skill.toLowerCase() ===
          normalizedSkill.toLowerCase(),
      );

    if (alreadyExists) {
      setSkillInput("");
      return;
    }

    updateField("skills", [
      ...data.skills,
      normalizedSkill,
    ]);

    setSkillInput("");
  };

  const removeSkill = (
    skillToRemove: string,
  ) => {
    updateField(
      "skills",
      data.skills.filter(
        (skill) =>
          skill !== skillToRemove,
      ),
    );
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.eyebrow}>
            THIẾT LẬP HỒ SƠ
          </span>

          <h1>
            Hoàn thiện hồ sơ nghề nghiệp
          </h1>

          <p>
            Một vài thông tin ban đầu giúp
            FINDWORK cá nhân hóa trải nghiệm
            của bạn tốt hơn.
          </p>
        </div>

        <div className={styles.progressBlock}>
          <div className={styles.progressHeader}>
            <span>Tiến độ</span>
            <strong>{progress}%</strong>
          </div>

          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        <nav className={styles.steps}>
          {steps.map((step, index) => {
            const isActive =
              index === currentStepIndex;

            const isCompleted =
              index < currentStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                className={`${styles.step} ${
                  isActive
                    ? styles.stepActive
                    : ""
                } ${
                  isCompleted
                    ? styles.stepCompleted
                    : ""
                }`}
                onClick={() => {
                  if (
                    index <= currentStepIndex
                  ) {
                    setCurrentStepIndex(index);
                  }
                }}
              >
                <span className={styles.stepNumber}>
                  {isCompleted
                    ? "✓"
                    : index + 1}
                </span>

                <span>
                  <strong>
                    {step.label}
                  </strong>

                  <small>
                    {step.description}
                  </small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className={styles.privacyHint}>
          <span className={styles.privacyIcon}>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 3 5 6v5c0 4.6 2.9 8.3 7 10 4.1-1.7 7-5.4 7-10V6l-7-3Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </span>

          <p>
            Thông tin của bạn không tự động
            được công khai cho nhà tuyển dụng.
          </p>
        </div>
      </aside>

      <section className={styles.formSection}>
        <div className={styles.formHeader}>
          <span>
            Bước {currentStepIndex + 1} /{" "}
            {steps.length}
          </span>

          <h2>{currentStep.label}</h2>

          <p>
            {currentStep.description}
          </p>
        </div>

        <div className={styles.formCard}>
          {currentStep.id === "basic" && (
            <BasicStep
              data={data}
              updateField={updateField}
            />
          )}

          {currentStep.id === "career" && (
            <CareerStep
              data={data}
              updateField={updateField}
            />
          )}

          {currentStep.id === "skills" && (
            <SkillsStep
              skills={data.skills}
              skillInput={skillInput}
              setSkillInput={setSkillInput}
              addSkill={addSkill}
              removeSkill={removeSkill}
            />
          )}

          {currentStep.id === "privacy" && (
            <PrivacyStep
              data={data}
              updateField={updateField}
            />
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={currentStepIndex === 0}
              onClick={handlePrevious}
            >
              Quay lại
            </button>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleNext}
            >
              {currentStepIndex ===
              steps.length - 1
                ? "Hoàn tất hồ sơ"
                : "Tiếp tục"}

              <span>→</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

interface StepProps {
  data: OnboardingData;

  updateField: <
    Key extends keyof OnboardingData,
  >(
    key: Key,
    value: OnboardingData[Key],
  ) => void;
}

const BasicStep = ({
  data,
  updateField,
}: StepProps) => {
  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor="fullName">
          Họ và tên
        </label>

        <input
          id="fullName"
          value={data.fullName}
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
        <label htmlFor="phone">
          Số điện thoại
        </label>

        <input
          id="phone"
          type="tel"
          value={data.phone}
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
        <label htmlFor="location">
          Khu vực hiện tại
        </label>

        <select
          id="location"
          value={data.location}
          onChange={(event) =>
            updateField(
              "location",
              event.target.value,
            )
          }
        >
          <option value="">
            Chọn khu vực
          </option>

          <option value="Ho Chi Minh City">
            Ho Chi Minh City
          </option>

          <option value="Binh Duong">
            Binh Duong
          </option>

          <option value="Dong Nai">
            Dong Nai
          </option>

          <option value="Ha Noi">
            Ha Noi
          </option>
        </select>
      </div>

      <div className={styles.notice}>
        <strong>
          Vì sao FINDWORK cần thông tin này?
        </strong>

        <p>
          Thông tin liên hệ phục vụ hồ sơ và
          quá trình ứng tuyển. Bạn có thể kiểm
          soát việc chia sẻ ở bước Quyền riêng tư.
        </p>
      </div>
    </div>
  );
};

const CareerStep = ({
  data,
  updateField,
}: StepProps) => {
  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor="employmentStatus">
          Trạng thái hiện tại
        </label>

        <select
          id="employmentStatus"
          value={data.employmentStatus}
          onChange={(event) =>
            updateField(
              "employmentStatus",
              event.target.value,
            )
          }
        >
          <option value="">
            Chọn trạng thái
          </option>

          <option value="student">
            Sinh viên
          </option>

          <option value="looking">
            Đang tìm việc
          </option>

          <option value="employed">
            Đang đi làm
          </option>

          <option value="freelancer">
            Freelancer
          </option>
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="desiredPosition">
          Vị trí mong muốn
        </label>

        <input
          id="desiredPosition"
          value={data.desiredPosition}
          placeholder="Ví dụ: Frontend Developer"
          onChange={(event) =>
            updateField(
              "desiredPosition",
              event.target.value,
            )
          }
        />
      </div>

      <div className={styles.twoColumns}>
        <div className={styles.field}>
          <label htmlFor="desiredLocation">
            Khu vực mong muốn
          </label>

          <select
            id="desiredLocation"
            value={data.desiredLocation}
            onChange={(event) =>
              updateField(
                "desiredLocation",
                event.target.value,
              )
            }
          >
            <option value="">
              Chọn khu vực
            </option>

            <option value="Ho Chi Minh City">
              Ho Chi Minh City
            </option>

            <option value="Binh Duong">
              Binh Duong
            </option>

            <option value="Ha Noi">
              Ha Noi
            </option>

            <option value="Remote">
              Remote
            </option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="workType">
            Hình thức làm việc
          </label>

          <select
            id="workType"
            value={data.workType}
            onChange={(event) =>
              updateField(
                "workType",
                event.target.value,
              )
            }
          >
            <option value="">
              Chọn hình thức
            </option>

            <option value="Full-time">
              Full-time
            </option>

            <option value="Part-time">
              Part-time
            </option>

            <option value="Internship">
              Internship
            </option>

            <option value="Freelance">
              Freelance
            </option>
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="expectedSalary">
          Mức lương mong muốn
        </label>

        <input
          id="expectedSalary"
          value={data.expectedSalary}
          placeholder="Ví dụ: 15 - 20 triệu"
          onChange={(event) =>
            updateField(
              "expectedSalary",
              event.target.value,
            )
          }
        />
      </div>
    </div>
  );
};

interface SkillsStepProps {
  skills: string[];
  skillInput: string;
  setSkillInput: (value: string) => void;
  addSkill: () => void;
  removeSkill: (skill: string) => void;
}

const SkillsStep = ({
  skills,
  skillInput,
  setSkillInput,
  addSkill,
  removeSkill,
}: SkillsStepProps) => {
  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor="skill">
          Thêm kỹ năng
        </label>

        <div className={styles.skillInput}>
          <input
            id="skill"
            value={skillInput}
            placeholder="React, English, Excel..."
            onChange={(event) =>
              setSkillInput(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addSkill();
              }
            }}
          />

          <button
            type="button"
            onClick={addSkill}
          >
            Thêm
          </button>
        </div>
      </div>

      {skills.length > 0 ? (
        <div className={styles.skillList}>
          {skills.map((skill) => (
            <span
              key={skill}
              className={styles.skillChip}
            >
              {skill}

              <button
                type="button"
                aria-label={`Xóa ${skill}`}
                onClick={() =>
                  removeSkill(skill)
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.emptySkills}>
          <p>
            Bạn chưa thêm kỹ năng nào.
          </p>

          <span>
            Có thể bổ sung sau trong hồ sơ.
          </span>
        </div>
      )}
    </div>
  );
};

const PrivacyStep = ({
  data,
  updateField,
}: StepProps) => {
  return (
    <div className={styles.privacyList}>
      <PrivacyToggle
        title="Cho phép nhà tuyển dụng tìm thấy hồ sơ"
        description="Hồ sơ có thể xuất hiện trong kết quả tìm kiếm ứng viên khi tính năng tuyển dụng được kích hoạt."
        checked={data.searchableProfile}
        onChange={(value) =>
          updateField(
            "searchableProfile",
            value,
          )
        }
      />

      <PrivacyToggle
        title="Hiển thị email liên hệ"
        description="Nhà tuyển dụng có thể xem email khi bạn cho phép."
        checked={data.showEmail}
        onChange={(value) =>
          updateField(
            "showEmail",
            value,
          )
        }
      />

      <PrivacyToggle
        title="Hiển thị số điện thoại"
        description="Số điện thoại mặc định được giữ riêng tư."
        checked={data.showPhone}
        onChange={(value) =>
          updateField(
            "showPhone",
            value,
          )
        }
      />

      <PrivacyToggle
        title="Cho phép tải CV"
        description="Nhà tuyển dụng chỉ có thể tải CV khi bạn bật quyền này hoặc gửi CV qua đơn ứng tuyển."
        checked={data.allowCvDownload}
        onChange={(value) =>
          updateField(
            "allowCvDownload",
            value,
          )
        }
      />

      <PrivacyToggle
        title="Cho phép FINDWORK cá nhân hóa gợi ý việc làm"
        description="Dùng dữ liệu nghề nghiệp để cải thiện kết quả tìm kiếm và mức độ phù hợp."
        checked={data.allowMatching}
        onChange={(value) =>
          updateField(
            "allowMatching",
            value,
          )
        }
      />

      <div className={styles.privacyNotice}>
        <strong>
          Bạn luôn có quyền thay đổi lựa chọn.
        </strong>

        <p>
          Các cài đặt này sẽ có thể chỉnh sửa lại
          trong Candidate Profile → Quyền riêng tư.
        </p>
      </div>
    </div>
  );
};

interface PrivacyToggleProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

const PrivacyToggle = ({
  title,
  description,
  checked,
  onChange,
}: PrivacyToggleProps) => {
  return (
    <div className={styles.privacyItem}>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <label className={styles.switch}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onChange(
              event.target.checked,
            )
          }
        />

        <span />
      </label>
    </div>
  );
};

export default CandidateOnboardingForm;