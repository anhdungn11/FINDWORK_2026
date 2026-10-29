# FINDWORK — REPORTING & ANALYTICS BACKEND API SPECIFICATION
**Version:** 1.0.0  
**Target Audience:** Codex / Backend Engineering Team  
**Scope:** Admin Platform Reporting & Employer Recruitment Progress Reports  
**Status:** PROPOSED & READY FOR IMPLEMENTATION

---

## 1. Executive Summary & Purpose

FINDWORK currently provides:
- Single-point current-state snapshot counts via `GET /api/v1/admin/dashboard` (`users`, `activeUsers`, `companies`, `activeCompanies`, `pendingCompanies`, `jobs`, `publishedJobs`, `applications`).
- Entity-specific paginated lists (`GET /admin/users`, `/admin/companies`, `/admin/jobs`, `/companies/:companyId/jobs`, `/companies/:companyId/jobs/:jobId/applications`).

However, the platform lacks:
1. **Period-bound reporting aggregates:** Calculating event occurrences (e.g. new registrations, jobs published, applications submitted) during a specific date window (`[startDate, endDate]`).
2. **Company-wide recruitment pipeline aggregates:** Single-query aggregation of an employer's candidate pipeline across all jobs (or filtered by job) without client-side N+1 roundtrips.
3. **Interview operational aggregates:** Summary counts of scheduled, completed, and cancelled interviews for an employer.

This document specifies the exact REST contracts for Codex integration:
1. `GET /api/v1/admin/reports/summary` (Admin Progress & Summary Report)
2. `GET /api/v1/companies/:companyId/reports/recruitment` (Employer Recruitment Progress Report)

---

## 2. Admin Reporting API Contract

### `GET /api/v1/admin/reports/summary`

Provides comprehensive operational reporting for platform administrators, separating **all-time cumulative snapshot counts** from **period-specific event occurrences** and **pending operational backlog items**.

#### 2.1 Security & Authorization
- **Authentication:** Bearer token (HTTP Authorization header).
- **Scope:** `SYSTEM`.
- **Required Grants / Permissions:** `user.view`, `company.view`, `job.view`, `audit.view`.
- **Access Denials:**
  - `401 Unauthorized`: Token missing, expired, or invalid.
  - `403 Forbidden`: Authenticated user lacks required SYSTEM admin permissions (e.g. regular candidate or company employer).

#### 2.2 Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `period` | `string` | No | `30d` | Preset time range: `7d` (7 days), `30d` (30 days), `90d` (90 days), `all` (all time), or `custom`. |
| `startDate` | `string (ISO 8601)` | Conditional | — | Required when `period=custom`. Start of reporting period (inclusive, UTC). Example: `2026-10-01T00:00:00.000Z`. |
| `endDate` | `string (ISO 8601)` | Conditional | — | Required when `period=custom`. End of reporting period (inclusive, UTC). Example: `2026-10-29T23:59:59.999Z`. |

#### 2.3 Response Payload Schema (`200 OK`)

```json
{
  "period": {
    "key": "30d",
    "startDate": "2026-09-29T00:00:00.000Z",
    "endDate": "2026-10-29T23:59:59.999Z",
    "generatedAt": "2026-10-29T13:30:00.000Z"
  },
  "snapshot": {
    "users": {
      "total": 1250,
      "active": 1180,
      "suspended": 50,
      "disabled": 20
    },
    "companies": {
      "total": 85,
      "active": 72,
      "suspended": 8,
      "archived": 5,
      "verified": 60,
      "pendingVerification": 15,
      "rejectedVerification": 10
    },
    "jobs": {
      "total": 340,
      "published": 210,
      "draft": 45,
      "paused": 35,
      "closed": 50
    },
    "applications": {
      "total": 4820
    }
  },
  "periodEvents": {
    "newUsersRegistered": 142,
    "newCompaniesRegistered": 12,
    "companiesVerified": 10,
    "companiesRejected": 2,
    "jobsPosted": 48,
    "applicationsSubmitted": 620,
    "jobsClosedByAdmin": 3
  },
  "operationalBacklog": {
    "pendingVerificationQueue": 15,
    "suspendedUsersQueue": 50,
    "suspendedCompaniesQueue": 8
  },
  "commercialStatus": {
    "revenueAndBilling": {
      "status": "UNIMPLEMENTED",
      "monetizationActive": false,
      "totalRevenueVnd": 0,
      "note": "Chưa triển khai gói dịch vụ thu phí hoặc cổng thanh toán trên phiên bản hiện tại (Theo lộ trình thương mại hóa)"
    },
    "enterprisePartnerships": {
      "status": "PLANNED",
      "activePartnershipsCount": 0,
      "note": "Chương trình đối tác doanh nghiệp và kết nối API ngoài đang trong kế hoạch mở rộng"
    }
  }
}
```

#### 2.4 Error Responses
- `400 Bad Request`: `INVALID_PERIOD_PARAMS` — `startDate` or `endDate` invalid ISO string, or `startDate > endDate`.
- `401 Unauthorized`: `UNAUTHORIZED` — Bearer token invalid or expired.
- `403 Forbidden`: `FORBIDDEN` — Insufficient SYSTEM permissions.

