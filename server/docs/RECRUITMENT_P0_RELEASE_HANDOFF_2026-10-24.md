# FINDWORK recruitment P0 release contract — 24 October 2026

Base URL: `http://127.0.0.1:3002/api/v1`. JSON requests use `Content-Type: application/json`; private routes use `Authorization: Bearer <accessToken>`. The source build was first verified on isolated port 3003, then deployed to 3002 and the read-only HTTP acceptance rerun passed on 3002 against `findwork_employer_media_3002/public`. Do not edit the Frontend worktree from Backend.

## Public job directory and detail

| Method and path | Query/body | Response and rules |
| --- | --- | --- |
| `GET /jobs` | `page` 1–1,000,000 (default 1); `pageSize` 1–100 (default 20); `q` 1–100 Unicode chars; optional `companyId` UUID, `categoryCode`, `employmentType`, `workplaceType`, `provinceCode` (2-digit official code), `salaryAtLeast`, `salaryAtMost` decimal strings, `currency` 3 uppercase letters, `salaryPeriod`, `sort=newest\|salary_asc\|salary_desc` | `{data:[Job],pagination:{page,pageSize,total,totalPages}}`; `total` uses the same PostgreSQL predicate as the page. Out-of-range page is 200 with `data:[]` and unchanged totals. Published, active-company/category, unexpired jobs only. |
| `GET /jobs/:jobId` | UUID v4 | Public `Job` with `screeningQuestions`; 404 `JOB_NOT_FOUND` when absent or unavailable. Slug lookup is not implemented. |

`q` matches title, description and company name using PostgreSQL case-insensitive Unicode matching. It retains Vietnamese accents; accentless equivalents are **not yet guaranteed**. `provinceCode` checks a job's saved `JobLocation`, not company headquarters. Salary filters include only displayed, nonnegotiable amounts in `currency`/`salaryPeriod` (defaults VND/MONTH). A supplied currency/period alone also filters to displayed salaries in that unit. `salaryAtLeast` compares job `salaryMax`; `salaryAtMost` compares job `salaryMin`; jobs missing the corresponding bound are excluded. Salary sorting includes only jobs with a displayed `salaryMin` in that currency/period. `newest` sorts by `publishedAt DESC, id DESC`; salary sorts add `publishedAt DESC, id DESC` as stable tie breakers. Row and count queries share one PostgreSQL repeatable-read snapshot. `sort=relevant` is not implemented: do not label newest order as relevance. For a stable user experience, persist filters/sort/page in the URL, reset `page=1` when criteria change, render `pagination.totalPages` from the response, and disable Next on the last page. Offset pagination may shift if a new job is published between separate page requests.

`Job` includes UUID `id`, `companyId`, `categoryId`, title/description, employment/workplace types, experience and salary fields, `status`, `publishedAt`, deadline/expiry, `version`, timestamps, `category:{id,code,name}`, `company:{id,name,slug,logoUrl}`, and `locations:[{id,isPrimary,addressLine,province:{code,name}|null,ward:{code,name}|null}]`. `logoUrl` is relative (`/api/v1/companies/:id/media/logo`) or null; resolve against the API origin. Do not infer a salary from null or `showSalary:false`. No `logoAssetKey` is exposed. `GET /reference/job-categories` and `/reference/provinces` supply valid codes/IDs.

Validation errors are HTTP 400 (global DTO validation, `JOB_INVALID_RANGE` for reversed salary filters). `page=0`, `pageSize=101`, malformed province, malformed salary and unsupported sort are rejected. An empty search is 200 with zero total. No auth is required.

## Employer draft, publication and review

All company routes require an Employer access token, an active membership and company-wide `company.view` or `company.update`. The company UUID scopes every read/write. A nonmember cannot acquire a job through a guessed UUID.

