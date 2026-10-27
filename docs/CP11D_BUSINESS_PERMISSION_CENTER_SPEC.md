# FINDWORK — CP11D PLATFORM SPECIFICATION
# BUSINESS PERMISSION CENTER (TRUNG TÂM PHÂN QUYỀN DOANH NGHIỆP)

- **Document Version:** 1.0.0-RFC
- **Status:** DRAFT / PENDING BACKEND IMPLEMENTATION (Codex CP11D Integration)
- **Author:** Senior React Architect & Enterprise Dashboard UX Engineer
- **Target Subsystem:** Findwork NestJS Backend + PostgreSQL + Prisma + Frontend Workspace
- **Target Branch / Epic:** `feat/cp11d-business-permissions`

---

## 1. TỔNG QUAN & BÀI TOÁN KIẾN TRÚC (EXECUTIVE SUMMARY)

### 1.1. Bối cảnh
FINDWORK cung cấp nền tảng kết nối tuyển dụng doanh nghiệp đa cấp độ (Multi-tenant B2B SaaS). Khi một Doanh nghiệp (Company) đăng ký tài khoản trên nền tảng, nền tảng cần một cơ chế phân quyền hai tầng độc lập (**Dual-Layer Authorization Architecture**) nhằm bảo vệ an toàn hệ thống, tuân thủ pháp lý và ngăn chặn hành vi lạm dụng tính năng:

```
┌──────────────────────────────────────────────────────────────────┐
│                   TẦNG 1: QUYỀN HẠN NỀN TẢNG                      │
│            (Platform-Granted Company Capabilities)               │
│                                                                  │
│  Super Admin cấp hoặc thu hồi từng năng lực đối với Doanh nghiệp  │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   TẦNG 2: VAI TRÒ NỘI BỘ                         │
│             (Internal Company Member Role & RBAC)                │
│                                                                  │
│   Owner / Admin / HR Manager / Recruiter / Hiring Manager        │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   QUYỀN HIỆU LỰC CUỐI CÙNG                       │
│                     (Effective Permission)                       │
│                                                                  │
│  Effective Permission = CompanyCapability && MemberRolePermission│
└──────────────────────────────────────────────────────────────────┘
```

### 1.2. Nguyên tắc bất di dịch
1. **Không bảo mật chỉ ở Frontend (Never implement frontend-only security):** Mọi thao tác kiểm soát phải được máy chủ (Backend) thẩm định thông qua NestJS Guards và Database constraints.
2. **Quyền nền tảng là điều kiện tiên quyết (Platform Capability is prerequisite):** Nếu Doanh nghiệp bị Super Admin thu hồi quyền `job.publish`, thì dù cá nhân thao tác là `COMPANY_OWNER` cũng không được phép công khai tin tuyển dụng.
3. **Vai trò nội bộ là điều kiện đủ (Member Role is sufficient within granted scope):** Nếu Doanh nghiệp có năng lực `team.invite`, nhưng nhân viên có vai trò `VIEWER` hoặc `HIRING_MANAGER` thì nhân viên đó vẫn không được phép mời thành viên.
4. **Không giả lập trạng thái ghi (No fake write state):** Khi Backend chưa có bảng và API chính thức, giao diện Admin hiển thị rõ ràng chế độ đặc tả kỹ thuật và vô hiệu hóa các checkbox chỉnh sửa để không lừa dối người vận hành.

---

## 2. DANH MỤC 10 NĂNG LỰC NỀN TẢNG (10 PLATFORM CAPABILITIES)

Dưới đây là 10 mã định danh năng lực chuẩn hóa (Permission Identifiers) cấp độ nền tảng dành cho Doanh nghiệp:

