# Submission backend MVP API contract (draft, 2026-10-16)

Base path: `/api/v1`. Responses are JSON. Protected endpoints require `Authorization: Bearer <accessToken>`; a valid session and ACTIVE user are checked by `AccessTokenGuard`. Validation failures use HTTP 400; permission failures use 403 with `{code:"AUTHORIZATION_FORBIDDEN",message}`. `page` starts at 1; `pageSize` defaults to 20 and is capped at 100.

## Fast inventory at base HEAD `3815dd8`

| Capability | Status | Source evidence |
| --- | --- | --- |
| Auth/session and system/company RBAC | WORKING | `auth`, `authorization` modules; session-backed access guard; permission seed. |
| Company creation, owner membership, profile, locations and invitations | WORKING | `company` module controllers and transaction-backed repositories. Company workspace discovery was MISSING at base HEAD. Member/role management beyond invitations is PARTIAL. |
| Jobs | PARTIAL | Prisma `Job`, `JobLocation`, `JobSkill` and status/indexes exist; no Nest Job controller at base HEAD. |
| Applications | PARTIAL | Prisma `Application` and related models/unique candidate+job constraint exist; no Nest Application controller at base HEAD. |
| Resume attachment | BLOCKED | Prisma `Resume`/`ResumeVersion` exist; no backend resume create/upload API at base HEAD. Browser CV pages do not establish a persisted attachment. |
| Admin | PARTIAL | System permissions and `AuditLog` model exist; no Admin controller at base HEAD. |
| Public Jobs, Job Detail, application, employer and admin UI | UI-ONLY | Source routes exist; public job pages consume mock jobs and employer/admin routes are placeholders. |

## Implemented contract: company workspace and jobs

| Method / endpoint | Auth and permission | Request | Response / DB dependencies |
| --- | --- | --- | --- |
| `GET /companies/me` | Bearer; ACTIVE account | none | `{data:[{id,name,slug,status,verificationStatus,memberRoleNames}]}` from active `CompanyMember` records only. |
| `POST /companies/:companyId/jobs` | Bearer; `company.update` COMPANY | `categoryId` UUID, `title` 3–220, `description` 20–20000, `employmentType`, `workplaceType`; optional `experienceMinMonths`, `experienceMaxMonths`, `salaryMin`, `salaryMax`, `currency`, `salaryPeriod`, `salaryNegotiable`, `showSalary`, `applicationDeadline` | 201 Job summary, initially `DRAFT`; active `Company`, member and `JobCategory` required. |
| `GET /companies/:companyId/jobs` | Bearer; `company.view` COMPANY | `page`, `pageSize`, optional `status` | `{data,pagination}` for that company, newest first. |
| `GET /companies/:companyId/jobs/:jobId` | Bearer; `company.view` COMPANY | UUID path | Owned Job detail or 404. |
| `PATCH /companies/:companyId/jobs/:jobId` | Bearer; `company.update` COMPANY | `version` positive integer plus editable create fields | Updated DRAFT only; compare-and-swap version increment, 409 on stale version. |
| `POST /companies/:companyId/jobs/:jobId/publish` | Bearer; `company.update` COMPANY | `{version}` | DRAFT/PAUSED → PUBLISHED, `publishedAt` set; active category and valid future deadline required. |
| `POST /companies/:companyId/jobs/:jobId/pause` | Bearer; `company.update` COMPANY | `{version}` | PUBLISHED → PAUSED. |
| `POST /companies/:companyId/jobs/:jobId/close` | Bearer; `company.update` COMPANY | `{version}` | PUBLISHED/PAUSED → CLOSED. |
| `GET /jobs` | Public | `page`, `pageSize`, optional `q`, `categoryCode`, `employmentType`, `workplaceType` | `{data,pagination}` for PUBLISHED jobs of ACTIVE companies, within deadline/expiry, newest first. Search is case-insensitive over title. |
| `GET /jobs/:jobId` | Public | UUID path | Available published Job detail or 404. |

