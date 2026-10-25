# Antigravity: Backend job search contract — 25 October 2026

Base: `http://127.0.0.1:3002/api/v1`. `GET /jobs` is public and returns `{data: Job[], pagination: {page, pageSize, total, totalPages}}`. Use the server's `pagination` for UI counts and controls. Page 1 and page size 20 are defaults; valid ranges are page 1–1,000,000 and pageSize 1–100. An out-of-range page returns HTTP 200, `data:[]`, and the true totals.

| Filter | Exact query parameter and value |
| --- | --- |
| Text | `q`: 1–100 characters; title, description or company name, case-insensitive. Accentless Vietnamese matching is not guaranteed. |
| Category/company | `categoryCode` slug; `companyId` UUID v4. |
| Work | `employmentType` (`FULL_TIME`, `PART_TIME`, `INTERNSHIP`, `CONTRACT`, `FREELANCE`, `TEMPORARY`, `VOLUNTEER`); `workplaceType` (`ONSITE`, `HYBRID`, `REMOTE`). |
| Location | `provinceCode`: official **two-digit string** from `/reference/provinces`; matches saved Job location, not company headquarters. |
| Salary | `salaryAtLeast`, `salaryAtMost`: nonnegative decimal strings; optional `currency` (default `VND`) and `salaryPeriod` (default `MONTH`). A filter or salary sort includes only displayed, nonnegotiable salary in the chosen unit. `salaryAtLeast` compares job `salaryMax`; `salaryAtMost` compares job `salaryMin`, so the filter means overlapping salary ranges. Missing required bound excludes a job. |
| Sort | `sort=newest|salary_asc|salary_desc`; default `newest`. There is no `relevant` sort. Salary sort requires a displayed `salaryMin`. |

`newest` orders by `publishedAt DESC, id DESC`; salary sorts order by `salaryMin ASC/DESC, publishedAt DESC, id DESC`. Row and count come from the same repeatable-read PostgreSQL snapshot. Offset pages may shift between separate requests when new jobs are published; reset `page=1` when filters change. Results include only published jobs with active company/category and unexpired deadline/expiry.

Each Job has UUID `id`, `companyId`, `categoryId`, title/description, employment/workplace and salary fields, `status`, `publishedAt`, deadline/expiry, version/timestamps, `category:{id,code,name}`, `company:{id,name,slug,logoUrl}`, and `locations:[{id,isPrimary,addressLine,province:{code,name}|null,ward:{code,name}|null}]`. `logoUrl` is an API-relative path or null. A hidden/null salary should not be displayed as an amount. `GET /jobs/:jobId` adds ordered `screeningQuestions`; unavailable or missing Job returns HTTP 404 `JOB_NOT_FOUND`.

Malformed page, filter, sort or UUID returns HTTP 400 validation; reversed salary bounds return HTTP 400 `JOB_INVALID_RANGE`. No authentication is needed. Live read-only checks on port 3002 passed with 3 public jobs, stable page order, accurate totals, empty-page handling, 6 invalid query responses, detail and anonymous private-route denial. Current 3 jobs have no saved JobLocation or displayed salary suitable for positive filter acceptance. Approved demonstration data will enable positive province/salary browser checks. The official ward API still returns 0 rows pending separate import approval; province API returns 34.

Backend release evidence, backup and import gates: [BACKEND_RELEASE_SPRINT_2026-10-25.md](BACKEND_RELEASE_SPRINT_2026-10-25.md). Antigravity should keep browser acceptance separate from Backend unit and read-only HTTP evidence.
