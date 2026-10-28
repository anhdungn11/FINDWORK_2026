# FINDWORK — CP13B PLATFORM SPECIFICATION
# EMPLOYER BUSINESS AI API CONTRACT & ARCHITECTURE RFC

- **Document Version:** 1.0.0-RFC
- **Status:** APPROVED CONTRACT / PENDING BACKEND IMPLEMENTATION (Codex CP13B Integration)
- **Author:** Senior React Engineer, AI Product Designer & Enterprise UX Specialist
- **Target Subsystem:** Findwork NestJS Backend + PostgreSQL + Prisma + OpenAI/Gemini Provider + Employer Workspace
- **Target Branch / Epic:** `feat/cp13b-employer-business-ai`

---

## 1. TỔNG QUAN & KẾT QUẢ AUDIT HỢP ĐỒNG (EXECUTIVE AUDIT FINDINGS)

### 1.1. Kết quả kiểm toán hệ thống AI hiện tại (Audit Findings)
Qua quá trình rà soát toàn diện mã nguồn Backend (`server/src/modules/ai/` và Prisma Schema `server/prisma/schema.prisma`):

1. **Chỉ tồn tại AI phạm vi Cá nhân / Khách vãng lai (Candidate & Guest AI Only):**
   - Các endpoint hiện tại: `POST /ai/guest-sessions`, `POST /ai/conversations`, `GET /ai/conversations`, `GET /ai/conversations/:id/messages`, `POST /ai/conversations/:id/messages`, `POST /ai/transcriptions`, `DELETE /ai/conversations/:id`.
   - Mô hình dữ liệu Prisma: `AiConversation` chỉ liên kết với `ownerUserId` (User cá nhân) hoặc `guestSessionId` (Khách vãng lai). **Hoàn toàn không có trường `companyId`**.
   - Hạn mức (`AiUsageBucket`) được tính toán dựa trên khóa `u:<userId>` hoặc `g:<sessionId>`.
   - Prompt chỉ dẫn hệ thống cố định: *"You are FINDWORK's career and recruitment assistant. Give practical, honest guidance. Do not claim access to private company, candidate, or job data."*

2. **Chưa có Endpoint AI phạm vi Doanh nghiệp (Zero Company-Scoped AI Endpoints):**
   - Không tồn tại bất kỳ endpoint nào theo định dạng `/companies/:companyId/ai/*`.
   - Không có bộ kiểm tra quyền hạn doanh nghiệp (Company Permission Guard) cho các tác vụ AI.
   - Chưa có các endpoint nghiệp vụ: Soạn thảo JD, Rà soát chống định kiến JD, Gợi ý câu hỏi sàng lọc, Bộ câu hỏi phỏng vấn năng lực, Lập kế hoạch tuyển dụng.

3. **Nguy cơ rò rỉ dữ liệu và ô nhiễm ngữ cảnh (Context Pollution Risk):**
   - Trước CP13B, `EmployerLayout` nhúng `FindworkAiFloatingWidget` dùng chung lịch sử `localStorage.findwork.aiAssistant.history` và API cá nhân, dẫn đến việc người dùng là Nhà tuyển dụng bị trộn lẫn câu hỏi nghề nghiệp của Ứng viên với dữ liệu kinh doanh của Doanh nghiệp.

### 1.2. Quyết định kiến trúc CP13B
- **Tách biệt tuyệt đối (Complete Architectural Isolation):** Toàn bộ chức năng Trợ lý AI Doanh nghiệp (Business AI) được cô lập bên trong Không gian Doanh nghiệp (`/employer/ai`).
- **Phân quyền đa tầng (Dual-Layer RBAC):** Mọi request AI Doanh nghiệp bắt buộc phải đi qua `AccessTokenGuard` và `CompanyPermissionGuard` (phạm vi: `COMPANY`). Người dùng có vai trò `VIEWER` không được phép tạo nội dung AI làm thay đổi hoặc tác động đến dữ liệu tuyển dụng.
- **Nguyên tắc AI Tuyển dụng có trách nhiệm (Responsible AI):**
  - Tuyệt đối không tự động ra quyết định tuyển dụng/từ chối ứng viên.
  - Tuyệt đối không tự động xuất bản (publish) tin tuyển dụng hoặc tự động chuyển trạng thái hồ sơ.
  - Tuyệt đối không gửi dữ liệu CV riêng tư của ứng viên đến nhà cung cấp LLM mà không có sự đồng ý rõ ràng.

