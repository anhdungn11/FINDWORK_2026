import type {
  ApplicationDetailsForm,
} from "@/features/applications/types/application.types";

import type {
  Resume,
} from "@/features/resume/types/resume.types";

interface ResumeApplicationPrefill {
  fullName: string;
  email: string;
  phone: string;
  location: string;
}

/**
 * Chuyển dữ liệu từ Resume sang dữ liệu có thể dùng
 * để prefill Application form.
 *
 * Chỉ Resume được tạo bằng FINDWORK Builder mới có
 * builderContent để đọc trực tiếp.
 */
export const mapResumeToApplicationPrefill = (
  resume: Resume | null,
): ResumeApplicationPrefill | null => {
  const content =
    resume?.currentVersion.builderContent;

  if (!content) {
    return null;
  }

  return {
    fullName: content.fullName.trim(),
    email: content.email.trim(),
    phone: content.phone.trim(),
    location: content.location.trim(),
  };
};

/**
 * Chỉ điền các field còn trống.
 *
 * Không ghi đè dữ liệu ứng viên đã nhập thủ công
 * khi họ đổi CV.
 */
export const mergeResumePrefillIntoDetails = (
  current: ApplicationDetailsForm,
  resume: Resume | null,
): ApplicationDetailsForm => {
  const prefill =
    mapResumeToApplicationPrefill(resume);

  if (!prefill) {
    return current;
  }

  return {
    ...current,

    contact: {
      fullName:
        current.contact.fullName ||
        prefill.fullName,

      email:
        current.contact.email ||
        prefill.email,

      phone:
        current.contact.phone ||
        prefill.phone,
    },

    currentLocation:
      current.currentLocation ||
      prefill.location,
  };
};