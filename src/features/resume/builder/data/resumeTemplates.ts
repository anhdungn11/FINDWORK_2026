import type {
  ResumeAccentColor,
  ResumeBuilderEditorSection,
  ResumeIndustryPreset,
  ResumeSectionId,
  ResumeTemplateCode,
} from "@/features/resume/types/resume.types";

export interface ResumeTemplateOption {
  code: ResumeTemplateCode;
  name: string;
  description: string;
  bestFor: string;
  badge: string;
}

export const RESUME_TEMPLATES: ResumeTemplateOption[] = [
  {
    code: "classic",
    name: "Classic ATS",
    description: "Một cột chuẩn, dễ đọc và phù hợp hồ sơ cần tính trang trọng.",
    bestFor: "Đa ngành · ATS · Doanh nghiệp",
    badge: "Khuyên dùng",
  },
  {
    code: "minimal",
    name: "Minimal",
    description: "Tinh gọn, nhiều khoảng thở, tập trung hoàn toàn vào nội dung.",
    bestFor: "Đa ngành · Quốc tế · Chuyên môn",
    badge: "Tối giản",
  },
  {
    code: "modern",
    name: "Modern",
    description: "Hai cột cân đối, nổi bật kỹ năng và thông tin liên hệ mà vẫn dễ quét.",
    bestFor: "Kinh doanh · Kỹ thuật · Marketing",
    badge: "Phổ biến",
  },
  {
    code: "corporate",
    name: "Corporate",
    description: "Phân cấp mạnh, nghiêm túc và phù hợp hồ sơ giàu kinh nghiệm.",
    bestFor: "Tài chính · Quản lý · Doanh nghiệp",
    badge: "Senior",
  },
  {
    code: "creative",
    name: "Creative",
    description: "Có điểm nhấn hình ảnh nhưng vẫn giữ cấu trúc hồ sơ chuyên nghiệp.",
    bestFor: "Sáng tạo · Truyền thông · Dịch vụ",
    badge: "Nổi bật",
  },
];

export const RESUME_SECTION_LABELS: Record<ResumeSectionId, string> = {
  summary: "Giới thiệu nghề nghiệp",
  experience: "Kinh nghiệm làm việc",
  education: "Học vấn",
  skills: "Kỹ năng",
  languages: "Ngoại ngữ",
  certifications: "Chứng chỉ / giấy phép",
  projects: "Dự án / công việc nổi bật",
  awards: "Thành tích / giải thưởng",
  activities: "Hoạt động",
  volunteering: "Tình nguyện",
  references: "Người tham chiếu",
  custom: "Mục tùy chỉnh",
};

export const RESUME_EDITOR_SECTIONS: Array<{
  id: ResumeBuilderEditorSection;
  label: string;
  description: string;
  group: "core" | "additional" | "design";
}> = [
  { id: "basics", label: "Thông tin cá nhân", description: "Tên, liên hệ và liên kết", group: "core" },
  { id: "summary", label: "Giới thiệu nghề nghiệp", description: "Tóm tắt giá trị và mục tiêu", group: "core" },
  { id: "experience", label: "Kinh nghiệm làm việc", description: "Vai trò, trách nhiệm, kết quả", group: "core" },
  { id: "education", label: "Học vấn", description: "Trường, ngành, bằng cấp", group: "core" },
  { id: "skills", label: "Kỹ năng", description: "Kỹ năng theo nhóm phù hợp ngành", group: "core" },
  { id: "languages", label: "Ngoại ngữ", description: "Trình độ và chứng chỉ", group: "additional" },
  { id: "certifications", label: "Chứng chỉ / giấy phép", description: "Chứng nhận chuyên môn", group: "additional" },
  { id: "projects", label: "Dự án / công việc nổi bật", description: "Sản phẩm, hồ sơ công việc, case study", group: "additional" },
  { id: "awards", label: "Thành tích / giải thưởng", description: "Danh hiệu và ghi nhận", group: "additional" },
  { id: "activities", label: "Hoạt động", description: "CLB, tổ chức, hoạt động xã hội", group: "additional" },
  { id: "volunteering", label: "Tình nguyện", description: "Hoạt động cộng đồng", group: "additional" },
  { id: "references", label: "Người tham chiếu", description: "Liên hệ xác minh khi cần", group: "additional" },
  { id: "custom", label: "Mục tùy chỉnh", description: "Tự tạo mục riêng cho nghề của bạn", group: "additional" },
  { id: "design", label: "Mẫu & thiết kế", description: "Khung, màu, font và thứ tự", group: "design" },
];

export const DEFAULT_SECTION_ORDER: ResumeSectionId[] = [
  "summary",
  "experience",
  "education",
  "skills",
  "languages",
  "certifications",
  "projects",
  "awards",
  "activities",
  "volunteering",
  "references",
  "custom",
];

export const RESUME_ACCENT_OPTIONS: Array<{
  value: ResumeAccentColor;
  label: string;
  color: string;
}> = [
  { value: "ink", label: "Ink", color: "#202936" },
  { value: "navy", label: "Navy", color: "#17365d" },
  { value: "blue", label: "Blue", color: "#2f5fd0" },
  { value: "emerald", label: "Emerald", color: "#176b5b" },
  { value: "burgundy", label: "Burgundy", color: "#7a3046" },
  { value: "sand", label: "Sand", color: "#8a6a45" },
];

export const RESUME_INDUSTRY_PRESETS: Array<{
  value: ResumeIndustryPreset;
  label: string;
}> = [
  { value: "general", label: "Đa ngành / Chung" },
  { value: "business", label: "Kinh doanh & Bán hàng" },
  { value: "finance", label: "Tài chính & Kế toán" },
  { value: "people", label: "Hành chính & Nhân sự" },
  { value: "marketing", label: "Marketing & Truyền thông" },
  { value: "technical", label: "Công nghệ & Kỹ thuật" },
  { value: "operations", label: "Sản xuất, Xây dựng & Logistics" },
  { value: "education", label: "Giáo dục & Đào tạo" },
  { value: "healthcare", label: "Y tế & Chăm sóc" },
  { value: "service", label: "Dịch vụ, Bán lẻ & Nhà hàng - Khách sạn" },
  { value: "creative", label: "Thiết kế & Sáng tạo" },
  { value: "legal", label: "Pháp lý & Tuân thủ" },
  { value: "other", label: "Khác" },
];