---

## 2. KIẾN TRÚC MÔ HÌNH DỮ LIỆU ĐỀ XUẤT CHO CODEX (DATABASE SCHEMA RFC)

Để hỗ trợ lưu vết và quản lý hạn mức theo Doanh nghiệp, Codex nên bổ sung vào `prisma/schema.prisma`:

```prisma
// Lịch sử tạo và sử dụng AI của Doanh nghiệp
model CompanyAiGenerationLog {
  id             String    @id @default(uuid()) @db.Uuid
  companyId      String    @db.Uuid
  actorUserId    String    @db.Uuid
  feature        String    @db.VarChar(50) // DRAFT_JOB | IMPROVE_JOB | SCREENING_QUESTIONS | INTERVIEW_QUESTIONS | RECRUITMENT_PLAN
  model          String    @db.VarChar(50)
  inputTokens    Int       @default(0)
  outputTokens   Int       @default(0)
  costMicros     Int       @default(0)
  createdAt      DateTime  @default(now()) @db.Timestamptz(6)

  company        Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  actor          User      @relation(fields: [actorUserId], references: [id], onDelete: Restrict)

  @@index([companyId, createdAt])
  @@index([actorUserId, createdAt])
}

// Hạn mức AI theo từng Doanh nghiệp
model CompanyAiBucket {
  companyId           String    @id @db.Uuid
  monthlyCreditsTotal Int       @default(1000)
  creditsRemaining    Int       @default(1000)
  dailyRequestCount   Int       @default(0)
  dailyBurstLimit     Int       @default(100)
  resetDay            DateTime  @db.Date
  updatedAt           DateTime  @updatedAt @db.Timestamptz(6)

  company             Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
}
```

---

## 3. DANH SÁCH 6 API CONTRACTS CHO CODEX TRIỂN KHAI

Tất cả các endpoint dưới đây đều có tiền tố: `/companies/:companyId/ai`

### 3.1. POST `/companies/:companyId/ai/draft-job`
- **Mục đích:** Soạn thảo mô tả công việc (JD) hoàn chỉnh từ thông tin đầu vào.
- **Yêu cầu bảo mật:** `AccessTokenGuard`, `CompanyPermissionGuard`.
- **Yêu cầu quyền:** `company.update` (OWNER, ADMIN, HR_MANAGER, RECRUITER).
- **Request Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **Request Body (JSON):**
  ```json
  {
    "title": "Senior React Developer",
    "department": "Engineering",
    "employmentType": "FULL_TIME",
    "workplaceType": "HYBRID",
    "experienceLevel": "SENIOR",
    "location": "Hồ Chí Minh",
    "salaryRange": "35,000,000 - 50,000,000 VND",
    "primarySkills": ["React", "TypeScript", "Next.js"],
    "responsibilitiesBrief": "Phát triển giao diện web hiệu năng cao, code review",
    "requirementsBrief": "5 năm kinh nghiệm React, tư duy kiến trúc web tốt",
    "tone": "PROFESSIONAL"
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "title": "Senior React Developer",
    "summary": "Chúng tôi đang tìm kiếm một Senior React Developer gia nhập đội ngũ...",
    "responsibilities": [
      "Thiết kế, xây dựng và duy trì các ứng dụng web với React và TypeScript.",
      "Tối ưu hóa hiệu năng ứng dụng và trải nghiệm người dùng (Core Web Vitals).",
      "Phối hợp chặt chẽ với Product Designer và Backend Engineers."
    ],
    "requirements": [
      "Tối thiểu 5 năm kinh nghiệm phát triển phần mềm với ReactJS và hệ sinh thái liên quan.",
      "Thành thạo TypeScript, State Management, và Modern Frontend Tooling.",
      "Kinh nghiệm viết Unit Test và tích hợp CI/CD."
    ],
    "niceToHave": [
      "Hiểu biết sâu về Server-Side Rendering (Next.js) và Micro-frontends."
    ],
    "benefits": [
      "Mức lương hấp dẫn: 35,000,000 - 50,000,000 VND.",
      "Bảo hiểm sức khỏe cao cấp và kiểm tra sức khỏe định kỳ hàng năm.",
      "Chính sách làm việc Hybrid linh hoạt và hỗ trợ thiết bị làm việc hiện đại."
    ],
    "suggestedSkills": ["React", "TypeScript", "Next.js", "Performance Optimization"],
    "fullMarkdown": "# Senior React Developer\n\n..."
  }
  ```