| STT | Mã định danh (`capabilityCode`) | Tên năng lực (Tiếng Việt) | Tên tiếng Anh | Phân loại | Mặc định (DN mới) | Mặc định (Đã duyệt) |
|-----|---------------------------------|---------------------------|---------------|-----------|-------------------|---------------------|
| 1 | `job.draft.create` | Tạo bản nháp tin tuyển dụng | Create draft jobs | Tuyển dụng | Bật (`true`) | Bật (`true`) |
| 2 | `job.draft.edit` | Chỉnh sửa tin tuyển dụng | Edit jobs | Tuyển dụng | Bật (`true`) | Bật (`true`) |
| 3 | `job.publish` | Đăng công khai tin tuyển dụng | Publish jobs | Tuyển dụng | Tắt (`false`) | Bật (`true`) |
| 4 | `job.close` | Đóng và lưu trữ tin tuyển dụng | Close jobs | Tuyển dụng | Bật (`true`) | Bật (`true`) |
| 5 | `application.view` | Xem danh sách & hồ sơ ứng viên | View applications | Ứng viên | Bật (`true`) | Bật (`true`) |
| 6 | `application.pipeline.manage` | Quản lý quy trình & chuyển vòng | Manage applicant pipeline | Ứng viên | Tắt (`false`) | Bật (`true`) |
| 7 | `interview.schedule` | Điều phối & lên lịch phỏng vấn | Schedule interviews | Phỏng vấn | Tắt (`false`) | Bật (`true`) |
| 8 | `team.invite` | Mời & quản lý thành viên nội bộ | Invite internal team members | Nhân sự | Tắt (`false`) | Bật (`true`) |
| 9 | `recruitment.analytics.view` | Báo cáo & phân tích tuyển dụng | View recruitment analytics | Thống kê | Tắt (`false`) | Bật (`true`) |
| 10 | `ai.business.access` | Trợ lý tuyển dụng Findwork AI | Access Business AI | Nâng cao | Tắt (`false`) | Bật (`true`) |

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU & PRISMA MIGRATION (CP11D)

### 3.1. Prisma Model đề xuất
Bổ sung vào `server/prisma/schema.prisma`:

```prisma
enum PlatformCapabilityCode {
  JOB_DRAFT_CREATE       @map("job.draft.create")
  JOB_DRAFT_EDIT         @map("job.draft.edit")
  JOB_PUBLISH            @map("job.publish")
  JOB_CLOSE              @map("job.close")
  APPLICATION_VIEW       @map("application.view")
  APPLICATION_PIPELINE   @map("application.pipeline.manage")
  INTERVIEW_SCHEDULE     @map("interview.schedule")
  TEAM_INVITE            @map("team.invite")
  RECRUITMENT_ANALYTICS  @map("recruitment.analytics.view")
  AI_BUSINESS_ACCESS     @map("ai.business.access")
}

model CompanyPlatformCapability {
  id                String                 @id @default(uuid()) @db.Uuid
  companyId         String                 @db.Uuid
  capabilityCode    PlatformCapabilityCode
  isGranted         Boolean                @default(false)
  grantedByUserId   String?                @db.Uuid
  grantedAt         DateTime?              @db.Timestamptz(6)
  revokedByUserId   String?                @db.Uuid
  revokedAt         DateTime?              @db.Timestamptz(6)
  revocationReason  String?                @db.VarChar(500)
  createdAt         DateTime               @default(now()) @db.Timestamptz(6)
  updatedAt         DateTime               @updatedAt @db.Timestamptz(6)

  company           Company                @relation(fields: [companyId], references: [id], onDelete: Cascade)
  grantedByUser     User?                  @relation("CapabilityGranter", fields: [grantedByUserId], references: [id], onDelete: SetNull)
  revokedByUser     User?                  @relation("CapabilityRevoker", fields: [revokedByUserId], references: [id], onDelete: SetNull)

  @@unique([companyId, capabilityCode])
  @@index([companyId, isGranted])
}
```

---

## 4. BỘ HỢP ĐỒNG API RESTFUL (ENDPOINTS & DTOS)

### 4.1. Lấy danh sách năng lực của doanh nghiệp
- **HTTP Method:** `GET`
- **Route:** `/admin/companies/:companyId/capabilities`
- **Required Permission:** System-level `company.view`
- **Response Format:**
```json
{
  "companyId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "companyName": "Tập đoàn Công nghệ Sao Khuê",
  "verificationStatus": "VERIFIED",
  "capabilities": [
    {
      "code": "job.publish",
      "name": "Đăng công khai tin tuyển dụng",
      "category": "RECRUITMENT",
      "isGranted": true,
      "grantedAt": "2026-10-27T08:30:00.000Z",
      "grantedBy": {
        "userId": "e812fa42-b13c-4e89-a2e6-71d2b1f89412",
        "email": "superadmin@findwork.vn"
      },
      "revocationReason": null
    }
  ]
}
```