Job errors: `JOB_NOT_FOUND` 404 (including another company's job), `JOB_CATEGORY_INVALID` 400, `JOB_INVALID_RANGE` 400, `JOB_VERSION_CONFLICT` 409, `JOB_STATE_CONFLICT` 409, `JOB_DEADLINE_EXPIRED` 409. Validation pipe may return its standard HTTP 400 envelope for malformed DTOs. No endpoint accepts a caller-supplied `companyId` inside the body or grants roles.

## Implemented contract: builder resumes and applications

Only JSON builder resumes are persisted. No file upload, object storage or uploaded CV attachment is implemented. `POST /candidate/resumes` creates a READY `Resume` and version 1 atomically. Candidate and recruiter application detail responses include the persisted builder JSON; list responses omit it.

| Method / endpoint | Auth and permission | Request | Response / DB dependencies |
| --- | --- | --- | --- |
| `POST /candidate/resumes` | Bearer; `resume.create` OWN | `{name:string(2..180),builderContent:object,templateCode?:string(max 80),builderSettings?:object}`; combined JSON max 128 KB | 201 Resume with version 1; existing `CandidateProfile` required. |
| `GET /candidate/resumes` | Bearer; `resume.view` OWN | none | `{data:[Resume]}` for own nondeleted resumes, latest version metadata only. |
| `GET /candidate/resumes/:resumeId` | Bearer; `resume.view` OWN | UUID path | Own Resume with builder content or 404. |
| `PATCH /candidate/resumes/:resumeId` | Bearer; `resume.update` OWN | `{name:string(2..180),builderContent:object,expectedVersionNumber:int>=1,templateCode?:string(max 80),builderSettings?:object}`; combined JSON max 128 KB | Own READY BUILDER resume, appends version N+1 and updates name atomically; returns Resume with versions newest first. 404 for another candidate's resume, 409 on stale version or invalid state. |
| `POST /jobs/:jobId/applications` | Bearer; `application.create` OWN | `{resumeId:UUID,resumeVersionId:UUID,coverLetter?:string(max 5000)}` | 201 SUBMITTED Application with status history. Requires existing profile, owned READY BUILDER resume/version, PUBLISHED job at ACTIVE company and active category before deadline/expiry. |
| `GET /candidate/applications` | Bearer; `application.view` OWN | `page`, `pageSize`, optional `status` | `{data,pagination}` for own applications. |
| `GET /candidate/applications/:applicationId` | Bearer; `application.view` OWN | UUID path | Own application with builder CV content or 404. |
| `GET /companies/:companyId/jobs/:jobId/applications` | Bearer; `application.view` COMPANY | `page`, `pageSize`, optional `status` | `{data,pagination}` for applications to an owned job. |
| `GET /companies/:companyId/jobs/:jobId/applications/:applicationId` | Bearer; `application.view` COMPANY | UUID paths | Owned application with builder CV content or 404. |
| `PATCH /companies/:companyId/jobs/:jobId/applications/:applicationId/status` | Bearer; `application.review` COMPANY | `{version:int>=1,status:REVIEWING\|SHORTLISTED\|INTERVIEW\|OFFERED\|REJECTED}` | Updated application, status history and audit in one transaction; 409 on stale version or invalid transition. |

One application per candidate profile and job **for life**, even if withdrawn or rejected; the database unique key enforces this. Review transitions are `SUBMITTED -> REVIEWING/REJECTED -> SHORTLISTED/REJECTED -> INTERVIEW/REJECTED -> OFFERED/REJECTED`. The arrow sequence means each forward step starts from the preceding status. Existing company roles need a separately authorized permission backfill for `application.view` and `application.review`; new company roles receive the grants automatically. `APPLICATION_DUPLICATE` is 409, `APPLICATION_NOT_FOUND` is 404, `APPLICATION_VERSION_CONFLICT` and `APPLICATION_STATE_CONFLICT` are 409, `RESUME_UNAVAILABLE` is 400, and `JOB_UNAVAILABLE` is 409.

## Implemented contract: platform administration

All routes below require Bearer authentication and the named **SYSTEM-scope** permission. A company role cannot call them. List responses use `{data,pagination}` with `page` 1..1,000,000 and `pageSize` 1..100. No list selects password hashes. Audit listing deliberately excludes stored `beforeData`, `afterData` and `metadata` because earlier records could contain sensitive payloads.

| Method / endpoint | System permission | Request | Response / DB dependencies |
| --- | --- | --- | --- |
| `GET /admin/dashboard` | `user.view` + `company.view` + `job.view` | none | Real counts: users, active users, companies, active companies, pending verification companies, jobs, published jobs, applications. |
| `GET /admin/users` | `user.view` | `page`, `pageSize`, optional `status`, `q` email substring | Paged ID, email, status, verification and timestamps. |
| `PATCH /admin/users/:userId/status` | `user.update` | `{status:ACTIVE\|SUSPENDED}` | Updated user; self mutation and reactivation of DISABLED users forbidden. Audit in transaction. |
| `POST /admin/users/:userId/disable` | `user.disable` | none | DISABLED user; self mutation forbidden. Audit in transaction. |
| `GET /admin/companies` | `company.view` | `page`, `pageSize`, optional `status` | Paged company summaries. |
| `PATCH /admin/companies/:companyId/verification` | `company.verify` | `{status:VERIFIED\|REJECTED}` | Verification decision on ACTIVE company, with audit. |
| `PATCH /admin/companies/:companyId/status` | `company.suspend` | `{status:ACTIVE\|SUSPENDED}` | Suspend/reactivate non-archived company, with audit. Suspension removes its jobs from public discovery. |
| `GET /admin/jobs` | `job.view` | `page`, `pageSize`, optional `status`, `companyId` UUID | Paged job summaries. |
| `POST /admin/jobs/:jobId/close` | `job.moderate` | none | Closes PUBLISHED/PAUSED job with version check and audit. |
| `GET /admin/audit` | `audit.view` | `page`, `pageSize` | Paged audit metadata only; sensitive payload fields omitted. |

Admin mutations return 404 (`USER_NOT_FOUND`, `COMPANY_NOT_FOUND`, `JOB_NOT_FOUND`) or 409 (`*_STATE_CONFLICT`) as applicable. `ADMIN_SELF_MUTATION_FORBIDDEN` is 403. These APIs grant no privileges themselves. The existing `SUPPORT_ADMIN` role can use dashboard and listings; `VERIFICATION_ADMIN` can moderate companies; `MODERATION_ADMIN` can close jobs. `user.update`, `user.disable` and `audit.view` are intentionally not granted by those default roles; these routes require separately provisioned SYSTEM grants.

## Integration limits and deployment dependencies

Existing company profile/locations/invitations and Candidate/Reference APIs retain their current DTOs and guards. Province/Ward catalog availability is separate from this sprint. The new Job MVP does not accept job locations; province filtering, screening question answers and uploaded CV attachments remain out of scope until their persistence flows are implemented. Existing companies need a separately approved grant backfill for `application.view`/`application.review`; no database writes were made during this sprint.

## 2026-10-17 compatibility correction

`salaryMin` and `salaryMax` on Job create/update accept either a decimal string matching `^\d{1,17}(?:\.\d{1,2})?$` or a JSON safe integer. The Frontend form sends integer numbers. The Backend converts safe integers to decimal strings before Prisma; unsafe/fractional JSON numbers fail validation. The new builder resume update route requires the caller's latest `expectedVersionNumber`; the database unique `(resumeId, versionNumber)` key rejects concurrent writes. API errors use `{code,message,details?,traceId,path,timestamp}`; malformed DTOs use HTTP 400 with `code: VALIDATION_ERROR` and `details`.
