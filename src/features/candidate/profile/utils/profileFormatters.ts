/**
 * FINDWORK CP8B — CANDIDATE PROFILE FORMATTERS & HELPERS
 * 
 * Presentation utilities for formatting text, currency, dates,
 * initials, and generating guidance checklist items without percent calculation.
 */

import type {
  CandidateCareerStatus,
  FullCandidateProfileRecord,
  Gender,
} from "../types/candidateProfile.types";
import type { GuidanceChecklistItem } from "../types/uiProfileProps.types";

/**
 * Trích xuất ký tự viết tắt cho Avatar (Initials)
 * Lấy chữ cái đầu của từ đầu tiên và từ cuối cùng.
 */
export function getAvatarInitials(name?: string | null): string {
  if (!name || typeof name !== "string") return "UV";
  const trimmed = name.trim();
  if (trimmed.length === 0) return "UV";

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  const first = words[0][0] ?? "";
  const last = words[words.length - 1][0] ?? "";
  return (first + last).toUpperCase();
}

/**
 * Định dạng nhãn hiển thị Trạng thái nghề nghiệp
 */
export function formatCareerStatusLabel(status?: CandidateCareerStatus | null): string {
  if (!status) return "Chưa cập nhật trạng thái";
  switch (status) {
    case "LOOKING_FOR_JOB":
      return "Đang tìm việc làm";
    case "STUDENT":
      return "Sinh viên / Đang đi học";
    case "INTERN":
      return "Thực tập sinh";
    case "EMPLOYED":
      return "Đang có việc làm";
    case "UNEMPLOYED":
      return "Chưa có việc làm";
    case "FREELANCER":
      return "Làm việc tự do (Freelance)";
    case "OTHER":
    default:
      return "Khác";
  }
}

/**
 * Định dạng nhãn Giới tính
 */
export function formatGenderLabel(gender?: Gender | null): string {
  if (!gender) return "Chưa cập nhật";
  switch (gender) {
    case "MALE":
      return "Nam";
    case "FEMALE":
      return "Nữ";
    case "OTHER":
    default:
      return "Khác";
  }
}

/**
 * Định dạng tháng / năm (MM/YYYY)
 */
export function formatMonthYear(month?: number | null, year?: number | null): string {
  if (!year) return "";
  if (!month) return `${year}`;
  const paddedMonth = month < 10 ? `0${month}` : `${month}`;
  return `${paddedMonth}/${year}`;
}

/**
 * Định dạng ngày sinh (DD/MM/YYYY)
 */
export function formatDateOfBirth(isoDate?: string | null): string {
  if (!isoDate) return "Chưa cập nhật";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoDate;
  }
}

/**
 * Định dạng số tiền VND có dấu chấm phân cách
 */
export function formatCurrencyVND(amount?: number | string | null): string {
  if (amount === null || amount === undefined || amount === "") return "0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("vi-VN").format(num);
}

/**
 * Khởi tạo danh sách Guidance Checklist dựa trên hồ sơ hiện có.
 * ĐẢM BẢO RÀNG BUỘC:
 * - Không tính phần trăm (%).
 * - Không bắt buộc kinh nghiệm làm việc (phù hợp sinh viên/fresher).
 * - Không áp đặt số lượng kỹ năng cứng nhắc cho mọi ngành.
 */
export function buildGuidanceChecklist(profile?: FullCandidateProfileRecord | null): GuidanceChecklistItem[] {
  if (!profile) return [];

  const hasPersonal = Boolean(
    profile.fullName &&
    (profile.phone || profile.dateOfBirth || profile.province || profile.addressLine)
  );

  const hasBio = Boolean(profile.bio && profile.bio.trim().length > 0);
  const hasEducation = Array.isArray(profile.education) && profile.education.length > 0;
  const hasExperience = Array.isArray(profile.experience) && profile.experience.length > 0;
  const hasSkills = Array.isArray(profile.skills) && profile.skills.length > 0;
  const hasLanguages = Array.isArray(profile.languages) && profile.languages.length > 0;
  const hasPreferences = Boolean(
    profile.careerPreference &&
    (profile.careerPreference.desiredPositions?.length > 0 ||
      profile.careerPreference.preferredEmploymentTypes?.length > 0)
  );
  const hasPrivacy = Boolean(profile.privacySetting);

  return [
    {
      id: "personal",
      title: "Thông tin cá nhân & Liên hệ",
      description: "Họ tên, ngày sinh, số điện thoại và địa chỉ cư trú",
      isCompleted: hasPersonal,
      anchorId: "section-personal",
    },
    {
      id: "bio",
      title: "Giới thiệu bản thân (Bio)",
      description: "Tóm tắt mục tiêu nghề nghiệp và thế mạnh nổi bật",
      isCompleted: hasBio,
      anchorId: "section-overview",
    },
    {
      id: "education",
      title: "Học vấn & Bằng cấp",
      description: "Trường đại học, cao đẳng hoặc các khóa đào tạo chuyên môn",
      isCompleted: hasEducation,
      anchorId: "section-education",
    },
    {
      id: "experience",
      title: "Kinh nghiệm làm việc",
      description: "Quá trình công tác, dự án hoặc hoạt động thực tập (tùy chọn)",
      isCompleted: hasExperience,
      isOptional: true, // Không bắt buộc với mọi ứng viên
      anchorId: "section-experience",
    },
    {
      id: "skills",
      title: "Kỹ năng chuyên môn",
      description: "Các kỹ năng phù hợp với ngành nghề và chuyên môn của bạn",
      isCompleted: hasSkills,
      anchorId: "section-skills",
    },
    {
      id: "languages",
      title: "Ngoại ngữ & Chứng chỉ",
      description: "Khả năng ngoại ngữ phục vụ công việc và giao tiếp",
      isCompleted: hasLanguages,
      anchorId: "section-languages",
    },
    {
      id: "preferences",
      title: "Nguyện vọng nghề nghiệp",
      description: "Vị trí mong muốn, kỳ vọng lương và hình thức làm việc",
      isCompleted: hasPreferences,
      anchorId: "section-preferences",
    },
    {
      id: "privacy",
      title: "Thiết lập quyền riêng tư",
      description: "Kiểm tra quyền hiển thị thông tin với nhà tuyển dụng",
      isCompleted: hasPrivacy,
      anchorId: "section-privacy",
    },
  ];
}