---

### 3.2. POST `/companies/:companyId/ai/improve-job`
- **Mục đích:** Đánh giá chất lượng JD, kiểm tra tính rõ ràng, tính bao hàm (anti-bias) và tuân thủ pháp luật lao động.
- **Yêu cầu quyền:** `company.update` hoặc `company.view`.
- **Request Body (JSON):**
  ```json
  {
    "jobId": "optional-uuid-if-existing-job",
    "title": "Lead Software Engineer",
    "description": "Nội dung mô tả công việc cần rà soát...",
    "requirements": "Nội dung yêu cầu ứng viên cần rà soát...",
    "focusArea": "INCLUSIVITY"
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "improvedDescription": "Nội dung mô tả công việc đã được tối ưu hóa giọng điệu...",
    "improvedRequirements": "Nội dung yêu cầu đã được chuẩn hóa, loại bỏ từ ngữ gây áp lực hoặc định kiến...",
    "critique": [
      {
        "category": "inclusivity",
        "feedback": "Cụm từ 'dưới 35 tuổi' vi phạm nguyên tắc chống phân biệt tuổi tác trong Bộ Luật Lao Động. Đã thay bằng 'Có kinh nghiệm tương đương cấp bậc'.",
        "severity": "CRITICAL"
      },
      {
        "category": "clarity",
        "feedback": "Nên cụ thể hóa kết quả mong đợi trong 90 ngày đầu tiên của vị trí này.",
        "severity": "RECOMMENDED"
      }
    ],
    "readabilityScore": 86,
    "inclusivityScore": 94
  }
  ```

---

### 3.3. POST `/companies/:companyId/ai/screening-questions`
- **Mục đích:** Gợi ý danh sách câu hỏi sàng lọc ứng viên tương thích với mô hình câu hỏi tuyển dụng của FINDWORK.
- **Yêu cầu quyền:** `company.update` hoặc `company.view`.
- **Request Body (JSON):**
  ```json
  {
    "jobTitle": "Golang Backend Developer",
    "keySkills": ["Golang", "gRPC", "PostgreSQL", "Kafka"],
    "experienceYears": 3,
    "questionCount": 4
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "jobTitle": "Golang Backend Developer",
    "questions": [
      {
        "question": "Bạn đã có bao nhiêu năm kinh nghiệm lập trình thực tế với Golang?",
        "type": "NUMBER",
        "isRequired": true,
        "idealAnswer": ">= 3",
        "competencyTarget": "Kinh nghiệm chuyên môn cốt lõi"
      },
      {
        "question": "Bạn đã từng triển khai hệ thống phân tán sử dụng Kafka và gRPC trong môi trường Production chưa?",
        "type": "YES_NO",
        "isRequired": true,
        "idealAnswer": "Có",
        "competencyTarget": "Kiến trúc hệ thống & Message Queue"
      },
      {
        "question": "Mức độ tự tin của bạn trong việc tối ưu hóa câu truy vấn và chỉ mục trên PostgreSQL?",
        "type": "SINGLE_CHOICE",
        "isRequired": false,
        "options": ["Cơ bản", "Khá", "Thành thạo", "Chuyên sâu (Query Plan, Indexing)"],
        "competencyTarget": "Cơ sở dữ liệu"
      },
      {
        "question": "Mô tả ngắn gọn về sự cố lớn nhất bạn từng xử lý trong hệ thống backend và cách bạn khắc phục.",
        "type": "TEXT",
        "isRequired": false,
        "competencyTarget": "Xử lý sự cố & Troubleshooting"
      }
    ]
  }
  ```

---

### 3.4. POST `/companies/:companyId/ai/interview-questions`
- **Mục đích:** Xây dựng ngân hàng câu hỏi phỏng vấn theo phương pháp STAR (Situation, Task, Action, Result) và khung năng lực.
- **Yêu cầu quyền:** `company.view`.
- **Request Body (JSON):**
  ```json
  {
    "jobTitle": "Frontend Tech Lead",
    "level": "LEAD",
    "stage": "TECHNICAL",
    "focusSkills": ["Micro-frontends", "Design System", "Mentoring"]
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "jobTitle": "Frontend Tech Lead",
    "stage": "TECHNICAL",
    "categories": [
      {
        "categoryName": "Năng lực Kiến trúc & Kỹ thuật Chuyên sâu",
        "questions": [
          {
            "question": "Hãy kể lại một trường hợp bạn phải quyết định lựa chọn công nghệ cho một dự án lớn giữa áp lực thời gian và chất lượng. Bạn đã cân nhắc những yếu tố nào?",
            "purpose": "Đánh giá tư duy kiến trúc và khả năng kiểm soát đánh đổi (Trade-off).",
            "sampleEvaluationCriteria": "Ứng viên giải thích rõ các lựa chọn, rủi ro, và sự đồng thuận của team.",
            "redFlags": "Đưa ra quyết định cảm tính, không dựa trên dữ liệu hoặc không cân nhắc năng lực đội ngũ."
          }
        ]
      },
      {
        "categoryName": "Kỹ năng Dẫn dắt & Phát triển Đội ngũ (Leadership)",
        "questions": [
          {
            "question": "Làm thế nào để bạn nâng cao chất lượng code và văn hóa code review trong một nhóm gồm nhiều cấp độ kỹ năng khác nhau?",
            "purpose": "Đánh giá khả năng huấn luyện (mentorship) và xây dựng văn hóa kỹ thuật lành mạnh.",
            "sampleEvaluationCriteria": "Có phương pháp tiếp cận mang tính xây dựng: tự động hóa linting/CI trước, tập trung vào kiến trúc thay vì bắt bẻ cú pháp.",
            "redFlags": "Chỉ trích gay gắt hoặc vi mô hóa (micromanage)."
          }
        ]
      }
    ]
  }
  ```

---

### 3.5. POST `/companies/:companyId/ai/recruitment-plan`
- **Mục đích:** Xây dựng lộ trình kế hoạch tuyển dụng, phân bổ kênh tiếp cận và các mốc thời gian KPI.
- **Yêu cầu quyền:** `company.view`.
- **Request Body (JSON):**
  ```json
  {
    "jobTitle": "Senior DevOps Engineer",
    "targetHires": 2,
    "targetTimelineDays": 30,
    "urgencyLevel": "HIGH"
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "jobTitle": "Senior DevOps Engineer",
    "estimatedTimeToHire": "30 ngày làm việc",
    "phases": [
      {
        "phaseName": "Giai đoạn 1: Chuẩn bị & Sourcing (Tuần 1)",
        "timelineWeeks": "Ngày 1 - 7",
        "keyActivities": [
          "Thống nhất JD và tiêu chí đánh giá giữa HR và Trưởng bộ phận Kỹ thuật.",
          "Đăng tin tuyển dụng trên FINDWORK và các hội nhóm chuyên môn DevOps/Cloud.",
          "Chủ động liên hệ trực tiếp (direct sourcing) 10-15 ứng viên tiềm năng."
        ],
        "recommendedSourcingChannels": ["FINDWORK Job Board", "LinkedIn Talent", "DevOps Vietnam Community"],
        "kpiMilestones": ["Thu thập tối thiểu 20 hồ sơ hợp lệ", "Sàng lọc 8 ứng viên vào Vòng 1"]
      },
      {
        "phaseName": "Giai đoạn 2: Phỏng vấn Kỹ thuật & Thực hành (Tuần 2 - 3)",
        "timelineWeeks": "Ngày 8 - 21",
        "keyActivities": [
          "Phỏng vấn kỹ thuật trực tiếp hoặc qua Zoom.",
          "Đánh giá bài tập thực hành (Hands-on Architecture Test)."
        ],
        "recommendedSourcingChannels": ["Danh sách rút gọn từ Vòng 1"],
        "kpiMilestones": ["Chọn 3-4 ứng viên xuất sắc vào Vòng chung khảo"]
      },
      {
        "phaseName": "Giai đoạn 3: Phỏng vấn Văn hóa, Offer & Tiếp nhận (Tuần 4)",
        "timelineWeeks": "Ngày 22 - 30",
        "keyActivities": [
          "Trao đổi chế độ đãi ngộ và gửi Thư mời nhận việc (Offer Letter).",
          "Chuẩn bị kế hoạch tiếp nhận và trang thiết bị làm việc."
        ],
        "recommendedSourcingChannels": ["Ứng viên được chọn"],
        "kpiMilestones": ["Đạt 2/2 chỉ tiêu nhận offer và ký kết hợp đồng"]
      }
    ],
    "riskMitigationTips": [
      "DevOps là vị trí khan hiếm nhân lực, nên phản hồi kết quả phỏng vấn trong vòng 24-48 giờ.",
      "Chuẩn bị phương án làm việc linh hoạt (Remote/Hybrid) để tăng sức hút đối với ứng viên cấp cao."
    ]
  }
  ```

