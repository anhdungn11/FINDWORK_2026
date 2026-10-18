import { useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ScreeningAnswerValue } from "@/features/applications/types/application.types";
import {
  validateScreeningQuestions,
  type ScreeningQuestionItem,
  type ScreeningValidationErrors,
} from "@/features/applications/utils/applicationValidation";

import styles from "./ApplicationQuestionsStep.module.css";

export interface ApplicationQuestionsStepProps {
  questions: ScreeningQuestionItem[];
  answers: Record<string, ScreeningAnswerValue>;
  onAnswerChange: (questionId: string, value: ScreeningAnswerValue) => void;
  onBack: () => void;
  onContinue: () => void;
  isDemo?: boolean;
}

export const ApplicationQuestionsStep = ({
  questions,
  answers,
  onAnswerChange,
  onBack,
  onContinue,
  isDemo = false,
}: ApplicationQuestionsStepProps) => {
  const [errors, setErrors] = useState<ScreeningValidationErrors>({});

  const handleContinue = () => {
    const validationErrors = validateScreeningQuestions(questions, answers);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      // Focus or scroll to the first invalid field
      const firstErrorId = Object.keys(validationErrors)[0];
      const element = document.getElementById(`q-${firstErrorId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus();
      }
      return;
    }

    onContinue();
  };

  const handleTextChange = (questionId: string, val: string) => {
    onAnswerChange(questionId, val);
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const handleYesNoChange = (questionId: string, val: boolean) => {
    onAnswerChange(questionId, val);
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const handleSelectChange = (questionId: string, val: string) => {
    onAnswerChange(questionId, val);
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const handleMultiSelectToggle = (questionId: string, option: string) => {
    const current = Array.isArray(answers[questionId]) ? (answers[questionId] as string[]) : [];
    const updated = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];
    onAnswerChange(questionId, updated);
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  return (
    <section className={styles.card} aria-labelledby="questions-step-title">
      <header className={styles.header}>
        <span className={styles.stepBadge}>Bước 3 / 4</span>
        <h2 id="questions-step-title" className={styles.title}>
          Câu hỏi sàng lọc của nhà tuyển dụng
        </h2>
        <p className={styles.subtitle}>
          Vui lòng cung cấp thông tin cho các câu hỏi sau để nhà tuyển dụng đánh giá mức độ phù hợp với vị trí công việc.
        </p>
      </header>

      {isDemo && (
        <aside className={styles.demoBanner} role="note" aria-label="Ghi chú bản tin mẫu">
          <div>
            <strong>Bản tin mẫu (Demo):</strong> Dưới đây là các câu hỏi mẫu để bạn trải nghiệm quy trình sàng lọc trước khi nộp hồ sơ. Các câu trả lời được lưu an toàn trong phiên làm việc qua F5.
          </div>
        </aside>
      )}

      {questions.length === 0 ? (
        <div className={styles.emptyStateCard}>
          <div className={styles.emptyStateIcon} aria-hidden="true">
            <CheckCircle2 size={24} />
          </div>
          <h3 className={styles.emptyStateTitle}>Không có câu hỏi sàng lọc bổ sung</h3>
          <p className={styles.emptyStateText}>
            Nhà tuyển dụng không đặt câu hỏi bắt buộc nào cho vị trí này. Toàn bộ thông tin từ CV và thông tin liên hệ của bạn đã sẵn sàng để chuyển sang bước xem lại.
          </p>
          <div style={{ marginTop: 20, width: "100%", maxWidth: 520, textAlign: "left" }}>
            <label htmlFor="q-additional-notes" className={styles.questionLabel} style={{ fontSize: 13 }}>
              Ghi chú thêm cho nhà tuyển dụng (Tùy chọn)
            </label>
            <textarea
              id="q-additional-notes"
              className={styles.textareaField}
              style={{ minHeight: 80, marginTop: 6 }}
              placeholder="Ví dụ: Bạn có thể liên hệ phỏng vấn vào buổi chiều hoặc các thông tin lưu ý khác..."
              value={typeof answers["notes"] === "string" ? (answers["notes"] as string) : ""}
              onChange={(e) => onAnswerChange("notes", e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className={styles.questionsList}>
          {questions.map((q, idx) => {
            const error = errors[q.id];
            const answerVal = answers[q.id];

            return (
              <div key={q.id} className={styles.questionItem} id={`group-${q.id}`}>
                <div className={styles.questionLabelRow}>
                  <label htmlFor={`q-${q.id}`} className={styles.questionLabel}>
                    {idx + 1}. {q.label}
                    {q.isRequired ? (
                      <span className={styles.requiredAsterisk} title="Bắt buộc">*</span>
                    ) : (
                      <span className={styles.optionalBadge}> (Tùy chọn)</span>
                    )}
                  </label>
                </div>

                {/* TEXT Question */}
                {q.type === "TEXT" && (
                  <div>
                    <input
                      id={`q-${q.id}`}
                      type="text"
                      className={`${styles.inputField} ${error ? styles.inputError : ""}`}
                      placeholder="Nhập câu trả lời của bạn..."
                      maxLength={500}
                      value={typeof answerVal === "string" ? answerVal : ""}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      aria-required={q.isRequired}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? `error-${q.id}` : undefined}
                    />
                    <div className={styles.charCounter}>
                      {typeof answerVal === "string" ? answerVal.length : 0} / 500 ký tự
                    </div>
                  </div>
                )}

                {/* TEXTAREA Question */}
                {q.type === "TEXTAREA" && (
                  <div>
                    <textarea
                      id={`q-${q.id}`}
                      className={`${styles.textareaField} ${error ? styles.inputError : ""}`}
                      placeholder="Mô tả chi tiết câu trả lời của bạn..."
                      maxLength={5000}
                      value={typeof answerVal === "string" ? answerVal : ""}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      aria-required={q.isRequired}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? `error-${q.id}` : undefined}
                    />
                    <div className={styles.charCounter}>
                      {typeof answerVal === "string" ? answerVal.length : 0} / 5000 ký tự
                    </div>
                  </div>
                )}

                {/* YES_NO Question */}
                {q.type === "YES_NO" && (
                  <div
                    id={`q-${q.id}`}
                    role="radiogroup"
                    aria-label={q.label}
                    aria-required={q.isRequired}
                    className={styles.yesNoGroup}
                  >
                    <label
                      className={`${styles.yesNoOption} ${
                        answerVal === true ? styles.yesNoSelected : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`yes_no_${q.id}`}
                        className={styles.yesNoRadio}
                        checked={answerVal === true}
                        onChange={() => handleYesNoChange(q.id, true)}
                      />
                      <span>Có</span>
                    </label>
                    <label
                      className={`${styles.yesNoOption} ${
                        answerVal === false ? styles.yesNoSelected : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`yes_no_${q.id}`}
                        className={styles.yesNoRadio}
                        checked={answerVal === false}
                        onChange={() => handleYesNoChange(q.id, false)}
                      />
                      <span>Không</span>
                    </label>
                  </div>
                )}

                {/* SELECT Question */}
                {q.type === "SELECT" && (
                  <div>
                    <select
                      id={`q-${q.id}`}
                      className={`${styles.selectField} ${error ? styles.inputError : ""}`}
                      value={typeof answerVal === "string" ? answerVal : ""}
                      onChange={(e) => handleSelectChange(q.id, e.target.value)}
                      aria-required={q.isRequired}
                      aria-invalid={Boolean(error)}
                    >
                      <option value="">-- Chọn một câu trả lời --</option>
                      {q.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* MULTI_SELECT Question */}
                {q.type === "MULTI_SELECT" && (
                  <div
                    id={`q-${q.id}`}
                    role="group"
                    aria-label={q.label}
                    className={styles.checkboxGroup}
                  >
                    <p className={styles.questionHint}>Có thể chọn nhiều mục:</p>
                    {q.options?.map((opt) => {
                      const selectedList = Array.isArray(answerVal) ? (answerVal as string[]) : [];
                      const isChecked = selectedList.includes(opt);
                      return (
                        <label
                          key={opt}
                          className={`${styles.checkboxOption} ${isChecked ? styles.checkboxSelected : ""}`}
                        >
                          <input
                            type="checkbox"
                            className={styles.checkboxInput}
                            checked={isChecked}
                            onChange={() => handleMultiSelectToggle(q.id, opt)}
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Inline Error Message */}
                {error && (
                  <div id={`error-${q.id}`} className={styles.errorMessage} role="alert">
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <footer className={styles.buttonRow}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Quay lại thông tin
        </button>
        <button type="button" className={styles.continueBtn} onClick={handleContinue}>
          Tiếp tục: Xem lại hồ sơ →
        </button>
      </footer>
    </section>
  );
};

export default ApplicationQuestionsStep;