---

## 3. Employer Recruitment Reporting API Contract

### `GET /api/v1/companies/:companyId/reports/recruitment`

Provides recruitment progress, application pipeline conversion, and interview scheduling metrics scoped to a specific company workspace.

#### 3.1 Security & Authorization
- **Authentication:** Bearer token (HTTP Authorization header).
- **Scope:** `COMPANY` (must be member of `:companyId`).
- **Required Grants / Permissions:** `job.view`, `application.view`.
- **Access Denials:**
  - `401 Unauthorized`: Token missing or invalid.
  - `403 Forbidden`: User is not a member of `:companyId` or lacks `application.view` / `job.view` role.
  - `404 Not Found`: `companyId` does not exist or user has no access.

#### 3.2 Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `period` | `string` | No | `30d` | Preset time range: `7d`, `30d`, `90d`, `all`, or `custom`. |
| `startDate` | `string (ISO 8601)` | Conditional | — | Required when `period=custom`. Start of window (inclusive, UTC). |
| `endDate` | `string (ISO 8601)` | Conditional | — | Required when `period=custom`. End of window (inclusive, UTC). |
| `jobId` | `string (UUID)` | No | `null` | Optional job filter. When omitted, aggregates metrics across all company jobs. |

#### 3.3 Response Payload Schema (`200 OK`)

```json
{
  "companyId": "c0a80123-4567-89ab-cdef-0123456789ab",
  "companyName": "Công ty Cổ phần Công nghệ FINDWORK",
  "period": {
    "key": "30d",
    "startDate": "2026-09-29T00:00:00.000Z",
    "endDate": "2026-10-29T23:59:59.999Z",
    "generatedAt": "2026-10-29T13:30:00.000Z"
  },
  "jobFilter": {
    "jobId": null,
    "title": "Tất cả tin tuyển dụng"
  },
  "jobsSummary": {
    "total": 12,
    "published": 8,
    "draft": 2,
    "paused": 1,
    "closed": 1
  },
  "pipeline": {
    "currentCounts": {
      "totalApplications": 128,
      "submitted": 34,
      "reviewing": 42,
      "shortlisted": 26,
      "interview": 14,
      "offered": 4,
      "rejected": 8
    },
    "periodSubmissions": 45
  },
  "interviewsSummary": {
    "total": 18,
    "scheduled": 8,
    "completed": 7,
    "cancelled": 3
  },
  "commercialPackage": {
    "tier": "FREE_TIER",
    "activeJobsLimit": "UNLIMITED_DURING_PILOT",
    "paymentActive": false,
    "note": "Gói tiêu chuẩn doanh nghiệp FINDWORK (Miễn phí trong giai đoạn thử nghiệm)"
  }
}
```

#### 3.4 Recommended SQL / Prisma Implementation Pattern

Codex can implement this in `company-report.service.ts` using clean Prisma aggregates:

```ts
// 1. Jobs summary
const jobsSummary = await prisma.job.groupBy({
  by: ['status'],
  where: { companyId },
  _count: { id: true },
});

// 2. Application pipeline counts
const pipelineCounts = await prisma.jobApplication.groupBy({
  by: ['status'],
  where: {
    job: { companyId },
    ...(jobId ? { jobId } : {}),
  },
  _count: { id: true },
});

// 3. Period submissions
const periodSubmissions = await prisma.jobApplication.count({
  where: {
    job: { companyId },
    ...(jobId ? { jobId } : {}),
    createdAt: { gte: startDate, lte: endDate },
  },
});

// 4. Interviews summary
const interviewsSummary = await prisma.interviewSchedule.groupBy({
  by: ['status'],
  where: {
    application: {
      job: { companyId },
      ...(jobId ? { jobId } : {}),
    },
  },
  _count: { id: true },
});
```

---

## 4. Frontend Integration & Fallback Strategy

Until Codex merges these backend aggregate endpoints into the server:
1. **Admin Reports (`/admin/reports`):**
   - Consumes real `GET /api/v1/admin/dashboard` for exact platform snapshot totals (`users`, `activeUsers`, `companies`, `activeCompanies`, `pendingCompanies`, `jobs`, `publishedJobs`, `applications`).
   - Links operational queues directly to actionable views (`/admin/companies?verificationStatus=PENDING`, `/admin/users?status=SUSPENDED`, `/admin/jobs`).
   - Explicitly displays period delta indicators as pending backend Codex contract, without fabricating fake numbers.
   - Provides CSV & JSON export of the current platform metrics snapshot.
2. **Employer Reports (`/employer/reports`):**
   - Consumes real `GET /companies/:companyId/jobs` to compute exact job counts (`PUBLISHED`, `DRAFT`, `PAUSED`, `CLOSED`).
   - Computes real candidate application pipeline by querying `companyWorkspaceApi.listJobApplications` for company jobs.
   - Computes actual scheduled interviews from `companyWorkspaceApi.listApplicationInterviews`.
   - Never labels a single page of results as a platform total.
   - Provides CSV & JSON export of displayed recruitment data.
   - Tracks commercial packages honestly as free-tier/unmonetized pilot.
