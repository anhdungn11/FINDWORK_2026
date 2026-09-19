export interface JobCategoryOption {
  code: string;
  name: string;
}

/**
 * TEMPORARY FRONTEND REFERENCE SOURCE.
 *
 * Step 5 and the Jobs domain should consume the same category codes.
 * When the FINDWORK backend is ready, replace this static source with
 * the reference API without changing CareerPreferences' data contract.
 */
export const JOB_CATEGORY_OPTIONS: JobCategoryOption[] = [
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

export const getJobCategoryByCode = (
  code: string,
) => {
  return JOB_CATEGORY_OPTIONS.find(
    (category) => category.code === code,
  );
};
