# Reporting API contract implemented in backend

This validates frontend contract `ddd118d503bbf14d5fbd1596603f1d34c40e857a:docs/REPORTING_API_CONTRACT.md` against the backend schema and permissions. Both endpoints return uncapped database aggregates, not list-page totals.

## Shared period rules

`period` defaults to `30d` and accepts `7d`, `30d`, `90d`, `all`, or `custom`. Presets are rolling UTC windows of exactly 7/30/90 days ending at request `generatedAt`. `all` has `startDate: null` and ends at `generatedAt`. `custom` requires both `startDate` and `endDate` as ISO 8601 timestamps with a UTC offset; both bounds are inclusive. Supplying dates with a preset, an invalid timestamp, or an inverted interval returns `400 {"code":"INVALID_PERIOD_PARAMS"}`. The response reports normalized UTC ISO strings.

## `GET /api/v1/admin/reports/summary`

Bearer authentication and all four SYSTEM-scoped permissions are required: `user.view`, `company.view`, `job.view`, `audit.view`. Missing authentication returns 401; insufficient permission or scope returns 403.

The response contains:

- `period`: `{ key, startDate, endDate, generatedAt }`.
- `snapshot.users`: `{ total, active, suspended, disabled }` from all current User rows.
- `snapshot.companies`: `{ total, active, suspended, archived, verified, pendingVerification, rejectedVerification, unverified }`. Company status and verification status are separate dimensions; verification counts include companies in any company status.
- `snapshot.jobs`: `{ total, published, draft, paused, closed, expired, archived }` from all current Job rows.
- `snapshot.applications`: `{ total }` from all current Application rows.
- `periodEvents`: `{ newUsersRegistered, newCompaniesRegistered, companiesVerified, companiesRejected, jobsPosted, applicationsSubmitted, jobsClosedByAdmin }`. Registrations use `createdAt`; submissions use `submittedAt`. Verification decisions use `admin.company.verify` audit events and their `afterData.verificationStatus`. `jobsPosted` counts `job.publish` audit events, including a later republish; `jobsClosedByAdmin` counts `admin.job.close` audit events. Event counts can differ from current snapshot counts.
- `operationalBacklog`: `{ pendingVerificationQueue, suspendedUsersQueue, suspendedCompaniesQueue }`. The pending queue counts only ACTIVE companies currently PENDING verification.
- `commercialStatus.revenueAndBilling` and `.enterprisePartnerships`: `status: "UNAVAILABLE"` with unavailable numeric values set to `null`. The schema has no billing or partnership ledger; zero would assert unsupported data.

## `GET /api/v1/companies/:companyId/reports/recruitment`

Bearer authentication, an active membership of the route company, COMPANY-scoped `company.view` and `application.view`, and granted `application.view` platform capability are required. `job.view` was proposed by the frontend, but existing company job read routes use `company.view`, and the current OWNER role has no company `job.view` grant. Missing authentication returns 401; denied company membership, grants, capability, or company scope returns 403.

Optional `jobId` must be a UUID and must belong to `:companyId`. Invalid UUID returns `400 {"code":"INVALID_JOB_ID"}`; a missing or foreign job returns `404 {"code":"JOB_NOT_FOUND"}`. The aggregate queries remain scoped by `companyId` and, when supplied, `jobId`.

The response contains:

- `companyId`, `companyName`, `period`, and `jobFilter: { jobId, title }`; the all-jobs title is `Tất cả tin tuyển dụng`.
- `jobsSummary`: `{ total, published, draft, paused, closed, expired, archived }`, current job statuses.
- `pipeline.currentCounts`: `{ totalApplications, draft, submitted, reviewing, shortlisted, interview, offered, rejected, withdrawn }`, current application statuses.
- `pipeline.periodSubmissions`: submissions during the selected window based on `submittedAt`, independent of current stage.
- `pipeline.hires`: `{ status: "UNAVAILABLE", count: null, note }`. An offer is not a recorded hire.
- `interviewsSummary`: `{ total, scheduled, rescheduled, completed, cancelled }`, current Interview rows counted independently of application stage. `scheduled` means status SCHEDULED only; RESCHEDULED is separate.
- `commercialPackage`: `status: "UNAVAILABLE"`, with `tier`, `activeJobsLimit`, and `paymentActive` set to `null`. No package or payment ledger exists.

The actual Prisma models are `Application` and `Interview`, not the proposed `jobApplication` and `interviewSchedule`. No migration or new stored reporting data is required.
