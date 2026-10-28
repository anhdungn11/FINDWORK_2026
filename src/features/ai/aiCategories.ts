export type PromptCategory =
  | "ALL"
  | "CV"
  | "CAREER"
  | "JOBS"
  | "APPLICATION"
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
      "Cách viết CV gây ấn tượng với nhà tuyển dụng đa ngành nghề",
      "Kinh nghiệm trả lời câu hỏi phỏng vấn theo phương pháp STAR",
      "Chiến lược đàm phán mức lương và đãi ngộ khi nhận việc",
      "Mẹo tìm kiếm việc làm minh bạch, uy tín trên FINDWORK",
    ],
  },
  {
    key: "CV",
    label: "Tạo & Tối ưu CV",
    prompts: [
      "Cách làm nổi bật thành tích bằng số liệu (KPIs/Metrics) trong CV",
      "Tối ưu hóa từ khóa chuyên môn để CV vượt qua bộ lọc ATS",
      "Bố cục CV chuẩn mực cho người chuyển đổi định hướng nghề nghiệp",
    ],
  },
  {
    key: "INTERVIEW",
    label: "Luyện phỏng vấn",
    prompts: [
      "Cách trả lời câu hỏi 'Hãy giới thiệu về bản thân bạn' tự tin và mạch lạc",
      "Cách xử lý câu hỏi tình huống về giải quyết mâu thuẫn hoặc áp lực công việc",
      "Bộ câu hỏi thông minh ứng viên nên đặt cho nhà tuyển dụng ở cuối buổi phỏng vấn",
    ],
  },
  {
    key: "CAREER",
    label: "Định hướng sự nghiệp",
    prompts: [
      "Lộ trình phát triển từ nhân viên chuyên môn lên cấp quản lý",
      "Kỹ năng cần chuẩn bị khi mở rộng sang lĩnh vực kinh doanh, vận hành hoặc quản trị",
      "Cách duy trì năng lượng và nâng cao năng lực cạnh tranh trong nghề nghiệp",
    ],
  },
  {
    key: "JOBS",
    label: "Tìm kiếm việc làm",
    prompts: [
      "Tiêu chí đánh giá văn hóa doanh nghiệp và cơ hội thăng tiến trước khi ứng tuyển",
      "Cách đọc hiểu bản mô tả công việc (JD) để nhận diện đúng yêu cầu thực tế",
      "Tìm kiếm cơ hội việc làm linh hoạt (Hybrid / Remote) tại Việt Nam",
    ],
  },
  {
    key: "APPLICATION",
    label: "Thư & Giao tiếp tuyển dụng",
    prompts: [
      "Cách viết thư ứng tuyển (Cover Letter) ngắn gọn, thuyết phục cho từng vị trí",
      "Mẫu email theo dõi tiến độ hồ sơ (Follow-up) chuyên nghiệp sau 5 ngày nộp đơn",
      "Cách viết thư cảm ơn sau buổi phỏng vấn để tạo ấn tượng tốt đẹp",
    ],
  },
  {
    key: "FINDWORK",
    label: "Hỗ trợ FINDWORK",
    prompts: [
      "Cách tạo và xuất CV chuyên nghiệp với công cụ Resume Builder",
      "Hướng dẫn lưu việc làm quan tâm và đồng bộ danh sách trên mọi thiết bị",
      "Cách theo dõi tiến độ và lịch phỏng vấn hồ sơ ứng tuyển trên FINDWORK",
    ],
  },
];

export const EN_CATEGORIES: CategoryMeta[] = [
  {
    key: "ALL",
    label: "All Suggestions",
    prompts: [
      "How to tailor your resume across various industries and roles",
      "STAR method interview strategies for practical scenarios",
      "Salary and compensation negotiation tactics after receiving an offer",
      "Tips for discovering transparent and verified jobs on FINDWORK",
    ],
  },
  {
    key: "CV",
    label: "CV Optimization",
    prompts: [
      "Quantifying career impact with key metrics and achievements",
      "ATS keyword optimization techniques for professional resumes",
      "Structuring effective resumes for career changers and transitioners",
    ],
  },
  {
    key: "INTERVIEW",
    label: "Interview Prep",
    prompts: [
      "How to craft a compelling and authentic 'Tell me about yourself'",
      "Navigating situational questions about conflict resolution and deadline pressure",
      "Smart questions candidates should ask interviewers during wrap-up",
    ],
  },
  {
    key: "CAREER",
    label: "Career Growth",
    prompts: [
      "Advancing from individual contributor to team lead or manager",
      "Essential capabilities when broadening into management and operations",
      "Staying competitive and maintaining career resilience in evolving markets",
    ],
  },
  {
    key: "JOBS",
    label: "Job Search",
    prompts: [
      "Evaluating company culture and career growth prior to applying",
      "Decoding job descriptions to understand real operational expectations",
      "Targeting hybrid and flexible employment opportunities across Vietnam",
    ],
  },
  {
    key: "APPLICATION",
    label: "Outreach & Letters",
    prompts: [
      "Writing concise and tailored cover letters for specialized roles",
      "Professional follow-up email template 5 days after submission",
      "Post-interview thank you note etiquette to reinforce interest",
    ],
  },
  {
    key: "FINDWORK",
    label: "FINDWORK Guide",
    prompts: [
      "Creating and exporting polished resumes with Resume Builder",
      "Saving bookmark jobs and syncing across mobile and desktop",
      "Tracking real-time application stages and interview schedules on FINDWORK",
    ],
  },
];
