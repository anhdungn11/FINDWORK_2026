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

### Public company discovery (2026-10-17)

`Company` has no public/private flag. Public discovery includes only `ACTIVE` companies, matching the existing public Job visibility rule. `isVerified` is true only for `VERIFIED`; an active unverified company is not labeled verified. Public responses never select legal name, tax code, creator/member identities, invitations, audit, internal asset keys or full street addresses.

| Method / endpoint | Auth | Query / response |
| --- | --- | --- |
| `GET /companies` | Public | `page` 1..1,000,000 (default 1), `pageSize` 1..100 (default 20), optional `q` (trimmed, case-insensitive name substring, max 100), `industryCode` (exact), `provinceId` (UUID, any company location), `verifiedOnly=true\|false`. Returns `{data:PublicCompany[],pagination:{page,pageSize,total,totalPages}}`, sorted by name then ID. |
| `GET /companies/:companyId` | Public | UUID path; returns `PublicCompany` or 404 `PUBLIC_COMPANY_NOT_FOUND` for absent/inactive company. |
| `GET /jobs?companyId=:companyId` | Public | UUID filter on existing published Job search; combines with existing `q`, `categoryCode`, employment/workplace filters and pagination. |

`PublicCompany` is `{id,name,slug,description,website,employeeSizeRange,foundedYear,isVerified,industry,headquarters,jobsCount}`. `industry` is `{id,code,name}` or null; `headquarters` is `{countryCode,province:{id,code,name}|null,ward:{id,code,name}|null}` or null. `jobsCount` counts only currently available published Jobs of the active company. Empty results have `totalPages:0`. Query validation uses HTTP 400 `VALIDATION_ERROR`.

Example without credentials: `GET /api/v1/companies?q=software&page=1&pageSize=20&verifiedOnly=true`, then `GET /api/v1/jobs?companyId=<company UUID>&page=1&pageSize=20`. The Backend uses UUID company IDs; the current Frontend company mock uses numeric IDs and must map routes when integrated.

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
| `GET /jobs/:jobId` | Public | UUID path | Available published Job detail with active `screeningQuestions[]` or 404. |

