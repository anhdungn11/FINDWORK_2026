# Submission backend MVP API contract (updated 2026-10-21)

Current application submission requires a persisted builder resume version and a validated `details` object. The application workflow and assignment additions below supersede older draft examples in this document.

Base path: `/api/v1`. Responses are JSON. Protected endpoints require `Authorization: Bearer <accessToken>`; a valid session and ACTIVE user are checked by `AccessTokenGuard`. Validation failures use HTTP 400; permission failures use 403 with `{code:"AUTHORIZATION_FORBIDDEN",message}`. `page` starts at 1; `pageSize` defaults to 20 and is capped at 100.

## Current Frontend handoff (2026-10-21)

The routes in this section are the current code contract. Older sections below retain implementation history and illustrative payloads. All IDs in paths and DTOs are UUID v4 strings. Global validation transforms query page numbers, strips nothing silently, and rejects unknown body/query fields with HTTP 400. The response envelope for errors is `{code,message,details?,traceId,path,timestamp}`. Bearer routes return 401 for missing/invalid sessions and 403 for absent permission or scope. `company.view`, `company.update`, `application.view`, and `application.review` below require `COMPANY` scope and active membership. Admin permissions require `SYSTEM` scope. No HTTP or database-writing acceptance was run for this 2026-10-21 change; the user's pre-existing 12/12 PostgreSQL integration baseline was left intact.

### Company and public discovery

| HTTP method and URL | Permission; request DTO | Success fields and write behavior | Specific errors; live acceptance |
| --- | --- | --- | --- |
| `POST /api/v1/companies` | Active Bearer; `{name:string(2..255),slug:string(3..220)}`; slug lowercase alphanumeric segments joined by single hyphens. | 201 `{id,name,slug,status,verificationStatus,createdAt}`. One transaction creates ACTIVE company, active OWNER member, six default company roles and grants, and audit. | 400 validation, 409 `COMPANY_SLUG_ALREADY_EXISTS`/`COMPANY_CONFLICT`, 500 `COMPANY_PERMISSION_REGISTRY_INCOMPLETE`; live acceptance not run this sprint. |
| `GET /api/v1/companies/me` | Active Bearer; no DTO. | 200 `{data:[{id,name,slug,status,verificationStatus,memberRoleNames}]}` from active memberships; read only. | 401; live acceptance not run this sprint. |
| `GET /api/v1/companies` | Public; `page?:int(1..1000000)`, `pageSize?:int(1..100)`, `q?:string(1..100)`, `industryCode?:slug`, `provinceId?:UUID`, `verifiedOnly?:boolean`. | 200 `{data:PublicCompany[],pagination:{page,pageSize,total,totalPages}}`; active companies, including unverified, sorted by name then ID; read only. | 400 validation; live acceptance not run this sprint. |
| `GET /api/v1/companies/featured` | Public; `page?:int(1..1000000)`, `pageSize?:int(1..100)`. | 200 same public envelope and fields; only ACTIVE, VERIFIED companies with at least one currently available published Job; sorted by name then ID; read only. An empty data array is valid. | 400 validation; focused unit test passed, live HTTP/DB acceptance not run. |
| `GET /api/v1/companies/:companyId` | Public; UUID path. | 200 `PublicCompany`; active company only, read only. | 404 `PUBLIC_COMPANY_NOT_FOUND`; live acceptance not run this sprint. |
| `GET /api/v1/companies/:companyId/profile` | Bearer `company.view`; UUID path. | 200 private profile `{id,name,slug,legalName,taxCode,industryId,industry,description,website,employeeSizeRange,foundedYear,logoAssetKey,coverAssetKey,verificationStatus,verifiedAt,status,createdAt,updatedAt}`; read only. | 404 `COMPANY_RESOURCE_NOT_FOUND`; live acceptance not run this sprint. |
| `PATCH /api/v1/companies/:companyId/profile` | Bearer `company.update`; nonempty subset of `{name,legalName,taxCode,industryId,description,website,employeeSizeRange,foundedYear}`. Nullable fields accept `null`; see `UpdateCompanyProfileDto` bounds. | 200 same private profile; locks company, verifies current grant, updates selected fields and writes redacted audit in one transaction. `legalName`/`taxCode` cannot change while PENDING/VERIFIED. | 400 `COMPANY_UPDATE_EMPTY`, `COMPANY_INDUSTRY_INVALID`, `COMPANY_FOUNDED_YEAR_INVALID` or validation; 409 `COMPANY_VERIFIED_LEGAL_DETAILS_LOCKED`; 404 `COMPANY_RESOURCE_NOT_FOUND`; live acceptance not run this sprint. |
| `POST /api/v1/companies/:companyId/verification-request` | Bearer `company.update`; no body. | 200 same private profile with `verificationStatus:PENDING`; requires persisted legalName and taxCode; compare-and-swap and audit in one transaction. | 400 `COMPANY_VERIFICATION_PROFILE_INCOMPLETE`; 409 `COMPANY_VERIFICATION_STATE_CONFLICT`; 404 `COMPANY_RESOURCE_NOT_FOUND`; live acceptance not run this sprint. |
| `GET /api/v1/admin/companies?verificationStatus=PENDING` | Bearer `company.view:SYSTEM`; optional `page`, `pageSize`, `status`, `verificationStatus`, `q`. | 200 `{data:[{id,name,slug,status,verificationStatus,verifiedAt,createdAt,updatedAt}],pagination}`; pending defaults to ACTIVE; read only. | 400 validation; live acceptance not run this sprint. |
| `GET /api/v1/admin/companies/:companyId` | Bearer `company.view:SYSTEM`; UUID path. | 200 company summary plus legal/profile fields, locations, and member/job/application counts; read only. | 404 `COMPANY_NOT_FOUND`; live acceptance not run this sprint. |
| `PATCH /api/v1/admin/companies/:companyId/verification` | Bearer `company.verify:SYSTEM`; `{status:"VERIFIED"|"REJECTED"}`. | 200 `{id,name,slug,status,verificationStatus,verifiedAt,createdAt,updatedAt}`; ACTIVE/PENDING only, compare-and-swap and audit in one transaction. | 400 validation, 404 `COMPANY_NOT_FOUND`, 409 `COMPANY_STATE_CONFLICT`; live acceptance not run this sprint. |