### 4.2. Cập nhật hàng loạt năng lực doanh nghiệp
- **HTTP Method:** `PUT`
- **Route:** `/admin/companies/:companyId/capabilities`
- **Required Permission:** System-level `company.verify`
- **Request Body (DTO):**
```json
{
  "capabilities": [
    { "code": "job.publish", "isGranted": true },
    { "code": "ai.business.access", "isGranted": false, "reason": "Hết hạn gói tài trợ dùng thử AI" }
  ]
}
```

### 4.3. Bật/Tắt một năng lực riêng lẻ
- **HTTP Method:** `PATCH`
- **Route:** `/admin/companies/:companyId/capabilities/:capabilityCode`
- **Required Permission:** System-level `company.verify`
- **Request Body (DTO):**
```json
{
  "isGranted": false,
  "reason": "Doanh nghiệp có dấu hiệu đăng tin lừa đảo tuyển dụng, tạm khóa quyền publish."
}
```

---

## 5. THỰC THI KIỂM SOÁT TẠI BACKEND (POLICY ENFORCEMENT & GUARDS)

### 5.1. Guard hai tầng (`PlatformCapabilityGuard`)
Trong NestJS, bổ sung decorator `@RequirePlatformCapability(code)`:

```typescript
@Injectable()
export class PlatformCapabilityGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const companyId = req.params.companyId || req.body?.companyId;
    const requiredCapability = getMetadata(context);

    if (!requiredCapability) return true;

    const cap = await this.prisma.companyPlatformCapability.findUnique({
      where: { companyId_capabilityCode: { companyId, capabilityCode: requiredCapability } },
    });

    if (!cap || !cap.isGranted) {
      throw new ForbiddenException({
        code: "PLATFORM_CAPABILITY_DENIED",
        message: `Company does not have platform capability: ${requiredCapability}. Contact platform administration.`,
      });
    }

    return true;
  }
}
```

### 5.2. Nhật ký kiểm toán bắt buộc (Audit Logging)
Mọi thay đổi năng lực đều phải ghi nhận vào bảng `AuditLog`:
- `action`: `admin.company.capability.grant` hoặc `admin.company.capability.revoke`
- `targetType`: `CompanyPlatformCapability`
- `beforeData`: `{ isGranted: boolean }`
- `afterData`: `{ isGranted: boolean, reason: string | null }`

---

## 6. THIẾT KẾ TRẢI NGHIỆM GIAO DIỆN (UI SPECIFICATION)

1. **Hiển thị tại Chi tiết Doanh nghiệp Quản trị (`AdminCompanyDetail`):**
   - Một tab riêng biệt mang tên: **"Trung tâm Phân quyền (Permission Center)"**.
   - Bảng 10 năng lực chia nhóm trực quan: *Vận hành tuyển dụng*, *Quản lý ứng viên & phỏng vấn*, *Nhân sự & Báo cáo*, *Tính năng nâng cao (AI)*.
   - Mỗi hàng hiển thị:
     - Checkbox trạng thái (Bật/Tắt).
     - Tên năng lực & mô tả giải thích.
     - Badge trạng thái hiện tại (Đã kích hoạt / Bị hạn chế).
     - Badge thông báo tích hợp: **"Chờ Backend CP11D"**.
2. **Quy tắc an toàn chống hiểu lầm (Zero Deception Policy):**
   - Các nút checkbox bị khóa tương tác (disabled) kèm nhãn chú thích: *"Tính năng đang chờ kích hoạt từ máy chủ Backend CP11D. Super Admin không thể lưu trạng thái giả lập."*
   - Cung cấp nút xem nhanh tài liệu kỹ thuật RFC (`Xem đặc tả CP11D`).
