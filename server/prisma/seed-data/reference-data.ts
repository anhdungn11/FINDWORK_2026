export interface SeedReferenceItem {
  code: string;
  name: string;
}

export const JOB_CATEGORIES: SeedReferenceItem[] = [
  { code: "software-development", name: "Phát triển phần mềm" },
  { code: "data-ai", name: "Dữ liệu & AI" },
  { code: "it-support-infrastructure", name: "IT Support & Hạ tầng" },
  { code: "cybersecurity", name: "An toàn thông tin" },
  { code: "product-project", name: "Sản phẩm & Quản lý dự án" },
  { code: "design-creative", name: "Thiết kế & Sáng tạo" },
  { code: "marketing", name: "Marketing" },
  { code: "sales-business-development", name: "Kinh doanh & Phát triển thị trường" },
  { code: "customer-service", name: "Chăm sóc khách hàng" },
  { code: "finance-banking", name: "Tài chính & Ngân hàng" },
  { code: "accounting-audit", name: "Kế toán & Kiểm toán" },
  { code: "human-resources", name: "Nhân sự" },
  { code: "administration-operations", name: "Hành chính & Vận hành" },
  { code: "legal", name: "Pháp lý" },
  { code: "logistics-supply-chain", name: "Logistics & Chuỗi cung ứng" },
  { code: "manufacturing-engineering", name: "Sản xuất & Kỹ thuật" },
  { code: "construction-real-estate", name: "Xây dựng & Bất động sản" },
  { code: "healthcare", name: "Y tế & Chăm sóc sức khỏe" },
  { code: "education-training", name: "Giáo dục & Đào tạo" },
  { code: "hospitality-tourism", name: "Du lịch, Nhà hàng & Khách sạn" },
  { code: "media-content", name: "Truyền thông & Nội dung" },
  { code: "agriculture-environment", name: "Nông nghiệp & Môi trường" },
];

export interface SeedSkillCategory extends SeedReferenceItem {
  parentCode: string | null;
}

export const SKILL_CATEGORIES: SeedSkillCategory[] = [
  { code: "software-development", name: "Phát triển phần mềm", parentCode: null },
  { code: "data-ai", name: "Dữ liệu & AI", parentCode: null },
  { code: "it-infrastructure", name: "Hạ tầng & hệ thống", parentCode: null },
  { code: "office-productivity", name: "Tin học văn phòng", parentCode: null },
  { code: "accounting-finance", name: "Kế toán & Tài chính", parentCode: null },
  { code: "sales", name: "Kinh doanh & Bán hàng", parentCode: null },
  { code: "marketing", name: "Marketing", parentCode: null },
  { code: "customer-service", name: "Chăm sóc khách hàng", parentCode: null },
  { code: "human-resources", name: "Nhân sự", parentCode: null },
  { code: "project-management", name: "Quản lý dự án", parentCode: null },
  { code: "design-creative", name: "Thiết kế & Sáng tạo", parentCode: null },
  { code: "engineering", name: "Kỹ thuật", parentCode: null },
  { code: "construction", name: "Xây dựng", parentCode: null },
  { code: "manufacturing", name: "Sản xuất", parentCode: null },
  { code: "logistics-supply-chain", name: "Logistics & Chuỗi cung ứng", parentCode: null },
  { code: "hospitality", name: "Nhà hàng & Khách sạn", parentCode: null },
  { code: "education", name: "Giáo dục", parentCode: null },
  { code: "healthcare", name: "Y tế & Chăm sóc sức khỏe", parentCode: null },
  { code: "legal", name: "Pháp lý", parentCode: null },
  { code: "soft-skills", name: "Kỹ năng mềm", parentCode: null },
];

export interface SeedLanguage {
  code: string;
  label: string;
  englishLabel: string;
}

// "other" is intentionally not seeded: the frontend treats custom languages as
// user-entered data, not as master reference data.
export const LANGUAGES: SeedLanguage[] = [
  { code: "vi", label: "Tiếng Việt", englishLabel: "Vietnamese" },
  { code: "en", label: "Tiếng Anh", englishLabel: "English" },
  { code: "zh", label: "Tiếng Trung", englishLabel: "Chinese" },
  { code: "ja", label: "Tiếng Nhật", englishLabel: "Japanese" },
  { code: "ko", label: "Tiếng Hàn", englishLabel: "Korean" },
  { code: "fr", label: "Tiếng Pháp", englishLabel: "French" },
  { code: "de", label: "Tiếng Đức", englishLabel: "German" },
  { code: "es", label: "Tiếng Tây Ban Nha", englishLabel: "Spanish" },
  { code: "it", label: "Tiếng Ý", englishLabel: "Italian" },
  { code: "pt", label: "Tiếng Bồ Đào Nha", englishLabel: "Portuguese" },
  { code: "ru", label: "Tiếng Nga", englishLabel: "Russian" },
  { code: "th", label: "Tiếng Thái", englishLabel: "Thai" },
  { code: "id", label: "Tiếng Indonesia", englishLabel: "Indonesian" },
  { code: "ms", label: "Tiếng Mã Lai", englishLabel: "Malay" },
  { code: "fil", label: "Tiếng Philippines", englishLabel: "Filipino" },
  { code: "km", label: "Tiếng Khmer", englishLabel: "Khmer" },
  { code: "lo", label: "Tiếng Lào", englishLabel: "Lao" },
  { code: "my", label: "Tiếng Myanmar", englishLabel: "Burmese" },
  { code: "ar", label: "Tiếng Ả Rập", englishLabel: "Arabic" },
  { code: "hi", label: "Tiếng Hindi", englishLabel: "Hindi" },
  { code: "tr", label: "Tiếng Thổ Nhĩ Kỳ", englishLabel: "Turkish" },
  { code: "nl", label: "Tiếng Hà Lan", englishLabel: "Dutch" },
  { code: "pl", label: "Tiếng Ba Lan", englishLabel: "Polish" },
  { code: "cs", label: "Tiếng Séc", englishLabel: "Czech" },
  { code: "uk", label: "Tiếng Ukraina", englishLabel: "Ukrainian" },
  { code: "sv", label: "Tiếng Thụy Điển", englishLabel: "Swedish" },
  { code: "no", label: "Tiếng Na Uy", englishLabel: "Norwegian" },
  { code: "da", label: "Tiếng Đan Mạch", englishLabel: "Danish" },
  { code: "fi", label: "Tiếng Phần Lan", englishLabel: "Finnish" },
  { code: "el", label: "Tiếng Hy Lạp", englishLabel: "Greek" },
  { code: "he", label: "Tiếng Hebrew", englishLabel: "Hebrew" },
];