`PublicCompany` is exactly `{id,name,slug,description,website,employeeSizeRange,foundedYear,isVerified,industry,headquarters,jobsCount}`. `industry` is `{id,code,name}` or `null`; `headquarters` is `{countryCode,province:{id,code,name}|null,ward:{id,code,name}|null}` or `null`. `jobsCount` counts only currently available published Jobs with an active category. Neither public route returns legal fields, storage asset keys, member identities, or full addresses. General discovery and Featured eligibility are separate product rules.

Profile PATCH limits: `name` 2..255 characters; `legalName` at most 220; `taxCode` at most 80; `description` at most 20,000; `website` at most 1,000 and must be an HTTP(S) URL; `employeeSizeRange` at most 120; `foundedYear` integer 1800 through current year; `industryId` must resolve to an active industry. All except `name` may be set to `null`. The response includes nullable values for omitted profile data.

### Jobs, applications, and status visibility

| HTTP method and URL | Permission; request DTO | Success fields and write behavior | Specific errors; live acceptance |
| --- | --- | --- | --- |
| `POST /api/v1/companies/:companyId/jobs` | Bearer `company.update`; `{categoryId:UUID,title:string(3..220),description:string(20..20000),employmentType,workplaceType,experienceMinMonths?,experienceMaxMonths?,salaryMin?,salaryMax?,currency?,salaryPeriod?,salaryNegotiable?,showSalary?,applicationDeadline?}`. | 201 `Job`; active category/member required; stores DRAFT and audit atomically. | 400 `JOB_CATEGORY_INVALID`, `JOB_INVALID_RANGE` or validation; live acceptance not run this sprint. |
| `GET /api/v1/companies/:companyId/jobs` and `GET /api/v1/companies/:companyId/jobs/:jobId` | Bearer `company.view`; list accepts `page`, `pageSize`, `status?`; detail UUID. | 200 `{data:Job[],pagination}` or `Job`, including drafts; read only. | 404 `JOB_NOT_FOUND` for missing/foreign detail; live acceptance not run this sprint. |
| `PATCH /api/v1/companies/:companyId/jobs/:jobId` | Bearer `company.update`; `{version:int>=1,...changed CreateJobDto fields}`. | 200 updated `Job`; DRAFT only; increments version and audits transactionally. | 400 `JOB_UPDATE_EMPTY`, `JOB_FIELD_INVALID`, `JOB_CATEGORY_INVALID`, `JOB_INVALID_RANGE` or validation; 409 `JOB_VERSION_CONFLICT`, `JOB_STATE_CONFLICT`; 404 `JOB_NOT_FOUND`; live acceptance not run this sprint. |
| `POST /api/v1/companies/:companyId/jobs/:jobId/publish`, `/pause`, `/close` | Bearer `company.update`; `{version:int>=1}`. | 200 updated `Job`; publish DRAFT/PAUSED to PUBLISHED, pause PUBLISHED to PAUSED, close PUBLISHED/PAUSED to CLOSED; increments version and audits atomically. | 409 `JOB_VERSION_CONFLICT`, `JOB_STATE_CONFLICT`, `JOB_DEADLINE_EXPIRED`; 400 `JOB_CATEGORY_INVALID` on publish; 404 `JOB_NOT_FOUND`; live acceptance not run this sprint. |
| `GET /api/v1/jobs` and `GET /api/v1/jobs/:jobId` | Public; list `page`, `pageSize`, `q?`, `companyId?`, `categoryCode?`, `employmentType?`, `workplaceType?`; detail UUID. | 200 `{data:Job[],pagination}` or `Job` plus active `screeningQuestions[]`; currently available PUBLISHED jobs at ACTIVE companies only; read only. | 400 validation, 404 `JOB_NOT_FOUND` for unavailable detail; live acceptance not run this sprint. |
| `POST /api/v1/jobs/:jobId/applications` | Bearer `application.create:OWN`; `{resumeId:UUID,resumeVersionId:UUID,details:{contact:{fullName,email,phone},currentLocation?,availability,preferredContactMethod},coverLetter?,answers?:[{questionId:UUID,answer:string|boolean|string[]}]}`. | 201 `Application`; stores candidate/job/contact snapshots, SUBMITTED history and screening answers atomically. | 400 `RESUME_UNAVAILABLE`, screening answer errors or validation; 404 `CANDIDATE_PROFILE_NOT_FOUND`; 409 `JOB_UNAVAILABLE`, `APPLICATION_DUPLICATE`; live acceptance not run this sprint. |
| `GET /api/v1/candidate/applications` and `GET /api/v1/candidate/applications/:applicationId` | Bearer `application.view:OWN`; list `page`, `pageSize`, `status?`; detail UUID. | 200 `{data:Application[],pagination}` or candidate detail with `resumeVersion`, `answers`, and candidate-safe `statusHistory`; read only. | 404 `APPLICATION_NOT_FOUND` for missing/foreign detail; live acceptance not run this sprint. |
| `GET /api/v1/companies/:companyId/jobs/:jobId/applications` and `GET .../:applicationId` | Bearer `application.view:COMPANY`; list `page`, `pageSize`, `status?`; detail UUID. | 200 `{data:Application[],pagination}` or recruiter detail with `resumeVersion`, `answers`, `statusHistory` including private note/actor, and active `assignments`; read only. | 404 `JOB_NOT_FOUND` or `APPLICATION_NOT_FOUND`; live acceptance not run this sprint. |
| `PATCH /api/v1/companies/:companyId/jobs/:jobId/applications/:applicationId/status` | Bearer `application.review:COMPANY`; `{version:int>=1,status:"REVIEWING"|"SHORTLISTED"|"INTERVIEW"|"OFFERED"|"REJECTED",note?:string(max 5000)}`. | 200 updated `Application` summary with new status/version. Stores status history (including private note) and audit atomically; re-fetch recruiter detail for history. | 404 `APPLICATION_NOT_FOUND`; 409 `APPLICATION_VERSION_CONFLICT`, `APPLICATION_STATE_CONFLICT`; live acceptance not run this sprint. |
| `PATCH /api/v1/companies/:companyId/jobs/:jobId/applications/:applicationId/assignment` | Bearer `application.review:COMPANY`; `{assignmentType:"PRIMARY_RECRUITER"|"REVIEWER"|"INTERVIEWER",companyMemberId:UUID}`. | 200 active assignment `{id,companyMemberId,assignmentType,assignedByMemberId,assignedAt}`; replaces the same assignment type in company transaction and audits; idempotent on same member. | 404 `APPLICATION_NOT_FOUND`/`COMPANY_MEMBER_NOT_FOUND`; 403 inactive actor; live acceptance not run this sprint. |

