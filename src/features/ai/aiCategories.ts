export type PromptCategory =
  | "ALL"
  | "CV"
  | "CAREER"
  | "JOBS"
  | "APPLICATION"
  | "RECRUITING"
  | "INTERVIEW"
  | "FINDWORK";

export interface CategoryMeta {
  key: PromptCategory;
  label: string;
  prompts: string[];
}

export const VI_CATEGORIES: CategoryMeta[] = [
  {
    key: "ALL",
    label: "Tất cả gợi ý",
    prompts: [
      "Cách viết CV thu hút nhà tuyển dụng ngành công nghệ",
      "Gợi ý 5 câu hỏi phỏng vấn vị trí Senior React Developer",
      "Chiến lược đàm phán lương khi nhận được lời mời làm việc (Offer)",
      "Quy trình xác minh hồ sơ pháp lý doanh nghiệp trên FINDWORK",
    ],
  },
  {
    key: "CV",
    label: "Tạo & Tối ưu CV",
    prompts: [
      "Góp ý bố cục CV cho vị trí Frontend Developer chuẩn ATS",
      "Cách nêu bật thành tích bằng số liệu (Metrics) trong phần kinh nghiệm",
      "Những sai lầm phổ biến khiến CV bị loại ngay từ vòng lọc hồ sơ",
    ],
  },
  {
    key: "CAREER",
    label: "Định hướng sự nghiệp",
    prompts: [
      "Lộ trình phát triển từ Middle lên Senior Software Engineer",
      "Những kỹ năng cần trau dồi để chuyển hướng sang Tech Lead / Engineering Manager",
      "Làm sao để cân bằng giữa chuyên môn sâu (Specialist) và đa năng (Generalist)?",
    ],
  },
  {
    key: "JOBS",
    label: "Tìm kiếm việc làm",
    prompts: [
      "Cách tìm kiếm việc làm Remote chất lượng cao tại Việt Nam & khu vực",
      "Tiêu chí đánh giá văn hóa công ty và chế độ đãi ngộ trước khi ứng tuyển",
      "Cách đọc hiểu bản mô tả công việc (JD) để nhận diện yêu cầu thực tế",
    ],
  },
  {
    key: "APPLICATION",
    label: "Thư ứng tuyển & Tiếp cận",
    prompts: [
      "Cách viết thư ứng tuyển (Cover Letter) ngắn gọn, chuyên nghiệp và gây ấn tượng",
      "Nội dung email xin phép theo dõi tiến độ hồ sơ (Follow-up) sau 5 ngày ứng tuyển",
      "Cách trả lời thư từ chối một cách lịch thiệp để giữ mối quan hệ lâu dài",
    ],
  },
  {
    key: "RECRUITING",
    label: "Dành cho nhà tuyển dụng",
    prompts: [
      "Cách cấu trúc bản mô tả công việc (JD) thu hút ứng viên chất lượng",
      "Tiêu chí đánh giá bài kiểm tra kỹ năng (Technical Assessment) công bằng",
      "Quy chuẩn thiết lập quy trình tuyển dụng từ Sơ tuyển tới Phỏng vấn & Onboarding",
    ],
  },
  {
    key: "INTERVIEW",
    label: "Luyện phỏng vấn",
    prompts: [
      "Gợi ý 5 câu hỏi tình huống thường gặp khi phỏng vấn System Design",
      "Cách trả lời câu hỏi 'Điểm yếu lớn nhất của bạn là gì?' chân thành và thuyết phục",
      "Bộ câu hỏi ứng viên nên hỏi ngược lại người phỏng vấn ở cuối buổi",
    ],
  },
  {
    key: "FINDWORK",
    label: "Hỗ trợ FINDWORK",
    prompts: [
      "Hướng dẫn xác minh hồ sơ pháp lý công ty để nhận huy hiệu Verified",
      "Cách thêm địa điểm trụ sở và chi nhánh có mã đơn vị hành chính chuẩn",
      "Quy trình lên lịch phỏng vấn trực tiếp và trực tuyến cho ứng viên trên FINDWORK",
    ],
  },
];

export const EN_CATEGORIES: CategoryMeta[] = [
  {
    key: "ALL",
    label: "All Suggestions",
    prompts: [
      "How to write a tech CV that stands out to recruiters",
      "5 essential interview questions for Senior React Developer",
      "Salary negotiation strategies after receiving an offer",
      "Company legal verification process on FINDWORK",
    ],
  },
  {
    key: "CV",
    label: "CV Optimization",
    prompts: [
      "ATS-friendly layout tips for Frontend Developer resumes",
      "Highlighting impact and metrics in work experience",
      "Common mistakes that lead to instant CV rejection",
    ],
  },
  {
    key: "CAREER",
    label: "Career Roadmap",
    prompts: [
      "Roadmap to advance from Mid-level to Senior Software Engineer",
      "Key capabilities required when moving toward Tech Lead / Manager",
      "Balancing deep domain specialization vs full-stack generalism",
    ],
  },
  {
    key: "JOBS",
    label: "Job Search",
    prompts: [
      "How to target verified remote positions in Vietnam and APAC",
      "Evaluating culture and total rewards before submitting applications",
      "Decoding job descriptions (JD) to spot hidden expectations",
    ],
  },
  {
    key: "APPLICATION",
    label: "Outreach & Letters",
    prompts: [
      "Writing a concise and memorable cover letter",
      "Polite follow-up email template 5 business days after applying",
      "Gracious response to rejection letters to sustain network relationships",
    ],
  },
  {
    key: "RECRUITING",
    label: "For Employers",
    prompts: [
      "How to craft job descriptions that attract high-caliber candidates",
      "Objective evaluation criteria for candidate technical assessments",
      "Designing a seamless screening-to-interview recruitment pipeline",
    ],
  },
  {
    key: "INTERVIEW",
    label: "Interview Prep",
    prompts: [
      "Top situational system design architecture interview questions",
      "Authentic and strong answers to 'What is your greatest weakness?'",
      "Impactful questions candidates should ask interviewers at the wrap-up",
    ],
  },
  {
    key: "FINDWORK",
    label: "FINDWORK Guide",
    prompts: [
      "Step-by-step enterprise legal document verification for Verified badge",
      "Registering company headquarters and branches with official division codes",
      "Conducting in-person and video interview workflows on FINDWORK",
    ],
  },
];