| Method and path | Request | Response / error |
| --- | --- | --- |
| `POST /companies/:companyId/jobs` | `CreateJobDto` below | 201 draft Job; 400 `JOB_CATEGORY_INVALID`, `JOB_PROVINCE_INVALID`, `JOB_WARD_INVALID`, `JOB_INVALID_RANGE`; 401/403 auth/RBAC |
| `GET /companies/:companyId/jobs?page=&pageSize=&status=` | `status` one of `DRAFT,PUBLISHED,PAUSED,CLOSED,EXPIRED,ARCHIVED` | `{data,pagination}` including drafts; 401/403 |
| `GET /companies/:companyId/jobs/:jobId` | — | Company Job; 404 `JOB_NOT_FOUND` |
| `PATCH /companies/:companyId/jobs/:jobId` | Changed fields plus required integer `version` | 200 updated Job; draft, published and paused are editable; 409 `JOB_VERSION_CONFLICT`, `JOB_STATE_CONFLICT`, `JOB_DEADLINE_EXPIRED` |
| `POST /companies/:companyId/jobs/:jobId/publish` | `{version}` | 200 published Job; draft/paused only; 409 stale version/state/deadline |
| `POST /companies/:companyId/jobs/:jobId/pause` | `{version}` | 200 paused Job; published only |
| `POST /companies/:companyId/jobs/:jobId/close` | `{version}` | 200 closed Job; published/paused only |
| `GET/PUT /companies/:companyId/jobs/:jobId/screening-questions` | PUT `{version,questions:[...]}` | Questions can change in draft/paused state; 409 on state/version conflict |

Required `CreateJobDto`: `categoryId` UUID, `title` 3–220 chars, `description` 20–20,000 chars, `employmentType` (`FULL_TIME,PART_TIME,INTERNSHIP,CONTRACT,FREELANCE,TEMPORARY,VOLUNTEER`), `workplaceType` (`ONSITE,HYBRID,REMOTE`). Optional: experience months, decimal `salaryMin/salaryMax`, `currency` default VND, `salaryPeriod` default MONTH, `salaryNegotiable`, `showSalary`, ISO `applicationDeadline`, `location:{provinceCode,wardCode?,addressLine?}`. The location is optional for backward compatibility; supply it for province filtering. The ward must exist under the province; the current integration DB has zero wards pending approved import, so province-only locations work now. Editing `location` replaces the primary location on the owned job. Integer salary JSON numbers are accepted only when exactly representable; strings are safest. Never show a successful publish toast until the POST returns `status:"PUBLISHED"` and public GET resolves.

Safe sample create body:

```json
{"categoryId":"<UUID from /reference/job-categories>","title":"[DEMO FINDWORK] Lập trình Frontend React","description":"Bài đăng mẫu để trình diễn FINDWORK; không phải tin tuyển dụng thực tế. Xây dựng giao diện React và TypeScript.","employmentType":"FULL_TIME","workplaceType":"HYBRID","salaryMin":"18000000","salaryMax":"28000000","showSalary":true,"location":{"provinceCode":"01"}}
```

Company `verificationStatus` is not changed by job operations. Jobs remain subject to existing account type and company permission checks. `version` must come from the latest server response; patch/publish/pause/close each increment it.

## Candidate resume, save and apply

Candidate routes require a Candidate (or permitted legacy) access token and OWN-scope permission. The candidate's own ready builder ResumeVersion is required for application; a resume belonging to another user is rejected.

| Method and path | Request | Response / error |
| --- | --- | --- |
| `POST /candidate/resumes` | `{name,builderContent,templateCode?,builderSettings?}` | 201 Resume with `id`, `versions:[{id,versionNumber,...}]`; content limit 128 KiB |
| `PATCH /candidate/resumes/:resumeId` | Same plus `expectedVersionNumber` | New ResumeVersion; 409 `RESUME_VERSION_CONFLICT` |
| `GET /candidate/resumes`, `GET /candidate/resumes/:resumeId` | — | Own list/detail; 404 for another user's resume |
| `POST /candidate/saved-jobs` | `{jobId}` | 201 saved state; 409 `SAVED_JOB_DUPLICATE`; 404 unavailable job |
| `GET /candidate/saved-jobs?page=&pageSize=` | 1–100 per page | Own `{data,pagination}`; each row includes `isAvailable` and public job or null |
| `GET /candidate/saved-jobs/:jobId/status` | — | `{jobId,saved,isAvailable}` |
| `DELETE /candidate/saved-jobs/:jobId` | — | 204; 404 `SAVED_JOB_NOT_FOUND` |
| `POST /jobs/:jobId/applications` | `SubmitApplicationDto` below | 201 Application with `id,status:"SUBMITTED",version:1,jobId,resumeId,resumeVersionId`; 409 `APPLICATION_DUPLICATE` or `JOB_UNAVAILABLE`; 400 `RESUME_UNAVAILABLE`/screening validation |
| `GET /candidate/applications?page=&pageSize=&status=`, `GET /candidate/applications/:applicationId` | — | Own list/detail with status and history; 404 for another candidate |