`Job` uses `{id,companyId,categoryId,title,description,employmentType,workplaceType,experienceMinMonths,experienceMaxMonths,salaryMin,salaryMax,currency,salaryPeriod,salaryNegotiable,showSalary,status,publishedAt,applicationDeadline,expiresAt,version,createdAt,updatedAt,company:{id,name,slug},category:{id,code,name}}`. `Application` summary uses `{id,companyId,jobId,status,version,resumeId,resumeVersionId,fullNameSnapshot,emailSnapshot,phoneSnapshot,currentLocationSnapshot,availability,preferredContactMethod,coverLetter,jobSnapshot,submittedAt,createdAt,updatedAt,job:{id,title,status,company:{id,name,slug}}}`. Decimal salaries serialize as strings or null. `SUBMITTED -> REVIEWING -> OFFERED` is the supported QUICK path; STANDARD uses `REVIEWING -> SHORTLISTED -> INTERVIEW -> OFFERED`; `REJECTED` is permitted from each nonterminal review stage. No job-level workflow mode is stored yet, so both paths are currently accepted on any job. `OFFERED`, `REJECTED`, and `WITHDRAWN` are terminal; no withdrawal mutation route exists. Candidate detail `statusHistory` has `{id,fromStatus,toStatus,createdAt}` only; recruiter detail adds `changedByUserId` and `note`. Assignment does not grant application access.