Job errors: `JOB_NOT_FOUND` 404 (including another company's job), `JOB_CATEGORY_INVALID` 400, `JOB_INVALID_RANGE` 400, `JOB_VERSION_CONFLICT` 409, `JOB_STATE_CONFLICT` 409, `JOB_DEADLINE_EXPIRED` 409. Validation pipe may return its standard HTTP 400 envelope for malformed DTOs. No endpoint accepts a caller-supplied `companyId` inside the body or grants roles.

### Screening questions (code delivered 2026-10-17; migration pending)

| Method / endpoint | Auth and permission | Request | Response |
| --- | --- | --- | --- |
| `GET /companies/:companyId/jobs/:jobId/screening-questions` | Bearer; `company.view` COMPANY and active membership | UUID paths | `{jobId,version,questions:Question[]}` for the owned job; 404 for another company's job. |
| `PUT /companies/:companyId/jobs/:jobId/screening-questions` | Bearer; `company.update` COMPANY and active membership | `{version:int>=1,questions:QuestionInput[]}` | 200 `{jobId,version:N+1,questions:Question[]}`; only DRAFT/PAUSED jobs. Pausing a published job before editing serializes with application submission. |
| `GET /jobs/:jobId` | Public | UUID path | Existing public Job fields plus active `screeningQuestions:Question[]` sorted by `displayOrder,id`; no inactive question or private answer. |

`QuestionInput` is `{type:TEXT|TEXTAREA|YES_NO|SELECT|MULTI_SELECT,label:string(3..500),isRequired:boolean,displayOrder:int(0..19),options?:string[]}`. At most 20 questions and unique display orders. `SELECT`/`MULTI_SELECT` require 2–20 distinct, trimmed, nonempty options of at most 120 characters; other types forbid `options`. `Question` adds server UUID `id`; `options` is `null` for nonchoice types. `PUT` replaces the active set, so `{questions:[]}` clears it. Old rows are only deactivated, preserving FKs and submitted snapshots. Job `version` uses compare-and-swap; submit the returned version when publishing. Errors: 400 `VALIDATION_ERROR`, `SCREENING_ORDER_DUPLICATE`, `SCREENING_OPTIONS_INVALID`; 403 missing COMPANY permission/membership; 404 `JOB_NOT_FOUND`; 409 `JOB_VERSION_CONFLICT`, `SCREENING_JOB_STATE_CONFLICT`. The additive enum migration `20261017110000_screening_multi_select` must be applied separately before using `MULTI_SELECT`.

```http
PUT /api/v1/companies/11111111-1111-4111-8111-111111111111/jobs/33333333-3333-4333-8333-333333333333/screening-questions
Content-Type: application/json

{"version":1,"questions":[{"type":"TEXT","label":"Years of experience?","isRequired":true,"displayOrder":0},{"type":"MULTI_SELECT","label":"Core skills?","isRequired":true,"displayOrder":1,"options":["Node","SQL"]},{"type":"YES_NO","label":"Available soon?","isRequired":false,"displayOrder":2}]}
```

The response is `{"jobId":"33333333-3333-4333-8333-333333333333","version":2,"questions":[{"id":"77777777-7777-4777-8777-777777777777","type":"TEXT","label":"Years of experience?","isRequired":true,"displayOrder":0,"options":null},{"id":"88888888-8888-4888-8888-888888888888","type":"MULTI_SELECT","label":"Core skills?","isRequired":true,"displayOrder":1,"options":["Node","SQL"]},{"id":"99999999-9999-4999-8999-999999999999","type":"YES_NO","label":"Available soon?","isRequired":false,"displayOrder":2,"options":null}]}`. Public Job detail returns the same `questions` array under `screeningQuestions` while the job is available.

## Implemented contract: builder resumes and applications

Only JSON builder resumes are persisted. No file upload, object storage or uploaded CV attachment is implemented. `POST /candidate/resumes` creates a READY `Resume` and version 1 atomically. Candidate and recruiter application detail responses include the persisted builder JSON; list responses omit it.

Onboarding continuity: `PUT /candidate/onboarding-draft` saves a private versioned draft. `POST /candidate/profile/import-onboarding` requires `{version,confirmPrivacy:true}` and applies the documented private initial settings; it does not create a fake Resume from draft assets. The candidate then calls `POST /candidate/resumes` with builder JSON. Resume create without a real CandidateProfile returns 404 `CANDIDATE_PROFILE_NOT_FOUND`; neither resume route creates a profile automatically. Saved resumes and applications are account-scoped database records available from a later authenticated session. Updating a builder CV appends an immutable version; an already submitted application keeps its original `resumeVersionId`.

| Method / endpoint | Auth and permission | Request | Response / DB dependencies |
| --- | --- | --- | --- |
| `POST /candidate/resumes` | Bearer; `resume.create` OWN | `{name:string(2..180),builderContent:object,templateCode?:string(max 80),builderSettings?:object}`; combined JSON max 128 KB | 201 Resume with version 1; existing `CandidateProfile` required. |
| `GET /candidate/resumes` | Bearer; `resume.view` OWN | none | `{data:[Resume]}` for own nondeleted resumes, latest version metadata only. |
| `GET /candidate/resumes/:resumeId` | Bearer; `resume.view` OWN | UUID path | Own Resume with builder content or 404. |
| `PATCH /candidate/resumes/:resumeId` | Bearer; `resume.update` OWN | `{name:string(2..180),builderContent:object,expectedVersionNumber:int>=1,templateCode?:string(max 80),builderSettings?:object}`; combined JSON max 128 KB | Own READY BUILDER resume, appends version N+1 and updates name atomically; omitted template/settings inherit from the latest version. Returns Resume with versions newest first. 404 for another candidate's resume, 409 on stale version or invalid state. |
| `POST /jobs/:jobId/applications` | Bearer; `application.create` OWN | `{resumeId:UUID,resumeVersionId:UUID,coverLetter?:string(max 5000),answers?:[{questionId:UUID,answer:string\|boolean\|string[]}]}` | 201 SUBMITTED Application with status history and atomic answer snapshots. Requires existing profile, owned READY BUILDER resume/version, PUBLISHED job at ACTIVE company and active category before deadline/expiry. |
| `GET /candidate/applications` | Bearer; `application.view` OWN | `page`, `pageSize`, optional `status` | `{data,pagination}` for own applications. |
| `GET /candidate/applications/:applicationId` | Bearer; `application.view` OWN | UUID path | Own application with builder CV content and submitted `answers[]` snapshots or 404. |
| `GET /companies/:companyId/jobs/:jobId/applications` | Bearer; `application.view` COMPANY | `page`, `pageSize`, optional `status` | `{data,pagination}` for applications to an owned job. |
| `GET /companies/:companyId/jobs/:jobId/applications/:applicationId` | Bearer; `application.view` COMPANY | UUID paths | Owned application with builder CV content and submitted `answers[]` snapshots or 404. |
| `PATCH /companies/:companyId/jobs/:jobId/applications/:applicationId/status` | Bearer; `application.review` COMPANY | `{version:int>=1,status:REVIEWING\|SHORTLISTED\|INTERVIEW\|OFFERED\|REJECTED}` | Updated application, status history and audit in one transaction; 409 on stale version or invalid transition. |

One application per candidate profile and job **for life**, even if withdrawn or rejected; the database unique key enforces this. Review transitions are `SUBMITTED -> REVIEWING/REJECTED -> SHORTLISTED/REJECTED -> INTERVIEW/REJECTED -> OFFERED/REJECTED`. The arrow sequence means each forward step starts from the preceding status. Existing company roles need a separately authorized permission backfill for `application.view` and `application.review`; new company roles receive the grants automatically. `APPLICATION_DUPLICATE` is 409, `APPLICATION_NOT_FOUND` is 404, `APPLICATION_VERSION_CONFLICT` and `APPLICATION_STATE_CONFLICT` are 409, `RESUME_UNAVAILABLE` is 400, and `JOB_UNAVAILABLE` is 409.

Answer validation: every `questionId` must be active on the same job, with no duplicates. Required questions must be present; optional ones may be omitted. `TEXT` accepts trimmed nonempty text up to 500 characters; `TEXTAREA` up to 5,000; `YES_NO` requires a boolean (`false` is valid); `SELECT` requires exactly one listed string; `MULTI_SELECT` requires 1 or more distinct listed strings. At most 20 answers are accepted. An empty `answers` array or omitted field succeeds when the job has no required questions. Answer errors use HTTP 400 `SCREENING_QUESTION_INVALID`, `SCREENING_ANSWER_DUPLICATE`, `SCREENING_REQUIRED_ANSWER_MISSING`, `SCREENING_ANSWER_INVALID`, or `SCREENING_OPTION_INVALID`; malformed DTOs use `VALIDATION_ERROR`. The transaction creates the Application, SUBMITTED history and answers together; detail responses return `answers:[{id,screeningQuestionId,questionSnapshot:{id,type,label,isRequired,displayOrder,options},answerValue,createdAt}]`. Question edits do not alter these submitted snapshots.

```http
POST /api/v1/jobs/33333333-3333-4333-8333-333333333333/applications
Content-Type: application/json

{"resumeId":"55555555-5555-4555-8555-555555555555","resumeVersionId":"66666666-6666-4666-8666-666666666666","answers":[{"questionId":"77777777-7777-4777-8777-777777777777","answer":"Five years"},{"questionId":"88888888-8888-4888-8888-888888888888","answer":["Node","SQL"]},{"questionId":"99999999-9999-4999-8999-999999999999","answer":false}]}
```

### Candidate Saved Jobs and application handoff (2026-10-17)

Saved Jobs code is implemented but requires the **unapplied** additive migration `20261017100000_candidate_saved_jobs`. All four routes require a Bearer token, active session/account, and `saved_job.manage` at `OWN` scope. That grant belongs to the `CANDIDATE` system role provisioned during real CandidateProfile creation; an account without it receives 403. Every query is scoped to the authenticated profile. No caller-supplied candidate ID is accepted.

| Method / endpoint | Request | Success | Errors |
| --- | --- | --- | --- |
| `POST /candidate/saved-jobs` | `{jobId:UUID}` | 201 `SavedJobItem`; only a currently public, published job can be added. | 400 `VALIDATION_ERROR` for bad UUID; 404 `JOB_NOT_FOUND` or `CANDIDATE_PROFILE_NOT_FOUND`; 409 `SAVED_JOB_DUPLICATE`; 401/403 auth/permission. |
| `GET /candidate/saved-jobs` | `page` 1..1,000,000, `pageSize` 1..100; defaults 1/20 | 200 `{data:SavedJobItem[],pagination:{page,pageSize,total,totalPages}}`, newest saved first. | 400 invalid page; 404 `CANDIDATE_PROFILE_NOT_FOUND`; 401/403. |
| `GET /candidate/saved-jobs/:jobId/status` | UUID path | 200 `{jobId,saved:boolean,isAvailable:boolean}`. | 400 invalid UUID; 404 missing profile; 401/403. |
| `DELETE /candidate/saved-jobs/:jobId` | UUID path | 204, empty body. | 400 invalid UUID; 404 `SAVED_JOB_NOT_FOUND` for absent or another candidate's bookmark, or `CANDIDATE_PROFILE_NOT_FOUND`; 401/403. |

`SavedJobItem` is `{id:UUID,jobId:UUID,savedAt:ISO8601,isAvailable:boolean,job:PublicSavedJob|null}`. `PublicSavedJob` has the same field selection as `GET /jobs/:jobId`: `id,companyId,categoryId,title,description,employmentType,workplaceType,experienceMinMonths,experienceMaxMonths,salaryMin,salaryMax,currency,salaryPeriod,salaryNegotiable,showSalary,status,publishedAt,applicationDeadline,expiresAt,version,createdAt,updatedAt,company:{id,name,slug},category:{id,code,name}`. Decimal salary fields serialize as strings or null. If a saved job becomes paused/closed/expired, its company is suspended, or its category is inactive, the bookmark remains but `isAvailable=false` and `job=null`; no unpublished details leak. Deleting a Job cascades its bookmarks, so it disappears from the list. The database unique key `(candidateProfileId,jobId)` prevents races and duplicates.

Examples use illustrative UUIDs and no credentials:

```http
POST /api/v1/candidate/saved-jobs
Content-Type: application/json

{"jobId":"33333333-3333-4333-8333-333333333333"}
```

```json
{"id":"77777777-7777-4777-8777-777777777777","jobId":"33333333-3333-4333-8333-333333333333","savedAt":"2026-10-17T09:00:00.000Z","isAvailable":true,"job":{"id":"33333333-3333-4333-8333-333333333333","companyId":"11111111-1111-4111-8111-111111111111","categoryId":"22222222-2222-4222-8222-222222222222","title":"Backend Engineer","description":"Build recruiting services.","employmentType":"FULL_TIME","workplaceType":"REMOTE","experienceMinMonths":null,"experienceMaxMonths":null,"salaryMin":null,"salaryMax":null,"currency":"VND","salaryPeriod":"MONTH","salaryNegotiable":false,"showSalary":false,"status":"PUBLISHED","publishedAt":"2026-10-17T08:00:00.000Z","applicationDeadline":null,"expiresAt":null,"version":2,"createdAt":"2026-10-17T07:00:00.000Z","updatedAt":"2026-10-17T08:00:00.000Z","company":{"id":"11111111-1111-4111-8111-111111111111","name":"Example Company","slug":"example-company"},"category":{"id":"22222222-2222-4222-8222-222222222222","code":"technology","name":"Technology"}}}
```

`GET /api/v1/candidate/saved-jobs?page=1&pageSize=20` returns `{data:SavedJobItem[],pagination}`. For a closed job, an exact list response is:

```json
{"data":[{"id":"77777777-7777-4777-8777-777777777777","jobId":"33333333-3333-4333-8333-333333333333","savedAt":"2026-10-17T09:00:00.000Z","isAvailable":false,"job":null}],"pagination":{"page":1,"pageSize":20,"total":1,"totalPages":1}}
```

`GET /api/v1/candidate/saved-jobs/33333333-3333-4333-8333-333333333333/status` returns `{"jobId":"33333333-3333-4333-8333-333333333333","saved":true,"isAvailable":true}` while available. `DELETE` on that UUID returns HTTP 204 without JSON.

Applying uses the **existing** application API. The browser must use the UUID returned by `GET /jobs`, then create/get an owned builder Resume and use one of its `versions[].id` values:

```http
POST /api/v1/jobs/33333333-3333-4333-8333-333333333333/applications
Content-Type: application/json

{"resumeId":"55555555-5555-4555-8555-555555555555","resumeVersionId":"66666666-6666-4666-8666-666666666666","coverLetter":"I would like to apply."}
```

This route requires Bearer auth and `application.create` at `OWN` scope. It returns HTTP 201 with `status:"SUBMITTED"`, `version:1`, the immutable `resumeVersionId`, candidate contact snapshots, `jobSnapshot`, timestamps and a job summary. An illustrative complete application response is:

```json
{"id":"88888888-8888-4888-8888-888888888888","companyId":"11111111-1111-4111-8111-111111111111","jobId":"33333333-3333-4333-8333-333333333333","status":"SUBMITTED","version":1,"resumeId":"55555555-5555-4555-8555-555555555555","resumeVersionId":"66666666-6666-4666-8666-666666666666","fullNameSnapshot":"Example Candidate","emailSnapshot":"candidate@example.invalid","phoneSnapshot":null,"coverLetter":"I would like to apply.","jobSnapshot":{"id":"33333333-3333-4333-8333-333333333333","title":"Backend Engineer","categoryId":"22222222-2222-4222-8222-222222222222","publishedAt":"2026-10-17T08:00:00.000Z"},"submittedAt":"2026-10-17T09:05:00.000Z","createdAt":"2026-10-17T09:05:00.000Z","updatedAt":"2026-10-17T09:05:00.000Z","job":{"id":"33333333-3333-4333-8333-333333333333","title":"Backend Engineer","status":"PUBLISHED","company":{"id":"11111111-1111-4111-8111-111111111111","name":"Example Company","slug":"example-company"}}}
```

`GET /api/v1/candidate/applications?page=1&pageSize=20&status=SUBMITTED` requires `application.view` at `OWN` scope. A one-item history response is:

```json
{"data":[{"id":"88888888-8888-4888-8888-888888888888","companyId":"11111111-1111-4111-8111-111111111111","jobId":"33333333-3333-4333-8333-333333333333","status":"SUBMITTED","version":1,"resumeId":"55555555-5555-4555-8555-555555555555","resumeVersionId":"66666666-6666-4666-8666-666666666666","fullNameSnapshot":"Example Candidate","emailSnapshot":"candidate@example.invalid","phoneSnapshot":null,"coverLetter":"I would like to apply.","jobSnapshot":{"id":"33333333-3333-4333-8333-333333333333","title":"Backend Engineer","categoryId":"22222222-2222-4222-8222-222222222222","publishedAt":"2026-10-17T08:00:00.000Z"},"submittedAt":"2026-10-17T09:05:00.000Z","createdAt":"2026-10-17T09:05:00.000Z","updatedAt":"2026-10-17T09:05:00.000Z","job":{"id":"33333333-3333-4333-8333-333333333333","title":"Backend Engineer","status":"PUBLISHED","company":{"id":"11111111-1111-4111-8111-111111111111","name":"Example Company","slug":"example-company"}}}],"pagination":{"page":1,"pageSize":20,"total":1,"totalPages":1}}
```

`GET /candidate/applications/:applicationId` additionally returns `resumeVersion:{id,versionNumber,templateCode,builderContent,builderSettings}` and `answers[]` with submitted question snapshots and values. History filters and pagination use the same bounds as Saved Jobs. `JOB_UNAVAILABLE` is 409 for an unpublished/closed/expired job, `CANDIDATE_PROFILE_NOT_FOUND` is 404, `RESUME_UNAVAILABLE` is 400 for a version outside the caller's READY BUILDER resume, and `APPLICATION_DUPLICATE` is 409. Database uniqueness enforces one application per candidate/job, and submission writes the SUBMITTED status and its history in one transaction. Recruiter review transitions remain `SUBMITTED → REVIEWING → SHORTLISTED → INTERVIEW → OFFERED`, with `REJECTED` from nonterminal stages; candidate history reflects review updates.

Frontend `JobId` in the mock job feature is currently a **number**, and its save button has no persistence call. All real Backend job IDs are UUID strings. The current in-memory `applicationPrototypeService` has `details` and `answers` where `answer` is typed as a string; Antigravity must map it to the validated type-specific `answers` DTO above and use UUID question IDs from public Job detail. The submit DTO accepts only `resumeId`, `resumeVersionId`, optional `coverLetter`, and optional `answers`. The prototype `details` object and file attachments remain unsupported; do not send them. Attachments need a separate authorized upload/storage lifecycle and malware/size checks. The global validation pipe rejects unsupported properties with 400.

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

Existing company profile/locations/invitations and Candidate/Reference APIs retain their current DTOs and guards. Province/Ward catalog availability is separate from this sprint. The Job MVP does not yet accept job locations; province filtering and uploaded CV attachments remain out of scope. Screening questions and submitted answers are implemented in code and require the enum migration before runtime use. Existing companies need a separately approved grant backfill for `application.view`/`application.review`; no database writes were made during this sprint.

## 2026-10-17 compatibility correction

`salaryMin` and `salaryMax` on Job create/update accept either a decimal string matching `^\d{1,17}(?:\.\d{1,2})?$` or a JSON safe integer. The Frontend form sends integer numbers. The Backend converts safe integers to decimal strings before Prisma; unsafe/fractional JSON numbers fail validation. The new builder resume update route requires the caller's latest `expectedVersionNumber`; the database unique `(resumeId, versionNumber)` key rejects concurrent writes. API errors use `{code,message,details?,traceId,path,timestamp}`; malformed DTOs use HTTP 400 with `code: VALIDATION_ERROR` and `details`.
