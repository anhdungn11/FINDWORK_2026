import type {
  ApplicationDetailsErrors,
  ApplicationDetailsForm,
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