Job DTO enums: `employmentType` is `FULL_TIME|PART_TIME|INTERNSHIP|CONTRACT|FREELANCE|TEMPORARY|VOLUNTEER`; `workplaceType` is `ONSITE|HYBRID|REMOTE`; `salaryPeriod` is `HOUR|DAY|WEEK|MONTH|YEAR`. Experience bounds are integer 0..720 months. Salary bounds accept decimal strings with at most 17 integral and two fractional digits or JSON safe integers; deadline is ISO 8601 or null. Application `details.contact` requires trimmed `fullName` (1..160), valid `email` (at most 320), and `phone` (8..15 digits, accepted punctuation, at most 32 characters). `availability` is `immediately|within-1-week|within-2-weeks|within-1-month|negotiable`; `preferredContactMethod` is `email|phone`; `currentLocation` is optional, at most 255 characters. Screening `answers` are limited to 20 and validated against active questions. See the screening section below for per-type answer rules.

### Company profile completion dependencies

Persisted public text is already supported through `description`, `website`, `employeeSizeRange`, `foundedYear`, industry and headquarters. The private profile additionally stores `legalName`/`taxCode` and existing `logoAssetKey`/`coverAssetKey` columns. There is no asset upload, retrieval, validation, signed URL or storage lifecycle API; clients cannot submit arbitrary asset keys or public image URLs. Benefits and culture have no schema fields or APIs. The following is a proposal, not an implemented route:

1. **Storage approval:** provision a private object bucket and a trusted image delivery path. Add a company-scoped upload-intent route requiring `company.update:COMPANY`; accept only JPEG/PNG/WebP after server-side MIME sniffing and image decode, enforce a fixed byte/dimension limit, reject SVG and active content, use server-generated tenant-prefixed keys, short-lived upload tokens and an authenticated finalize step. Scan, strip metadata, verify the stored object's digest/size/type, then set the existing `logoAssetKey` or `coverAssetKey` with audit in a transaction. Serve public variants through a controlled URL/redirect, never expose raw keys. Delete orphan objects on a delayed lifecycle. Roll back by disabling upload/finalize routes and retaining stored keys until an approved object cleanup; no schema rollback is needed for these two fields.
2. **Schema approval for benefits/culture:** add nullable `Company.cultureDescription` (`text`) and `CompanyBenefit` (`id UUID`, `companyId UUID` FK, `label varchar(200)`, `displayOrder int`, unique `(companyId,displayOrder)`). Add bounded private update DTOs and public-safe selectors, preserve order and audit changes. Deploy additive migration first, then code; old rows read as empty benefits/null culture. Roll back application code first; export new values before a separately approved destructive reverse migration. No migration or storage infrastructure was executed in this sprint.

### Recruitment capability dependencies

The approved bootstrap matrix gives `OWNER` and `ADMIN` company-wide `company.view/update` and `application.view/review`; `HR_MANAGER` and `RECRUITER` have `application.view/review`; `HIRING_MANAGER` and `VIEWER` have `company.view` only. Existing company roles may need the separately approved `application.view/review` grant backfill described in `SUBMISSION_INTEGRATION_READINESS.md`. No role grants or business records were changed here. Independent evaluation needs an additive evaluation table and API; assigned hiring-manager review needs separately approved `ASSIGNED` permissions and assignment-aware guards. Interview scheduling can use the existing `Interview` and `InterviewParticipant` schema and existing permission registry, but requires an approved role grant matrix, tenant-scoped create/update/cancel/read APIs, status rules, audit and candidate visibility policy before code. See `RECRUITMENT_WORKFLOW_PROPOSAL.md`; no operational scheduling or evaluations are claimed.

**Antigravity handoff:** Replace the home page Featured Companies mock with `GET /api/v1/companies/featured?page=1&pageSize=12`; handle a real empty `data` array without fallback cards. Use `GET /companies` for the general directory and preserve unverified profiles there. Use UUID IDs from `GET /companies/me` and `GET /jobs`, then the company profile, verification, job and application routes above. Read `version` from each Job/Application response before a mutation; re-fetch candidate application detail for updated history. Map uppercase status values explicitly, keep recruiter notes out of candidate views, and never infer application or Job authority from `HIRING_MANAGER` membership. No logo/cover URL or benefits/culture API exists yet. The current browser Featured component still reads mocks; browser acceptance is pending.

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

### Featured Companies eligibility policy (2026-10-21)

The home page currently renders a hard-coded `companies` mock in `src/features/companies/components/FeaturedCompanies/FeaturedCompanies.tsx`; the backend previously had no Featured Companies selector. The added `GET /companies/featured` selector includes only an `ACTIVE`, `VERIFIED` company with at least one currently available published Job (active category, publication started, and deadline/expiry still in the future). It returns the existing public-safe `PublicCompany` shape and alphabetical pagination, without an editorial ranking or a fabricated count. This is a product-policy addition for the Featured section only. The general `GET /companies` and `GET /companies/:companyId` rules remain unchanged, so active unverified employers stay publicly discoverable with `isVerified:false`. AnhDungEconomy, currently unverified with zero public Jobs, does not qualify for Featured until its real verification and hiring data meet the rule.

### Public company discovery (2026-10-17)

`Company` has no public/private flag. Public discovery includes only `ACTIVE` companies, matching the existing public Job visibility rule. `isVerified` is true only for `VERIFIED`; an active unverified company is not labeled verified. Public responses never select legal name, tax code, creator/member identities, invitations, audit, internal asset keys or full street addresses.

| Method / endpoint | Auth | Query / response |
| --- | --- | --- |
| `GET /companies` | Public | `page` 1..1,000,000 (default 1), `pageSize` 1..100 (default 20), optional `q` (trimmed, case-insensitive name substring, max 100), `industryCode` (exact), `provinceId` (UUID, any company location), `verifiedOnly=true\|false`. Returns `{data:PublicCompany[],pagination:{page,pageSize,total,totalPages}}`, sorted by name then ID. |
| `GET /companies/featured` | Public | `page` 1..1,000,000 (default 1), `pageSize` 1..100 (default 20). Returns the same envelope and public fields, limited to active, verified companies with a currently available published Job; sorted by name then ID. |
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
| `POST /jobs/:jobId/applications` | Bearer; `application.create` OWN | `{resumeId:UUID,resumeVersionId:UUID,details:{contact:{fullName,email,phone},currentLocation?,availability,preferredContactMethod},coverLetter?:string(max 5000),answers?:[{questionId:UUID,answer:string\|boolean\|string[]}]}` | 201 SUBMITTED Application with status history and atomic answer snapshots. Requires existing profile, owned READY BUILDER resume/version, PUBLISHED job at ACTIVE company and active category before deadline/expiry. |
| `GET /candidate/applications` | Bearer; `application.view` OWN | `page`, `pageSize`, optional `status` | `{data,pagination}` for own applications. |
| `GET /candidate/applications/:applicationId` | Bearer; `application.view` OWN | UUID path | Own application with builder CV content and submitted `answers[]` snapshots or 404. |
| `GET /companies/:companyId/jobs/:jobId/applications` | Bearer; `application.view` COMPANY | `page`, `pageSize`, optional `status` | `{data,pagination}` for applications to an owned job. |
| `GET /companies/:companyId/jobs/:jobId/applications/:applicationId` | Bearer; `application.view` COMPANY | UUID paths | Owned application with builder CV content and submitted `answers[]` snapshots or 404. |
| `PATCH /companies/:companyId/jobs/:jobId/applications/:applicationId/status` | Bearer; `application.review` COMPANY | `{version:int>=1,status:REVIEWING\|SHORTLISTED\|INTERVIEW\|OFFERED\|REJECTED,note?:string(max 5000)}` | Updated application, status history and audit in one transaction; 409 on stale version or invalid transition. Note is internal and appears only in recruiter detail. |
| `PATCH /companies/:companyId/jobs/:jobId/applications/:applicationId/assignment` | Bearer; `application.review` COMPANY | `{assignmentType:"PRIMARY_RECRUITER"\|"REVIEWER"\|"INTERVIEWER",companyMemberId:UUID}` | Active assignment for that type; replaces a prior assignee atomically, audits the change. Target must be an active user and member of the same company. Repeating the same assignment returns it without a new audit. Assignment does not grant application access; the current `HIRING_MANAGER` role still cannot read applications. |

One application per candidate profile and job **for life**, even if withdrawn or rejected; the database unique key enforces this. QUICK uses `SUBMITTED -> REVIEWING -> OFFERED`; STANDARD may continue `REVIEWING -> SHORTLISTED -> INTERVIEW -> OFFERED`. `REJECTED` is available from each nonterminal review stage. The existing status values and version checks are unchanged. The API does not yet persist a per-job workflow mode; see `RECRUITMENT_WORKFLOW_PROPOSAL.md` for the approval-gated contract. Candidate detail returns status history without internal notes or actor IDs. Recruiter detail returns internal notes and active assignments. `APPLICATION_DUPLICATE` is 409, `APPLICATION_NOT_FOUND` is 404, `APPLICATION_VERSION_CONFLICT` and `APPLICATION_STATE_CONFLICT` are 409, `RESUME_UNAVAILABLE` is 400, and `JOB_UNAVAILABLE` is 409.

Answer validation: every `questionId` must be active on the same job, with no duplicates. Required questions must be present; optional ones may be omitted. `TEXT` accepts trimmed nonempty text up to 500 characters; `TEXTAREA` up to 5,000; `YES_NO` requires a boolean (`false` is valid); `SELECT` requires exactly one listed string; `MULTI_SELECT` requires 1 or more distinct listed strings. At most 20 answers are accepted. An empty `answers` array or omitted field succeeds when the job has no required questions. Answer errors use HTTP 400 `SCREENING_QUESTION_INVALID`, `SCREENING_ANSWER_DUPLICATE`, `SCREENING_REQUIRED_ANSWER_MISSING`, `SCREENING_ANSWER_INVALID`, or `SCREENING_OPTION_INVALID`; malformed DTOs use `VALIDATION_ERROR`. The transaction creates the Application, SUBMITTED history and answers together; detail responses return `answers:[{id,screeningQuestionId,questionSnapshot:{id,type,label,isRequired,displayOrder,options},answerValue,createdAt}]`. Question edits do not alter these submitted snapshots.

```http
POST /api/v1/jobs/33333333-3333-4333-8333-333333333333/applications
Content-Type: application/json

{"resumeId":"55555555-5555-4555-8555-555555555555","resumeVersionId":"66666666-6666-4666-8666-666666666666","details":{"contact":{"fullName":"Example Candidate","email":"candidate@example.invalid","phone":"+84901234567"},"availability":"immediately","preferredContactMethod":"email"},"answers":[{"questionId":"77777777-7777-4777-8777-777777777777","answer":"Five years"},{"questionId":"88888888-8888-4888-8888-888888888888","answer":["Node","SQL"]},{"questionId":"99999999-9999-4999-8999-999999999999","answer":false}]}
```

### Candidate Saved Jobs and application handoff (2026-10-17)

Saved Jobs code is implemented but requires the **unapplied** additive migration `20261017100000_candidate_saved_jobs`. All four routes require a Bearer token, active session/account, and `saved_job.manage` at `OWN` scope. That grant belongs to the `CANDIDATE` system role provisioned during real CandidateProfile creation; an account without it receives 403. Every query is scoped to the authenticated profile. No caller-supplied candidate ID is accepted.

| Method / endpoint | Request | Success | Errors |
| --- | --- | --- | --- |
| `POST /candidate/saved-jobs` | `{jobId:UUID}` | 201 `SavedJobItem`; only a currently public, published job can be added. | 400 `VALIDATION_ERROR` for bad UUID; 404 `JOB_NOT_FOUND` or `CANDIDATE_PROFILE_NOT_FOUND`; 409 `SAVED_JOB_DUPLICATE`; 401/403 auth/permission. |
| `GET /candidate/saved-jobs` | `page` 1..1,000,000, `pageSize` 1..100; defaults 1/20 | 200 `{data:SavedJobItem[],pagination:{page,pageSize,total,totalPages}}`, newest saved first. | 400 invalid page; 404 `CANDIDATE_PROFILE_NOT_FOUND`; 401/403. |
| `GET /candidate/saved-jobs/:jobId/status` | UUID path | 200 `{jobId,saved:boolean,isAvailable:boolean}`. | 400 invalid UUID; 404 missing profile; 401/403. |
| `DELETE /candidate/saved-jobs/:jobId` | UUID path | 204, empty body. | 400 invalid UUID; 404 `SAVED_JOB_NOT_FOUND` for absent or another candidate's bookmark, or `CANDIDATE_PROFILE_NOT_FOUND`; 401/403. |

`SavedJobItem` is `{id:UUID,jobId:UUID,savedAt:ISO8601,isAvailable:boolean,job:PublicSavedJob|null}`. `PublicSavedJob` selects these base public Job fields: `id,companyId,categoryId,title,description,employmentType,workplaceType,experienceMinMonths,experienceMaxMonths,salaryMin,salaryMax,currency,salaryPeriod,salaryNegotiable,showSalary,status,publishedAt,applicationDeadline,expiresAt,version,createdAt,updatedAt,company:{id,name,slug},category:{id,code,name}`. Screening questions are returned by `GET /jobs/:jobId` detail, not in saved-job list items. Decimal salary fields serialize as strings or null. If a saved job becomes paused/closed/expired, its company is suspended, or its category is inactive, the bookmark remains but `isAvailable=false` and `job=null`; no unpublished details leak. Deleting a Job cascades its bookmarks, so it disappears from the list. The database unique key `(candidateProfileId,jobId)` prevents races and duplicates.

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

