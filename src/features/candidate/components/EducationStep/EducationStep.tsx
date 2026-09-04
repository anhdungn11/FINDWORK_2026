import { useState } from "react";

import type {
  EducationItem,
} from "@/features/candidate/types/onboarding.types";

import styles from "./EducationStep.module.css";

interface EducationStepProps {
  value: EducationItem[];
  onChange: (value: EducationItem[]) => void;
}

const MONTHS = Array.from(
  { length: 12 },
  (_, index) => String(index + 1),
);

const createEducationItem = (): EducationItem => ({
  id: crypto.randomUUID(),

  school: "",
  degree: "",
  major: "",
  location: "",

  startMonth: "",
  startYear: "",

  endMonth: "",
  endYear: "",

  isStudying: false,

  gpa: "",
  gpaScale: "",

  achievements: "",
  description: "",
});

const EducationStep = ({
  value,
  onChange,
}: EducationStepProps) => {
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const addEducation = () => {
    const newEducation =
      createEducationItem();

    onChange([
      ...value,
      newEducation,
    ]);

    setEditingId(newEducation.id);
  };

  const updateEducation = <
    Key extends keyof EducationItem,
  >(
    id: string,
    key: Key,
    fieldValue: EducationItem[Key],
  ) => {
    const nextValue = value.map(
      (education) =>
        education.id === id
          ? {
              ...education,
              [key]: fieldValue,
            }
          : education,
    );

    onChange(nextValue);
  };

  const removeEducation = (
    id: string,
  ) => {
    const nextValue =
      value.filter(
        (education) =>
          education.id !== id,
      );

    onChange(nextValue);

    if (editingId === id) {
      setEditingId(null);
    }
  };

  const handleStudyingChange = (
    education: EducationItem,
    checked: boolean,
  ) => {
    const nextValue = value.map(
      (item) => {
        if (
          item.id !== education.id
        ) {
          return item;
        }

        return {
          ...item,

          isStudying: checked,

          endMonth: checked
            ? ""
            : item.endMonth,

          endYear: checked
            ? ""
            : item.endYear,
        };
      },
    );

    onChange(nextValue);
  };

  const getDegreeLabel = (
    degree: string,
  ) => {
    const labels: Record<
      string,
      string
    > = {
      "high-school":
        "Trung học phổ thông",

      vocational:
        "Trung cấp",

      college:
        "Cao đẳng",

      bachelor:
        "Đại học",

      master:
        "Thạc sĩ",

      doctorate:
        "Tiến sĩ",
    };

    return (
      labels[degree] ||
      "Chưa cập nhật trình độ"
    );
  };

  const getDateLabel = (
    education: EducationItem,
  ) => {
    const start =
      education.startYear
        ? education.startMonth
          ? `${education.startMonth}/${education.startYear}`
          : education.startYear
        : "";

    const end =
      education.isStudying
        ? "Hiện tại"
        : education.endYear
          ? education.endMonth
            ? `${education.endMonth}/${education.endYear}`
            : education.endYear
          : "";

    if (!start && !end) {
      return "Chưa cập nhật thời gian";
    }

    return `${start || "—"} – ${end || "—"}`;
  };

  return (
    <div className={styles.wrapper}>
      {/* HEADER */}

      <div className={styles.intro}>
        <div>
          <span
            className={styles.eyebrow}
          >
            HỌC VẤN
          </span>

          <h3>
            Quá trình học tập
          </h3>

          <p>
            Cung cấp thông tin học vấn
            liên quan đến định hướng nghề
            nghiệp của bạn.
          </p>
        </div>

        {value.length > 0 && (
          <button
            type="button"
            className={
              styles.addButton
            }
            onClick={addEducation}
          >
            <span>+</span>
            Thêm học vấn
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
              <path
                d="m3 9 9-5 9 5-9 5-9-5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />

              <path
                d="M7 12v4c0 1.5 2.3 3 5 3s5-1.5 5-3v-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h4>
            Chưa có thông tin học vấn
          </h4>

          <p>
            Thêm quá trình học tập để
            hoàn thiện hồ sơ nghề nghiệp
            của bạn.
          </p>

          <button
            type="button"
            onClick={addEducation}
          >
            + Thêm học vấn đầu tiên
          </button>
        </div>
      )}

      {/* EDUCATION LIST */}

      {value.length > 0 && (
        <div
          className={
            styles.educationList
          }
        >
          {value.map(
            (
              education,
              index,
            ) => {
              const isEditing =
                editingId ===
                education.id;

              return (
                <article
                  key={
                    education.id
                  }
                  className={
                    styles.educationCard
                  }
                >
                  {/* CARD HEADER */}

                  <div
                    className={
                      styles.cardHeader
                    }
                  >
                    <div>
                      <span
                        className={
                          styles.itemNumber
                        }
                      >
                        HỌC VẤN{" "}
                        {index + 1}
                      </span>

                      <h4>
                        {education.school ||
                          "Thông tin học vấn"}
                      </h4>

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
                            {getDegreeLabel(
                              education.degree,
                            )}

                            {education.major &&
                              ` · ${education.major}`}
                          </p>

                          <p>
                            {getDateLabel(
                              education,
                            )}

                            {education.location &&
                              ` · ${education.location}`}
                          </p>

                          {education.gpa && (
                            <p>
                              GPA:{" "}
                              {
                                education.gpa
                              }

                              {education.gpaScale &&
                                ` / ${education.gpaScale}`}
                            </p>
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
                          onClick={() =>
                            setEditingId(
                              education.id,
                            )
                          }
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
                          removeEducation(
                            education.id,
                          )
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* EDIT FORM */}

                  {isEditing && (
                    <div
                      className={
                        styles.formArea
                      }
                    >
                      {/* BASIC INFO */}

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
                            CHƯƠNG TRÌNH
                          </span>

                          <h5>
                            Cơ sở đào tạo
                          </h5>
                        </div>

                        <div
                          className={
                            styles.grid
                          }
                        >
                          <div
                            className={`${styles.field} ${styles.fullWidth}`}
                          >
                            <label
                              htmlFor={`school-${education.id}`}
                            >
                              Trường /
                              Cơ sở đào
                              tạo
                              <span>
                                *
                              </span>
                            </label>

                            <input
                              id={`school-${education.id}`}
                              type="text"
                              value={
                                education.school
                              }
                              placeholder="Ví dụ: Đại học Thủ Dầu Một"
                              onChange={(
                                event,
                              ) =>
                                updateEducation(
                                  education.id,
                                  "school",
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
                              htmlFor={`degree-${education.id}`}
                            >
                              Trình độ
                              <span>
                                *
                              </span>
                            </label>

                            <select
                              id={`degree-${education.id}`}
                              value={
                                education.degree
                              }
                              onChange={(
                                event,
                              ) =>
                                updateEducation(
                                  education.id,
                                  "degree",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            >
                              <option value="">
                                Chọn trình
                                độ
                              </option>

                              <option value="high-school">
                                Trung học
                                phổ thông
                              </option>

                              <option value="vocational">
                                Trung cấp
                              </option>

                              <option value="college">
                                Cao đẳng
                              </option>

                              <option value="bachelor">
                                Đại học
                              </option>

                              <option value="master">
                                Thạc sĩ
                              </option>

                              <option value="doctorate">
                                Tiến sĩ
                              </option>
                            </select>
                          </div>

                          <div
                            className={
                              styles.field
                            }
                          >
                            <label
                              htmlFor={`major-${education.id}`}
                            >
                              Chuyên
                              ngành
                              <span>
                                *
                              </span>
                            </label>

                            <input
                              id={`major-${education.id}`}
                              type="text"
                              value={
                                education.major
                              }
                              placeholder="Ví dụ: Công nghệ thông tin"
                              onChange={(
                                event,
                              ) =>
                                updateEducation(
                                  education.id,
                                  "major",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </div>

                          <div
                            className={`${styles.field} ${styles.fullWidth}`}
                          >
                            <label
                              htmlFor={`location-${education.id}`}
                            >
                              Địa điểm
                            </label>

                            <input
                              id={`location-${education.id}`}
                              type="text"
                              value={
                                education.location
                              }
                              placeholder="Ví dụ: Bình Dương, Việt Nam"
                              onChange={(
                                event,
                              ) =>
                                updateEducation(
                                  education.id,
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
                            Thời gian học
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
                                education.startMonth
                              }
                              onChange={(
                                event,
                              ) =>
                                updateEducation(
                                  education.id,
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
                            </label>

                            <input
                              type="number"
                              min="1950"
                              max="2100"
                              value={
                                education.startYear
                              }
                              placeholder="2024"
                              onChange={(
                                event,
                              ) =>
                                updateEducation(
                                  education.id,
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
                                education.endMonth
                              }
                              disabled={
                                education.isStudying
                              }
                              onChange={(
                                event,
                              ) =>
                                updateEducation(
                                  education.id,
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
                                education.endYear
                              }
                              placeholder="2028"
                              disabled={
                                education.isStudying
                              }
                              onChange={(
                                event,
                              ) =>
                                updateEducation(
                                  education.id,
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
                              education.isStudying
                            }
                            onChange={(
                              event,
                            ) =>
                              handleStudyingChange(
                                education,
                                event
                                  .target
                                  .checked,
                              )
                            }
                          />

                          <span>
                            Tôi hiện
                            đang học
                            tại đây
                          </span>
                        </label>
                      </section>

                      <div
                        className={
                          styles.sectionDivider
                        }
                      />

                      {/* RESULTS */}

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
                            KẾT QUẢ HỌC
                            TẬP
                          </span>

                          <h5>
                            Điểm số &
                            thành tích
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
                              htmlFor={`gpa-${education.id}`}
                            >
                              GPA / Điểm
                              trung bình
                            </label>

                            <input
                              id={`gpa-${education.id}`}
                              type="text"
                              value={
                                education.gpa
                              }
                              placeholder="Ví dụ: 8.2"
                              onChange={(
                                event,
                              ) =>
                                updateEducation(
                                  education.id,
                                  "gpa",
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
                              Thang điểm
                            </label>

                            <select
                              value={
                                education.gpaScale
                              }
                              onChange={(
                                event,
                              ) =>
                                updateEducation(
                                  education.id,
                                  "gpaScale",
                                  event
                                    .target
                                    .value as EducationItem["gpaScale"],
                                )
                              }
                            >
                              <option value="">
                                Chọn thang
                                điểm
                              </option>

                              <option value="4">
                                Thang 4
                              </option>

                              <option value="10">
                                Thang 10
                              </option>

                              <option value="100">
                                Thang 100
                              </option>
                            </select>
                          </div>

                          <div
                            className={`${styles.field} ${styles.fullWidth}`}
                          >
                            <label
                              htmlFor={`achievements-${education.id}`}
                            >
                              Thành tích
                              nổi bật
                            </label>

                            <textarea
                              id={`achievements-${education.id}`}
                              rows={4}
                              value={
                                education.achievements
                              }
                              placeholder="Ví dụ: Học bổng, giải thưởng, thành tích học tập..."
                              onChange={(
                                event,
                              ) =>
                                updateEducation(
                                  education.id,
                                  "achievements",
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
                            THÔNG TIN BỔ
                            SUNG
                          </span>

                          <h5>
                            Nội dung học
                            tập liên quan
                          </h5>
                        </div>

                        <div
                          className={
                            styles.field
                          }
                        >
                          <label
                            htmlFor={`description-${education.id}`}
                          >
                            Mô tả
                          </label>

                          <textarea
                            id={`description-${education.id}`}
                            rows={5}
                            value={
                              education.description
                            }
                            placeholder="Môn học nổi bật, đồ án, hoạt động hoặc kiến thức liên quan đến vị trí bạn muốn ứng tuyển..."
                            onChange={(
                              event,
                            ) =>
                              updateEducation(
                                education.id,
                                "description",
                                event
                                  .target
                                  .value,
                              )
                            }
                          />

                          <small>
                            Không bắt
                            buộc. Chỉ nên
                            thêm nội dung
                            có giá trị cho
                            hồ sơ nghề
                            nghiệp.
                          </small>
                        </div>
                      </section>

                      {/* DONE */}

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
                          onClick={() =>
                            setEditingId(
                              null,
                            )
                          }
                        >
                          Hoàn tất mục
                          học vấn
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
            onClick={addEducation}
          >
            <span>+</span>
            Thêm học vấn khác
          </button>
        </div>
      )}

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
            Chỉ thêm học vấn có
            giá trị cho hồ sơ
          </strong>

          <p>
            Ưu tiên chương trình
            học, chuyên ngành,
            thành tích và nội dung
            liên quan đến công việc
            bạn đang hướng tới.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EducationStep;