import {
  useState,
} from "react";

import type {
  ExperienceItem,
} from "@/features/candidate/types/onboarding.types";

import styles from "./ExperienceStep.module.css";

interface ExperienceStepProps {
  value: ExperienceItem[];
  onChange: (
    value: ExperienceItem[],
  ) => void;
}

const MONTHS = Array.from(
  {
    length: 12,
  },
  (_, index) =>
    String(index + 1),
);

const createExperienceItem =
  (): ExperienceItem => ({
    id: crypto.randomUUID(),

    company: "",
    position: "",

    employmentType: "",
    workplaceType: "",

    location: "",

    startMonth: "",
    startYear: "",

    endMonth: "",
    endYear: "",

    isCurrent: false,

    description: "",
    achievements: "",

    skillsUsed: [],
  });

const getEmploymentTypeLabel = (
  type: ExperienceItem["employmentType"],
) => {
  const labels: Record<
    Exclude<
      ExperienceItem["employmentType"],
      ""
    >,
    string
  > = {
    "full-time": "Toàn thời gian",
    "part-time": "Bán thời gian",
    internship: "Thực tập",
    contract: "Hợp đồng",
    freelance: "Freelance",
    temporary: "Tạm thời",
    volunteer: "Tình nguyện",
  };

  if (!type) {
    return "Chưa cập nhật loại công việc";
  }

  return labels[type];
};

const getWorkplaceLabel = (
  workplace: ExperienceItem["workplaceType"],
) => {
  const labels: Record<
    Exclude<
      ExperienceItem["workplaceType"],
      ""
    >,
    string
  > = {
    onsite: "Tại văn phòng",
    hybrid: "Hybrid",
    remote: "Remote",
  };

  if (!workplace) {
    return "";
  }

  return labels[workplace];
};

const getPeriodLabel = (
  experience: ExperienceItem,
) => {
  const start =
    experience.startYear
      ? experience.startMonth
        ? `${experience.startMonth}/${experience.startYear}`
        : experience.startYear
      : "";

  const end =
    experience.isCurrent
      ? "Hiện tại"
      : experience.endYear
        ? experience.endMonth
          ? `${experience.endMonth}/${experience.endYear}`
          : experience.endYear
        : "";

  if (!start && !end) {
    return "Chưa cập nhật thời gian";
  }

  return `${start || "—"} – ${end || "—"}`;
};