{"resumeId":"55555555-5555-4555-8555-555555555555","resumeVersionId":"66666666-6666-4666-8666-666666666666","details":{"contact":{"fullName":"Example Candidate","email":"candidate@example.invalid","phone":"+84901234567"},"availability":"immediately","preferredContactMethod":"email"},"coverLetter":"I would like to apply."}
```

This route requires Bearer auth and `application.create` at `OWN` scope. It returns HTTP 201 with `status:"SUBMITTED"`, `version:1`, the immutable `resumeVersionId`, candidate contact snapshots, `jobSnapshot`, timestamps and a job summary. An illustrative complete application response is:

```json
{"id":"88888888-8888-4888-8888-888888888888","companyId":"11111111-1111-4111-8111-111111111111","jobId":"33333333-3333-4333-8333-333333333333","status":"SUBMITTED","version":1,"resumeId":"55555555-5555-4555-8555-555555555555","resumeVersionId":"66666666-6666-4666-8666-666666666666","fullNameSnapshot":"Example Candidate","emailSnapshot":"candidate@example.invalid","phoneSnapshot":null,"coverLetter":"I would like to apply.","jobSnapshot":{"id":"33333333-3333-4333-8333-333333333333","title":"Backend Engineer","categoryId":"22222222-2222-4222-8222-222222222222","publishedAt":"2026-10-17T08:00:00.000Z"},"submittedAt":"2026-10-17T09:05:00.000Z","createdAt":"2026-10-17T09:05:00.000Z","updatedAt":"2026-10-17T09:05:00.000Z","job":{"id":"33333333-3333-4333-8333-333333333333","title":"Backend Engineer","status":"PUBLISHED","company":{"id":"11111111-1111-4111-8111-111111111111","name":"Example Company","slug":"example-company"}}}
```

`GET /api/v1/candidate/applications?page=1&pageSize=20&status=SUBMITTED` requires `application.view` at `OWN` scope. A one-item history response is:

```json
{"data":[{"id":"88888888-8888-4888-8888-888888888888","companyId":"11111111-1111-4111-8111-111111111111","jobId":"33333333-3333-4333-8333-333333333333","status":"SUBMITTED","version":1,"resumeId":"55555555-5555-4555-8555-555555555555","resumeVersionId":"66666666-6666-4666-8666-666666666666","fullNameSnapshot":"Example Candidate","emailSnapshot":"candidate@example.invalid","phoneSnapshot":null,"coverLetter":"I would like to apply.","jobSnapshot":{"id":"33333333-3333-4333-8333-333333333333","title":"Backend Engineer","categoryId":"22222222-2222-4222-8222-222222222222","publishedAt":"2026-10-17T08:00:00.000Z"},"submittedAt":"2026-10-17T09:05:00.000Z","createdAt":"2026-10-17T09:05:00.000Z","updatedAt":"2026-10-17T09:05:00.000Z","job":{"id":"33333333-3333-4333-8333-333333333333","title":"Backend Engineer","status":"PUBLISHED","company":{"id":"11111111-1111-4111-8111-111111111111","name":"Example Company","slug":"example-company"}}}],"pagination":{"page":1,"pageSize":20,"total":1,"totalPages":1}}
```

`GET /candidate/applications/:applicationId` additionally returns `resumeVersion:{id,versionNumber,templateCode,builderContent,builderSettings}`, `answers[]` with submitted question snapshots, and `statusHistory[]` without internal notes or actor IDs. History filters and pagination use the same bounds as Saved Jobs. `JOB_UNAVAILABLE` is 409 for an unpublished/closed/expired job, `CANDIDATE_PROFILE_NOT_FOUND` is 404, `RESUME_UNAVAILABLE` is 400 for a version outside the caller's READY BUILDER resume, and `APPLICATION_DUPLICATE` is 409. Database uniqueness enforces one application per candidate/job, and submission writes the SUBMITTED status and its history in one transaction. The quick and standard review paths are specified above.

Frontend `JobId` in the mock job feature is currently a **number**, and its save button has no persistence call. All real Backend job IDs are UUID strings. The current in-memory `applicationPrototypeService` has `details` and `answers` where `answer` is typed as a string; Antigravity must map it to the validated type-specific `answers` DTO above and use UUID question IDs from public Job detail. The submit DTO requires `resumeId`, `resumeVersionId`, and validated `details`; `coverLetter` and `answers` are optional. File attachments remain unsupported; do not send them. Attachments need a separate authorized upload/storage lifecycle and malware/size checks. The global validation pipe rejects unsupported properties with 400.

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