Application request example:

```json
{"resumeId":"<own resume UUID>","resumeVersionId":"<own ready version UUID>","details":{"contact":{"fullName":"Demo Candidate","email":"demo@example.invalid","phone":"+84901234567"},"currentLocation":"Hà Nội","availability":"immediately","preferredContactMethod":"email"},"coverLetter":"Bài ứng tuyển thử có sự đồng ý của người sở hữu tài khoản.","answers":[]}
```

`availability`: `immediately,within-1-week,within-2-weeks,within-1-month,negotiable`; contact method `email|phone`. Screening answers must match the public detail question IDs and required types. The unique `(candidateProfileId,jobId)` key prevents duplicate applications.

## Employer application review

| Method and path | Request | Response / error |
| --- | --- | --- |
| `GET /companies/:companyId/jobs/:jobId/applications?page=&pageSize=&status=` | Company-wide `application.view` | `{data,pagination}`; list is scoped to company and job |
| `GET /companies/:companyId/jobs/:jobId/applications/:applicationId` | Company-wide `application.view` | Application detail with ResumeVersion content, answers, status history and assignments; 404 when outside scope |
| `PATCH /companies/:companyId/jobs/:jobId/applications/:applicationId/status` | Company-wide `application.review`; `{version,status,note?}` | 200 updated Application; 409 `APPLICATION_VERSION_CONFLICT`/`APPLICATION_STATE_CONFLICT`; note is internal and absent from candidate read |

Allowed review transitions: `SUBMITTED → REVIEWING|REJECTED`, `REVIEWING → SHORTLISTED|OFFERED|REJECTED`, `SHORTLISTED → INTERVIEW|REJECTED`, `INTERVIEW → OFFERED|REJECTED`. Fetch the latest `version`, send the PATCH, then have the candidate perform a **new GET** to observe the changed status. Employer detail exposes builder resume content only to authorized company members; the candidate list/detail is restricted by candidate profile.

## Verification and demo population

Read-only checks from `server`: `node scripts/audit-isolated-jobs.cjs`, `node scripts/accept-isolated-jobs-read.cjs` with optional `FINDWORK_ACCEPT_API_BASE=http://127.0.0.1:3003/api/v1`, and `node scripts/demo-jobs-release-2026.cjs --dry-run`. The optional [12-job dataset](../prisma/seed-data/demo-jobs-release-2026.json) uses only `[DEMO FINDWORK]` titles and explicit sample disclaimers. Dry-run verifies current category/province codes, computes a source SHA-256 and shows pending/conflicts. It does **not** write. Bulk apply is not approved or executed. After explicit approval, a verified recent custom dump outside Git, its checksum, `pg_restore` path, an authorized demonstration company OWNER token and company ID, set the script's `FINDWORK_DEMO_*` gates and run `node scripts/demo-jobs-release-2026.cjs --apply`. The script checks OWNER membership and skips matching published records; it never deletes fixtures or unrelated rows. Obtain and review a new dry-run with the chosen company ID immediately before apply.

The end-to-end write scenario still requires an approved, reusable Employer OWNER token and Candidate token or authorized demo credentials. Put `{ "employerToken":"...", "candidateToken":"...", "companyId":"...", "resumeId":"...", "resumeVersionId":"...", "candidateContact":{"fullName":"...","email":"...","phone":"..."} }` in an ignored local JSON file outside Git. Set `FINDWORK_RECRUITMENT_CREDENTIALS_FILE` to its absolute path and run `node scripts/accept-isolated-recruitment.cjs --preflight` for read-only ownership/ResumeVersion checks. After explicit approval and a verified recent custom dump outside Git, set `FINDWORK_RECRUITMENT_APPROVED=YES`, `FINDWORK_RECRUITMENT_BACKUP_PATH`, `FINDWORK_RECRUITMENT_BACKUP_SHA256`, and `FINDWORK_RECRUITMENT_PG_RESTORE`; then run `node scripts/accept-isolated-recruitment.cjs --run`. It creates one labeled sample job and one consented Candidate application, tests save/unsave and review, and leaves the job closed with audit history. It does not register users or delete data. No further registrations, job/application mutations or bulk seed were run for this handoff. Live HTTP evidence must not be confused with unit coverage; see the final run report for what was actually exercised.