const ExperienceStep = ({
  value,
  onChange,
}: ExperienceStepProps) => {
  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null,
  );

  const [
    skillInput,
    setSkillInput,
  ] = useState("");

  const addExperience = () => {
    const newExperience =
      createExperienceItem();

    onChange([
      ...value,
      newExperience,
    ]);

    setEditingId(
      newExperience.id,
    );

    setSkillInput("");
  };

  const updateExperience = <
    Key extends keyof ExperienceItem,
  >(
    id: string,
    key: Key,
    fieldValue: ExperienceItem[Key],
  ) => {
    onChange(
      value.map(
        (experience) =>
          experience.id === id
            ? {
                ...experience,
                [key]: fieldValue,
              }
            : experience,
      ),
    );
  };

  const removeExperience = (
    id: string,
  ) => {
    onChange(
      value.filter(
        (experience) =>
          experience.id !== id,
      ),
    );

    if (editingId === id) {
      setEditingId(null);
      setSkillInput("");
    }
  };

  const handleCurrentChange = (
    experience: ExperienceItem,
    checked: boolean,
  ) => {
    onChange(
      value.map((item) => {
        if (
          item.id !== experience.id
        ) {
          return item;
        }

        return {
          ...item,

          isCurrent: checked,

          endMonth: checked
            ? ""
            : item.endMonth,

          endYear: checked
            ? ""
            : item.endYear,
        };
      }),
    );
  };

  const addSkill = (
    experience: ExperienceItem,
  ) => {
    const skill =
      skillInput.trim();

    if (!skill) {
      return;
    }

    const alreadyExists =
      experience.skillsUsed.some(
        (currentSkill) =>
          currentSkill.toLowerCase() ===
          skill.toLowerCase(),
      );

    if (alreadyExists) {
      setSkillInput("");
      return;
    }

    updateExperience(
      experience.id,
      "skillsUsed",
      [
        ...experience.skillsUsed,
        skill,
      ],
    );

    setSkillInput("");
  };

  const removeSkill = (
    experience: ExperienceItem,
    skill: string,
  ) => {
    updateExperience(
      experience.id,
      "skillsUsed",
      experience.skillsUsed.filter(
        (currentSkill) =>
          currentSkill !== skill,
      ),
    );
  };

  const canComplete = (
    experience: ExperienceItem,
  ) => {
    return Boolean(
      experience.company.trim() &&
        experience.position.trim() &&
        experience.employmentType &&
        experience.startYear,
    );
  };

  return (
    <div
      className={
        styles.wrapper
      }
    >
      {/* HEADER */}

      <div
        className={
          styles.intro
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            KINH NGHIỆM
          </span>

          <h3>
            Quá trình làm việc
          </h3>

          <p>
            Thêm những công việc,
            kỳ thực tập, freelance
            hoặc hoạt động thực tế
            có giá trị cho hồ sơ
            nghề nghiệp.
          </p>
        </div>

        {value.length > 0 && (
          <button
            type="button"
            className={
              styles.addButton
            }
            onClick={
              addExperience
            }
          >
            <span>+</span>

            Thêm kinh nghiệm
          </button>
        )}
      </div>

      {/* EMPTY */}

      {value.length === 0 && (
        <div
          className={
            styles.emptyState
          }
        >
          <div
            className={
              styles.emptyIcon
            }
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="7"
                width="16"
                height="12"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />

              <path
                d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16M10 12v2h4v-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h4>
            Chưa có kinh nghiệm
            làm việc
          </h4>

          <p>
            Nếu bạn từng thực tập,
            làm part-time, freelance,
            dự án thực tế hoặc công
            việc chính thức, hãy thêm
            vào đây.
          </p>

          <button
            type="button"
            onClick={
              addExperience
            }
          >
            + Thêm kinh nghiệm
            đầu tiên
          </button>

          <span
            className={
              styles.skipHint
            }
          >
            Chưa từng làm việc?
            Bạn có thể bỏ qua bước
            này và bổ sung sau.
          </span>
        </div>
      )}

      {/* LIST */}

      {value.length > 0 && (
        <div
          className={
            styles.experienceList
          }
        >
          {value.map(
            (
              experience,
              index,
            ) => {
              const isEditing =
                editingId ===
                experience.id;

              const workplaceLabel =
                getWorkplaceLabel(
                  experience.workplaceType,
                );

              return (
                <article
                  key={
                    experience.id
                  }
                  className={
                    styles.experienceCard
                  }
                >
                  {/* SUMMARY HEADER */}

                  <div
                    className={
                      styles.cardHeader
                    }
                  >
                    <div
                      className={
                        styles.cardIdentity
                      }
                    >
                      <span
                        className={
                          styles.itemNumber
                        }
                      >
                        KINH NGHIỆM{" "}
                        {index + 1}
                      </span>

                      <h4>
                        {experience.position ||
                          "Thông tin công việc"}
                      </h4>

                      <strong
                        className={
                          styles.companyName
                        }
                      >
                        {experience.company ||
                          "Chưa cập nhật công ty"}
                      </strong>

                      {!isEditing && (
                        <div
                          className={
                            styles.summary
                          }
                        >
                          <p
                            className={
                              styles.summaryPrimary
                            }
                          >
                            {getEmploymentTypeLabel(
                              experience.employmentType,
                            )}

                            {workplaceLabel &&
                              ` · ${workplaceLabel}`}
                          </p>

                          <p>
                            {getPeriodLabel(
                              experience,
                            )}

                            {experience.location &&
                              ` · ${experience.location}`}
                          </p>

                          {experience.skillsUsed
                            .length >
                            0 && (
                            <div
                              className={
                                styles.summarySkills
                              }
                            >
                              {experience.skillsUsed
                                .slice(
                                  0,
                                  5,
                                )
                                .map(
                                  (
                                    skill,
                                  ) => (
                                    <span
                                      key={
                                        skill
                                      }
                                    >
                                      {
                                        skill
                                      }
                                    </span>
                                  ),
                                )}

                              {experience
                                .skillsUsed
                                .length >
                                5 && (
                                <span>
                                  +
                                  {experience
                                    .skillsUsed
                                    .length -
                                    5}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className={
                        styles.cardActions
                      }
                    >
                      {!isEditing && (
                        <button
                          type="button"
                          className={
                            styles.editButton
                          }
                          onClick={() => {
                            setEditingId(
                              experience.id,
                            );

                            setSkillInput(
                              "",
                            );
                          }}
                        >
                          Sửa
                        </button>
                      )}

                      <button
                        type="button"
                        className={
                          styles.removeButton
                        }
                        onClick={() =>
                          removeExperience(
                            experience.id,
                          )
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* FORM */}

                  {isEditing && (
                    <div
                      className={
                        styles.formArea
                      }
                    >
                      {/* JOB INFO */}

                      <section
                        className={
                          styles.sectionBlock
                        }
                      >
                        <div
                          className={
                            styles.sectionTitle
                          }
                        >
                          <span>
                            THÔNG TIN
                            CÔNG VIỆC
                          </span>

                          <h5>
                            Vai trò &
                            doanh nghiệp
                          </h5>
                        </div>

                        <div
                          className={
                            styles.grid
                          }
                        >
                          <div
                            className={
                              styles.field
                            }
                          >
                            <label
                              htmlFor={`position-${experience.id}`}
                            >
                              Chức danh
                              <span>
                                *
                              </span>
                            </label>

                            <input
                              id={`position-${experience.id}`}
                              type="text"
                              value={
                                experience.position
                              }
                              placeholder="Ví dụ: Frontend Developer"
                              onChange={(
                                event,
                              ) =>
                                updateExperience(
                                  experience.id,
                                  "position",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </div>

                          <div
                            className={
                              styles.field
                            }
                          >
                            <label
                              htmlFor={`company-${experience.id}`}
                            >
                              Công ty /
                              Tổ chức
                              <span>
                                *
                              </span>
                            </label>

                            <input
                              id={`company-${experience.id}`}
                              type="text"
                              value={
                                experience.company
                              }
                              placeholder="Ví dụ: FPT Software"
                              onChange={(
                                event,
                              ) =>
                                updateExperience(
                                  experience.id,
                                  "company",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </div>

                          <div
                            className={
                              styles.field
                            }
                          >
                            <label
                              htmlFor={`employmentType-${experience.id}`}
                            >
                              Loại hình
                              công việc
                              <span>
                                *
                              </span>
                            </label>

                            <select
                              id={`employmentType-${experience.id}`}
                              value={
                                experience.employmentType
                              }
                              onChange={(
                                event,
                              ) =>
                                updateExperience(
                                  experience.id,
                                  "employmentType",
                                  event
                                    .target
                                    .value as ExperienceItem["employmentType"],
                                )
                              }
                            >
                              <option value="">
                                Chọn loại
                                công việc
                              </option>

                              <option value="full-time">
                                Toàn thời
                                gian
                              </option>

                              <option value="part-time">
                                Bán thời
                                gian
                              </option>

                              <option value="internship">
                                Thực tập
                              </option>

                              <option value="contract">
                                Hợp đồng
                              </option>

                              <option value="freelance">
                                Freelance
                              </option>

                              <option value="temporary">
                                Tạm thời
                              </option>

                              <option value="volunteer">
                                Tình nguyện
                              </option>
                            </select>
                          </div>

                          <div
                            className={
                              styles.field
                            }
                          >
                            <label
                              htmlFor={`workplace-${experience.id}`}
                            >
                              Hình thức
                              làm việc
                            </label>

                            <select
                              id={`workplace-${experience.id}`}
                              value={
                                experience.workplaceType
                              }
                              onChange={(
                                event,
                              ) =>
                                updateExperience(
                                  experience.id,
                                  "workplaceType",
                                  event
                                    .target
                                    .value as ExperienceItem["workplaceType"],
                                )
                              }
                            >
                              <option value="">
                                Chọn hình
                                thức
                              </option>

                              <option value="onsite">
                                Tại văn
                                phòng
                              </option>

                              <option value="hybrid">
                                Hybrid
                              </option>

                              <option value="remote">
                                Remote
                              </option>
                            </select>
                          </div>

                          <div
                            className={`${styles.field} ${styles.fullWidth}`}
                          >
                            <label
                              htmlFor={`location-${experience.id}`}
                            >
                              Địa điểm
                            </label>

                            <input
                              id={`location-${experience.id}`}
                              type="text"
                              value={
                                experience.location
                              }
                              placeholder="Ví dụ: TP. Hồ Chí Minh"
                              onChange={(
                                event,
                              ) =>
                                updateExperience(
                                  experience.id,
                                  "location",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </div>
                        </div>
                      </section>

                      <div
                        className={
                          styles.sectionDivider
                        }
                      />

                      {/* TIME */}

                      <section
                        className={
                          styles.sectionBlock
                        }
                      >
                        <div
                          className={
                            styles.sectionTitle
                          }
                        >
                          <span>
                            THỜI GIAN
                          </span>

                          <h5>
                            Thời gian
                            làm việc
                          </h5>
                        </div>

                        <div
                          className={
                            styles.dateGrid
                          }
                        >
                          <div
                            className={
                              styles.field
                            }
                          >
                            <label>
                              Tháng bắt
                              đầu
                            </label>

                            <select
                              value={
                                experience.startMonth
                              }
                              onChange={(
                                event,
                              ) =>
                                updateExperience(
                                  experience.id,
                                  "startMonth",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            >
                              <option value="">
                                Tháng
                              </option>

                              {MONTHS.map(
                                (
                                  month,
                                ) => (
                                  <option
                                    key={
                                      month
                                    }
                                    value={
                                      month
                                    }
                                  >
                                    Tháng{" "}
                                    {
                                      month
                                    }
                                  </option>
                                ),
                              )}
                            </select>
                          </div>

                          <div
                            className={
                              styles.field
                            }
                          >
                            <label>
                              Năm bắt
                              đầu
                              <span>
                                *
                              </span>
                            </label>

                            <input
                              type="number"
                              min="1950"
                              max="2100"
                              value={
                                experience.startYear
                              }
                              placeholder="2025"
                              onChange={(
                                event,
                              ) =>
                                updateExperience(
                                  experience.id,
                                  "startYear",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </div>

                          <div
                            className={
                              styles.field
                            }
                          >
                            <label>
                              Tháng kết
                              thúc
                            </label>

                            <select
                              value={
                                experience.endMonth
                              }
                              disabled={
                                experience.isCurrent
                              }
                              onChange={(
                                event,
                              ) =>
                                updateExperience(
                                  experience.id,
                                  "endMonth",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            >
                              <option value="">
                                Tháng
                              </option>

                              {MONTHS.map(
                                (
                                  month,
                                ) => (
                                  <option
                                    key={
                                      month
                                    }
                                    value={
                                      month
                                    }
                                  >
                                    Tháng{" "}
                                    {
                                      month
                                    }
                                  </option>
                                ),
                              )}
                            </select>
                          </div>

                          <div
                            className={
                              styles.field
                            }
                          >
                            <label>
                              Năm kết
                              thúc
                            </label>

                            <input
                              type="number"
                              min="1950"
                              max="2100"
                              value={
                                experience.endYear
                              }
                              placeholder="2026"
                              disabled={
                                experience.isCurrent
                              }
                              onChange={(
                                event,
                              ) =>
                                updateExperience(
                                  experience.id,
                                  "endYear",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </div>
                        </div>

                        <label
                          className={
                            styles.checkboxRow
                          }
                        >
                          <input
                            type="checkbox"
                            checked={
                              experience.isCurrent
                            }
                            onChange={(
                              event,
                            ) =>
                              handleCurrentChange(
                                experience,
                                event
                                  .target
                                  .checked,
                              )
                            }
                          />

                          <span>
                            Tôi hiện đang
                            làm việc tại
                            đây
                          </span>
                        </label>
                      </section>

                      <div
                        className={
                          styles.sectionDivider
                        }
                      />

                      {/* DESCRIPTION */}

                      <section
                        className={
                          styles.sectionBlock
                        }
                      >
                        <div
                          className={
                            styles.sectionTitle
                          }
                        >
                          <span>
                            CÔNG VIỆC
                          </span>

                          <h5>
                            Vai trò &
                            trách nhiệm
                          </h5>
                        </div>

                        <div
                          className={
                            styles.field
                          }
                        >
                          <label
                            htmlFor={`description-${experience.id}`}
                          >
                            Mô tả công
                            việc
                          </label>

                          <textarea
                            id={`description-${experience.id}`}
                            rows={5}
                            maxLength={
                              1500
                            }
                            value={
                              experience.description
                            }
                            placeholder="Mô tả những công việc chính, phạm vi trách nhiệm và đóng góp của bạn..."
                            onChange={(
                              event,
                            ) =>
                              updateExperience(
                                experience.id,
                                "description",
                                event
                                  .target
                                  .value,
                              )
                            }
                          />

                          <div
                            className={
                              styles.fieldFooter
                            }
                          >
                            <small>
                              Ưu tiên mô
                              tả ngắn,
                              rõ và có
                              giá trị
                              nghề nghiệp.
                            </small>

                            <span>
                              {
                                experience
                                  .description
                                  .length
                              }
                              /1500
                            </span>
                          </div>
                        </div>
                      </section>

                      <div
                        className={
                          styles.sectionDivider
                        }
                      />

                      {/* ACHIEVEMENTS */}

                      <section
                        className={
                          styles.sectionBlock
                        }
                      >
                        <div
                          className={
                            styles.sectionTitle
                          }
                        >
                          <span>
                            KẾT QUẢ
                          </span>

                          <h5>
                            Thành tựu nổi
                            bật
                          </h5>
                        </div>

                        <div
                          className={
                            styles.field
                          }
                        >
                          <label
                            htmlFor={`achievements-${experience.id}`}
                          >
                            Thành tựu /
                            Kết quả
                          </label>

                          <textarea
                            id={`achievements-${experience.id}`}
                            rows={4}
                            maxLength={
                              1000
                            }
                            value={
                              experience.achievements
                            }
                            placeholder="Ví dụ: Cải thiện tốc độ tải trang 35%, hoàn thành dự án trước deadline, hỗ trợ 20+ khách hàng..."
                            onChange={(
                              event,
                            ) =>
                              updateExperience(
                                experience.id,
                                "achievements",
                                event
                                  .target
                                  .value,
                              )
                            }
                          />

                          <div
                            className={
                              styles.fieldFooter
                            }
                          >
                            <small>
                              Nếu có thể,
                              sử dụng số
                              liệu cụ thể
                              để tăng độ
                              tin cậy.
                            </small>

                            <span>
                              {
                                experience
                                  .achievements
                                  .length
                              }
                              /1000
                            </span>
                          </div>
                        </div>
                      </section>

                      <div
                        className={
                          styles.sectionDivider
                        }
                      />

                      {/* SKILLS */}

                      <section
                        className={
                          styles.sectionBlock
                        }
                      >
                        <div
                          className={
                            styles.sectionTitle
                          }
                        >
                          <span>
                            KỸ NĂNG ĐÃ
                            SỬ DỤNG
                          </span>

                          <h5>
                            Kỹ năng trong
                            công việc này
                          </h5>
                        </div>

                        <div
                          className={
                            styles.skillComposer
                          }
                        >
                          <input
                            type="text"
                            value={
                              skillInput
                            }
                            placeholder="Ví dụ: React, Excel, Sales..."
                            onChange={(
                              event,
                            ) =>
                              setSkillInput(
                                event
                                  .target
                                  .value,
                              )
                            }
                            onKeyDown={(
                              event,
                            ) => {
                              if (
                                event.key ===
                                "Enter"
                              ) {
                                event.preventDefault();

                                addSkill(
                                  experience,
                                );
                              }
                            }}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              addSkill(
                                experience,
                              )
                            }
                          >
                            Thêm
                          </button>
                        </div>

                        {experience
                          .skillsUsed
                          .length >
                        0 ? (
                          <div
                            className={
                              styles.skillList
                            }
                          >
                            {experience.skillsUsed.map(
                              (
                                skill,
                              ) => (
                                <span
                                  key={
                                    skill
                                  }
                                >
                                  {
                                    skill
                                  }

                                  <button
                                    type="button"
                                    aria-label={`Xóa kỹ năng ${skill}`}
                                    onClick={() =>
                                      removeSkill(
                                        experience,
                                        skill,
                                      )
                                    }
                                  >
                                    ×
                                  </button>
                                </span>
                              ),
                            )}
                          </div>
                        ) : (
                          <p
                            className={
                              styles.noSkills
                            }
                          >
                            Chưa thêm kỹ
                            năng cho kinh
                            nghiệm này.
                          </p>
                        )}
                      </section>

                      {/* VALIDATION */}

                      {!canComplete(
                        experience,
                      ) && (
                        <div
                          className={
                            styles.validationNotice
                          }
                        >
                          Vui lòng nhập
                          Chức danh, Công
                          ty, Loại hình
                          công việc và
                          Năm bắt đầu
                          trước khi hoàn
                          tất.
                        </div>
                      )}

                      <div
                        className={
                          styles.editActions
                        }
                      >
                        <button
                          type="button"
                          className={
                            styles.doneButton
                          }
                          disabled={
                            !canComplete(
                              experience,
                            )
                          }
                          onClick={() => {
                            setEditingId(
                              null,
                            );

                            setSkillInput(
                              "",
                            );
                          }}
                        >
                          Hoàn tất mục
                          kinh nghiệm
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            },
          )}

          <button
            type="button"
            className={
              styles.addAnotherButton
            }
            onClick={
              addExperience
            }
          >
            <span>+</span>

            Thêm kinh nghiệm khác
          </button>
        </div>
      )}

      {/* NOTICE */}

      <div
        className={
          styles.notice
        }
      >
        <div
          className={
            styles.noticeIcon
          }
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />

            <path
              d="M12 11v5M12 8h.01"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div>
          <strong>
            Không chỉ công việc
            chính thức mới được
            tính là kinh nghiệm
          </strong>

          <p>
            Thực tập, part-time,
            freelance, tình nguyện
            hoặc công việc thực tế
            có liên quan đều có thể
            giúp hồ sơ của bạn mạnh
            hơn.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExperienceStep;