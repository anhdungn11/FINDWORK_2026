# FINDWORK — QUY TRÌNH KIỂM THỬ TRÌNH DUYỆT (FRONTEND BROWSER SMOKE CHECKLIST)

Tài liệu này đóng vai trò cầu nối tích hợp (Integration Bridge) giữa Frontend FINDWORK (`D:\DACSN\Find-Work-Submission`) và Backend NestJS (`D:\DACSN\Find-Work-Submission-Backend-MVP`), đối chiếu trực tiếp với `server/docs/SUBMISSION_BROWSER_E2E_HANDOFF.md`.

---

## 1. THIẾT LẬP VÀ ĐIỀU KIỆN TIÊN QUYẾT (PRE-CONDITIONS)

- **Môi trường Backend**: Chạy trên `http://127.0.0.1:3000` trỏ tới cơ sở dữ liệu `findwork_test` (`schema=public`).
- **Môi trường Frontend**: Chạy trên `http://localhost:5173` (hoặc cổng Vite quy định), proxy `/api/v1` về backend.
- **Cổng an toàn dữ liệu (`ENABLE_LIVE_WRITES`)**:
  - Khi chạy smoke ở chế độ kiểm tra giao diện/đọc: `ENABLE_LIVE_WRITES: false`. Nút "Gửi đơn ứng tuyển" ở Bước 4 sẽ hiển thị thông báo an toàn và bị vô hiệu hóa để bảo vệ DB.
  - Khi được phê duyệt chạy E2E gửi đơn thật: Chuyển cờ `ENABLE_LIVE_WRITES: true` tại `src/features/candidate/profile/config/candidateIntegrationConfig.ts`.
- **Dữ liệu kiểm thử (Fixtures)**: Phải sử dụng tài khoản và Job UUID do CLI `test/submission-browser-fixture.ts` tạo ra (sau khi được phê duyệt riêng), không dùng Job Demo số (`/jobs/1`) hay CV nháp cục bộ.

---

## 2. MA TRẬN QUY TRÌNH 15 BƯỚC BROWSER E2E

| Bước | Hành động & Mục tiêu | Kỳ vọng kiểm chứng | Trạng thái kỹ thuật |
| :--- | :--- | :--- | :--- |
| **01** | **Đăng nhập Candidate Test**<br>`POST /api/v1/auth/login` | Nhập email/password ứng viên test. Nhận Access Token trong bộ nhớ và HTTP-only Cookie `refreshToken`. Header điều hướng hiển thị tên/avatar ứng viên. | **ALREADY TESTED** (Unit/Store)<br>**READY FOR TEST** (Browser) |
| **02** | **Xác minh CandidateProfile tồn tại**<br>`GET /api/v1/candidate/bootstrap` | Trả về `profile.state === "exists"`. Ứng viên không bị chặn bởi màn hình Onboarding bắt buộc. Nếu `not_created`, hiển thị banner hướng dẫn hoàn thiện hồ sơ. | **ALREADY TESTED** (Unit/Router)<br>**READY FOR TEST** (Browser) |
| **03** | **Kiểm tra CV Builder READY & Version**<br>`GET /api/v1/candidate/resumes` | Danh sách trả về ít nhất 1 CV có `sourceType === "BUILDER"` và `status === "READY"`. Version hợp lệ có `versionNumber >= 1`. | **ALREADY TESTED** (Unit/Normalizer)<br>**READY FOR TEST** (Browser) |
| **04** | **Truy cập Public Job UUID thật**<br>`GET /api/v1/jobs/:jobId` | Mở `/jobs/<job-uuid>/apply`. Tiêu đề công việc, công ty, mức lương, nơi làm việc và danh sách câu hỏi sàng lọc được tải chính xác từ Backend. Không hiển thị banner "Demo". | **ALREADY TESTED** (Unit/Parser)<br>**READY FOR TEST** (Browser) |
| **05** | **Bước 1: Chọn CV ứng tuyển** | Giao diện hiển thị danh sách CV với huy hiệu "Sẵn sàng ứng tuyển" (nếu là Builder READY) hoặc cảnh báo nếu là PDF tải lên. Nút "Tiếp tục" chỉ kích hoạt khi chọn đúng CV hợp lệ. | **ALREADY TESTED** (Unit)<br>**READY FOR TEST** (Browser) |
| **06** | **Bước 2: Thông tin liên hệ & Thời gian làm việc** | Tự động điền (prefill) họ tên, email từ CV/tài khoản. Người dùng nhập số điện thoại (8–15 chữ số), địa chỉ, chọn hình thức sẵn sàng làm việc (`availability`) và phương thức liên hệ ưu tiên (`preferredContactMethod`). Thư giới thiệu (`coverLetter`) tùy chọn tối đa 5.000 ký tự. | **ALREADY TESTED** (Unit/Validation)<br>**READY FOR TEST** (Browser) |
| **07** | **Bước 3: Trả lời câu hỏi sàng lọc (Screening Questions)** | Hiển thị đủ các câu hỏi theo đúng `displayOrder` từ tin tuyển dụng. Hỗ trợ 5 loại: `TEXT`, `TEXTAREA`, `YES_NO` (cho phép chọn Không/false), `SELECT`, `MULTI_SELECT`. Chặn tiếp tục nếu thiếu câu hỏi bắt buộc. | **ALREADY TESTED** (Unit/256 tests)<br>**READY FOR TEST** (Browser) |
| **08** | **Bước 4: Xem lại toàn bộ đơn ứng tuyển (Review)** | Hiển thị bố cục 7 khối rõ ràng: Công việc, CV kèm phiên bản snapshot, Thông tin liên hệ, Sẵn sàng làm việc, Thư giới thiệu, Danh sách câu trả lời sàng lọc (hiển thị "Chưa trả lời" cho câu tùy chọn trống, không lộ technical keys thô), và Nút gửi đơn. | **ALREADY TESTED** (Unit)<br>**READY FOR TEST** (Browser) |
| **09** | **Xác nhận nộp đơn bằng API thật**<br>`POST /api/v1/jobs/:jobId/applications` | *Yêu cầu: ENABLE_LIVE_WRITES: true*. Chốt chặn `useRef` khóa đồng bộ ngay lập tức khi click; nút submit chuyển sang "Đang gửi đơn...". Payload gửi đúng schema Backend. | **READY FOR TEST**<br>*(Chờ mở cổng Live Writes)* |
| **10** | **Xác minh Application Response thành công** | Backend trả về HTTP 201 với `Application` snapshot. Frontend hiển thị màn hình chúc mừng kèm mã đơn ứng tuyển (`id`), thời gian ghi nhận và trạng thái `SUBMITTED`. Bản nháp draft trong `sessionStorage` tự động được dọn dẹp sạch sẽ. | **READY FOR TEST**<br>*(Chờ mở cổng Live Writes)* |
| **11** | **F5 kiểm tra tính toàn vẹn trạng thái** | Khi người dùng nhấn F5 tại trang thành công, không bị lỗi render hoặc quay lại wizard điền dở. Nếu vào lại `/jobs/<job-uuid>/apply`, hệ thống thông báo vị trí này đã được nộp đơn trước đó. | **READY FOR TEST** (Browser) |
| **12** | **Recruiter xem Application**<br>`GET /api/v1/companies/:companyId/jobs/:jobId/applications/:id` | Đăng nhập tài khoản Recruiter/Owner. Mở danh sách đơn ứng tuyển của công việc. Đơn mới xuất hiện đầu danh sách; xem chi tiết hiển thị đúng snapshot CV, liên hệ và câu trả lời. | **READY FOR TEST** (Backend E2E đã PASS)<br>*(Frontend Recruiter view)* |
| **13** | **Recruiter thay đổi trạng thái đơn**<br>`PATCH /.../applications/:id/status` | Recruiter chuyển trạng thái từ `SUBMITTED` $\rightarrow$ `REVIEWING` (kèm version optimistic lock). Backend lưu lịch sử trạng thái `statusHistory`. | **READY FOR TEST** (Backend E2E đã PASS) |
| **14** | **Candidate kiểm tra trạng thái cập nhật**<br>`GET /api/v1/candidate/applications` | Ứng viên đăng nhập lại, vào `/candidate/applications`. Đơn ứng tuyển hiển thị trạng thái mới "Đang xem xét" (`REVIEWING`). | **ALREADY TESTED** (API normalizer)<br>**READY FOR TEST** (Browser) |
| **15** | **Kiểm tra Unauthorized Access & Duplicate Submission** | - Gửi lại đơn cho cùng Job: Backend trả về 409 `APPLICATION_DUPLICATE`; Frontend hiển thị thông báo tiếng Việt rõ ràng, giữ khóa không cho spam thêm.<br>- Chưa đăng nhập: Bị chuyển hướng an toàn tới trang Đăng nhập kèm deep link `returnTo`. | **ALREADY TESTED** (Unit/Guard)<br>**READY FOR TEST** (Browser) |

---

## 3. PHÂN ĐỊNH TRẠNG THÁI HIỆN TẠI (STATUS SUMMARY)

- **ALREADY TESTED**:
  - Application Wizard 4 bước & Dynamic Screening Questions (5 loại câu hỏi).
  - Khôi phục bản nháp sessionStorage và phân định Job Demo / Job UUID thật.
  - Phân loại CV Builder READY hợp lệ (case-insensitive).
  - Chống double-submit bằng synchronous ref lock.
  - Bộ normalizer dữ liệu DTO và ánh xạ mã lỗi HTTP (`400`, `401`, `403`, `404`, `409`, `500`).
  - Toàn bộ 256/256 unit tests PASS.
- **READY FOR TEST**:
  - Quy trình browser hoàn chỉnh từ Bước 1 đến Bước 15, sẵn sàng chạy ngay khi fixture được tạo trên `findwork_test`.
- **BLOCKED**:
  - Bước nộp đơn thật (POST) đang bị chặn có chủ đích bởi cờ an toàn `ENABLE_LIVE_WRITES: false` theo quy định Sprint.
  - Đang chờ chạy lệnh CLI tạo fixture accounts/Job UUID từ Backend khi có sự phê duyệt.
- **NOT IMPLEMENTED**:
  - Không có: Tính năng nộp đơn đính kèm file PDF tùy ý ngoài CV Builder (Backend contract quy định chỉ chấp nhận CV Builder online có version snapshot).
