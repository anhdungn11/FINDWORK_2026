import type {
  ApplicationDetailsErrors,
  ApplicationDetailsForm,
  ScreeningAnswerValue,
} from "@/features/applications/types/application.types";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateApplicationDetails = (
  details: ApplicationDetailsForm,
): ApplicationDetailsErrors => {
  const errors: ApplicationDetailsErrors = {};

  const fullName =
    details.contact.fullName.trim();

  const email =
    details.contact.email.trim();

  const phoneDigits =
    details.contact.phone.replace(
      /\D/g,
      "",
    );

  if (!fullName) {
    errors.fullName =
      "Vui lòng nhập họ và tên.";
  }

  if (!email) {
    errors.email =
      "Vui lòng nhập email.";
  } else if (
    !EMAIL_PATTERN.test(email)
  ) {
    errors.email =
      "Email chưa đúng định dạng.";
  }

  if (!phoneDigits) {
    errors.phone =
      "Vui lòng nhập số điện thoại.";
  } else if (
    phoneDigits.length < 8 ||
    phoneDigits.length > 15
  ) {
    errors.phone =
      "Số điện thoại phải có từ 8 đến 15 chữ số.";
  }

  if (!details.availability) {
    errors.availability =
      "Vui lòng chọn thời gian có thể bắt đầu.";
  }

  return errors;
};

export const isApplicationDetailsValid = (
  details: ApplicationDetailsForm,
): boolean => {
  return (
    Object.keys(
      validateApplicationDetails(details),
    ).length === 0
  );
};

export interface ScreeningQuestionItem {
  id: string;
  type: "TEXT" | "TEXTAREA" | "YES_NO" | "SELECT" | "MULTI_SELECT";
  label: string;
  isRequired: boolean;
  options?: string[] | null;
}

export type ScreeningValidationErrors = Record<string, string>;

export const validateScreeningQuestions = (
  questions: ScreeningQuestionItem[],
  answers: Record<string, ScreeningAnswerValue>,
): ScreeningValidationErrors => {
  const errors: ScreeningValidationErrors = {};

  for (const q of questions) {
    const val = answers[q.id];
    if (q.isRequired) {
      if (
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "")
      ) {
        errors[q.id] = "Vui lòng trả lời câu hỏi bắt buộc này.";
        continue;
      }
      if (Array.isArray(val) && val.length === 0) {
        errors[q.id] = "Vui lòng chọn ít nhất một lựa chọn.";
        continue;
      }
    }

    if (val !== undefined && val !== null && val !== "") {
      switch (q.type) {
        case "TEXT":
          if (typeof val === "string" && val.trim().length > 500) {
            errors[q.id] = "Câu trả lời không được vượt quá 500 ký tự.";
          }
          break;
        case "TEXTAREA":
          if (typeof val === "string" && val.trim().length > 5000) {
            errors[q.id] = "Câu trả lời không được vượt quá 5000 ký tự.";
          }
          break;
        case "YES_NO":
          if (typeof val !== "boolean") {
            errors[q.id] = "Vui lòng chọn Có hoặc Không.";
          }
          break;
        case "SELECT":
          if (q.options && q.options.length > 0 && typeof val === "string" && !q.options.includes(val)) {
            errors[q.id] = "Lựa chọn không hợp lệ trong danh sách.";
          }
          break;
        case "MULTI_SELECT":
          if (!Array.isArray(val) || (q.isRequired && val.length === 0)) {
            errors[q.id] = "Vui lòng chọn ít nhất một lựa chọn.";
          } else if (q.options && q.options.length > 0 && !val.every((item) => q.options!.includes(item))) {
            errors[q.id] = "Có lựa chọn không hợp lệ trong danh sách.";
          }
          break;
      }
    }
  }

  return errors;
};