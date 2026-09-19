import type { ResumeTemplateCode } from "@/features/resume/types/resume.types";

export interface ResumeTemplateOption {
  code: ResumeTemplateCode;
  name: string;
  description: string;
  badge: string;
}

export const RESUME_TEMPLATES: ResumeTemplateOption[] = [
  {
    code: "modern",
    name: "Modern",
    description: "Bố cục hiện đại, nhấn mạnh kỹ năng và kinh nghiệm.",
    badge: "Phổ biến",
  },
  {
    code: "minimal",
    name: "Minimal",
    description: "Tối giản, nhiều khoảng thở và dễ đọc.",
    badge: "Gọn gàng",
  },
  {
    code: "professional",
    name: "Professional",
    description: "Trang trọng, phù hợp môi trường doanh nghiệp.",
    badge: "Chuyên nghiệp",
  },
  {
    code: "fresher",
    name: "Fresher",
    description: "Ưu tiên học vấn, kỹ năng và tiềm năng cho ứng viên mới.",
    badge: "Sinh viên",
  },
];