---

### 3.6. GET `/companies/:companyId/ai/status` & GET `/companies/:companyId/ai/quota`
- **Mục đích:** Kiểm tra trạng thái sẵn sàng của dịch vụ AI và kiểm tra hạn mức tín dụng còn lại của Doanh nghiệp.
- **Yêu cầu quyền:** `company.view`.
- **Response Success (200 OK):**
  ```json
  {
    "companyId": "uuid-here",
    "planName": "Enterprise Tier",
    "monthlyCreditsTotal": 1000,
    "monthlyCreditsRemaining": 940,
    "dailyRequestsUsed": 6,
    "dailyRequestsLimit": 100,
    "renewsAt": "2026-11-01T00:00:00.000Z"
  }
  ```

---

## 4. MÃ LỖI VÀ QUY TẮC PHẢN HỒI (HTTP ERROR CODES)

| Mã HTTP | Mã lỗi (`code`) | Mô tả | Xử lý tại Frontend |
|---------|-----------------|-------|---------------------|
| `400` | `AI_MESSAGE_INVALID` | Tham số gửi lên không đúng định dạng hoặc vượt quá độ dài quy định. | Hiển thị thông báo lỗi trên form. |
| `401` | `AI_AUTH_REQUIRED` | Thiếu hoặc token đăng nhập hết hạn. | Chuyển hướng đến `/employer/login`. |
| `403` | `COMPANY_AI_FORBIDDEN` | Tài khoản không có vai trò phù hợp trong Doanh nghiệp (ví dụ: VIEWER). | Vô hiệu hóa nút gửi, hiển thị cảnh báo phân quyền. |
| `404` | `COMPANY_AI_NOT_IMPLEMENTED` | Endpoint chưa được triển khai trên máy chủ Backend. | Hiển thị giao diện chẩn đoán trung thực (Honest Diagnostic State). |
| `429` | `AI_COMPANY_QUOTA_EXCEEDED` | Doanh nghiệp đã dùng hết định mức yêu cầu trong ngày/tháng. | Hiển thị thông báo vượt hạn mức, khuyến nghị liên hệ Admin. |
| `503` | `AI_PROVIDER_UNAVAILABLE` | Nhà cung cấp LLM (OpenAI/Gemini) gặp sự cố mạng hoặc chưa cấu hình API Key. | Hiển thị thông báo lỗi nhà cung cấp, bảo toàn dữ liệu form. |

---

## 5. NGUYÊN TẮC BẢO VỆ DỮ LIỆU & QUYỀN RIÊNG TƯ (PRIVACY GUARANTEES)

1. **Không truyền CV ứng viên thô ra ngoài (Zero Raw CV Transmission):** Tuyệt đối không gửi tệp PDF/Docx hoặc toàn bộ thông tin định danh cá nhân (PII) của ứng viên lên OpenAI/Gemini API khi chưa có sự ủy quyền rõ ràng.
2. **Không tự động quyết định (Zero Automated Adverse Action):** Mọi quyết định thay đổi trạng thái tuyển dụng (`REJECTED`, `OFFERED`, `SHORTLISTED`) phải do tài khoản thành viên nội bộ thực hiện có xác nhận.
3. **Phân tách bộ nhớ đệm (Cache & Storage Isolation):** Frontend lưu trữ form draft tạm thời trong `localStorage.findwork.employer.ai.draftInput`, tuyệt đối không đọc/ghi vào `findwork.aiAssistant.history` của ứng viên.
