# Submission browser E2E handoff

Source of truth: current Nest controllers, DTOs and services in `server/src`. Base path is `/api/v1`; IDs for Job, Company, Resume, ResumeVersion, Question and Application are UUID v4. The backend Submission workflow integration suite passed **1/1** against `findwork_test` after its fixture corrections. That suite uses an in-process Nest app. No real browser flow or browser fixture setup has been run.

## HTTP runtime and browser routing (observed 2026-10-19)

- The existing Backend at `http://127.0.0.1:3000/api/v1` is PID **29012**, started before the current build. Its live PostgreSQL connection was matched by TCP client port to `findwork_dev`. Health 200 on this process does **not** make it safe for browser writes.
- A separate Backend test HTTP process was started from this worktree's current `server/dist/main.js` with `D:\DACSN\Find-Work\server\.env.test`: PID **2312**, `http://localhost:3001/api/v1`, `NODE_ENV=test`. It listens on `127.0.0.1:3001` only. Health and public Jobs GET returned 200. Its live TCP connection was matched to PostgreSQL `findwork_test` on `127.0.0.1:5432`; the test URL selects schema `public`. The public Jobs list was empty before fixture setup. This HTTP check did not create data. PIDs are observations, not permanent configuration.
- The existing Vite process is on port **5176**. Its `vite.config.ts` proxies relative `/api/v1` to port **3000**, therefore this browser instance reaches `findwork_dev`. Do not use it for writes. The test Backend allows origin `http://localhost:5173` only: read-only preflight returned `Access-Control-Allow-Origin: http://localhost:5173` and credentials `true`; origins `http://localhost:5176` and `http://127.0.0.1:5173` had no allowed-origin header.
- Use a dedicated Frontend Vite process at **`http://localhost:5173`** with `VITE_API_BASE_URL=http://localhost:3001/api/v1` set **before Vite starts**. Antigravity owns that process and the Frontend write gate. Use `localhost` for both browser and API so the HTTP-only, `SameSite=Lax` refresh cookie works with the Axios `withCredentials: true` client. A Vite restart is needed for a changed `VITE_API_BASE_URL`; setting it after startup does not reroute the current process.

The test HTTP process above is currently running. If it is no longer running, start it in a **separate Backend terminal** from `D:\DACSN\Find-Work-Submission-Backend-MVP\server`; leave the dev process on 3000 untouched:

```powershell
$env:EMAIL_DELIVERY_MODE = 'disabled'
$env:EMAIL_WORKER_ENABLED = 'false'
$env:EMAIL_INVITATION_DELIVERY_ENABLED = 'false'
node -r dotenv/config .\dist\main.js dotenv_config_path=D:\DACSN\Find-Work\server\.env.test dotenv_config_override=true
```

The test file sets `PORT=3001`, `API_PREFIX=api/v1`, `CORS_ORIGINS=http://localhost:5173` and the test DB URL. `dotenv_config_override=true` gives that file precedence over inherited dev values; the three email settings above prevent external delivery. `main.ts` binds `NODE_ENV=test` to `127.0.0.1` (other environments keep their existing bind behavior). `AppModule` starts no maintenance/email worker, and its Prisma startup hook only connects. Do not run worker entrypoints. Source inspection and startup/health confirmed no automatic database mutation, but this is not proof about future feature requests.

Verify the running process, **not just its config file**:

```powershell
Invoke-WebRequest http://localhost:3001/api/v1/health -UseBasicParsing
Invoke-WebRequest http://localhost:3001/api/v1/jobs -UseBasicParsing
netstat -ano -p tcp | Select-String ':3001|:5432'
```

Find the PID listening on `127.0.0.1:3001`, then its established `127.0.0.1:<clientPort> -> 127.0.0.1:5432` connection in `netstat`. From `server`, run this **read-only** check immediately after a health GET; it obtains the current client port automatically:

```powershell
curl.exe --silent --output NUL http://localhost:3001/api/v1/health
$listener = netstat -ano -p tcp | Select-String '^\s*TCP\s+127\.0\.0\.1:3001\s+0\.0\.0\.0:0\s+LISTENING\s+(\d+)' | Select-Object -First 1
if (-not $listener) { throw 'No loopback test HTTP listener.' }
$testHttpPid = [int]$listener.Matches[0].Groups[1].Value
$pgLine = netstat -ano -p tcp | Select-String ("^\s*TCP\s+127\.0\.0\.1:(\d+)\s+127\.0\.0\.1:5432\s+ESTABLISHED\s+" + $testHttpPid + "\s*$") | Select-Object -First 1
if (-not $pgLine) { throw 'No PostgreSQL connection from test HTTP process; retry immediately after health GET.' }
$dbClientPort = [int]$pgLine.Matches[0].Groups[1].Value
$readOnlyCheck = @'
const {parse} = require('dotenv');
const {readFileSync} = require('fs');
const {Client} = require('pg');
(async () => {
  const env = parse(readFileSync(process.argv[2]));
  const client = new Client({connectionString: env.DATABASE_URL});
  await client.connect();
  try {
    const own = await client.query('SELECT current_database() AS db, current_schema() AS schema, inet_server_addr()::text AS host, inet_server_port() AS port');
    const runtime = await client.query('SELECT datname, client_addr::text AS host, client_port FROM pg_stat_activity WHERE client_port = $1', [Number(process.argv[3])]);
    console.log(JSON.stringify({testConnection: own.rows[0], httpProcessConnection: runtime.rows}));
    if (own.rows[0].db !== 'findwork_test' || own.rows[0].schema !== 'public' || own.rows[0].port !== 5432 ||
        !own.rows[0].host.startsWith('127.0.0.1') || runtime.rows.length !== 1 ||
        runtime.rows[0].datname !== 'findwork_test' || !runtime.rows[0].host.startsWith('127.0.0.1')) process.exitCode = 1;
  } finally { await client.end(); }
})().catch(() => { console.error('Database identity check failed.'); process.exitCode = 1; });
'@
$readOnlyCheck | node - D:\DACSN\Find-Work\server\.env.test $dbClientPort
```

Stop if the check fails, if the HTTP port is occupied by another process, or if the Node process's TCP client port does not match the row queried above. Health reports only `database: up`; it does not expose the DB name. The client port changes when the process reconnects.

After approved fixture setup, retain its output `runId`, `jobId`, `companyId`, `resumeId`, `resumeVersionId`, question IDs and two login emails. The passwords stay with the operator. Confirm `GET http://localhost:3001/api/v1/jobs/<jobId>` returns a PUBLISHED UUID Job with five questions. After an approved browser submission, require POST HTTP 201 with an Application UUID; verify persistence through authenticated `GET /api/v1/candidate/applications/:applicationId` and recruiter `GET /api/v1/companies/:companyId/jobs/:jobId/applications/:applicationId`, including saved answers and snapshots. A success screen alone is insufficient. Run the scoped cleanup below with the **same run ID** only after browser activity stops. If setup fails partway, keep that run ID, inspect the partial records and use the same scoped cleanup; if cleanup refuses an external reference, stop for manual review rather than deleting broadly.

## Before opening the browser

- Confirm the **running Backend used by the browser** connects to `findwork_test` on `127.0.0.1:5432/public`. The fixture CLI checks its own connection, but cannot prove the already running server uses that database. Do not infer this from a matching API URL.
- The current Frontend `src/features/candidate/profile/config/candidateIntegrationConfig.ts` has `ENABLE_LIVE_WRITES: false`. Browser mutations cannot complete while that gate is closed. Changing that flag belongs to the separately controlled Frontend session.
- Use a real UUID from `GET /jobs/:jobId`, not a numeric demo Job or local CV ID. The browser fixture below does not bind a port or restart servers.
- Protected endpoints require `Authorization: Bearer <accessToken>`. Access tokens are session-backed and short-lived. `POST /auth/refresh` uses the HTTP-only refresh cookie (`/api/v1/auth` path, `SameSite=Lax`); send credentials on browser requests and retain the rotated cookie. `GET /auth/me` tests the active session. Register/login/refresh return `{accessToken,accessTokenExpiresInSeconds,user:{id,email,status,emailVerified}}`; the refresh token is never in JSON. An `Origin` header on register/login/logout must match configured `CORS_ORIGINS`.
- API errors use `{code,message,details?,traceId,path,timestamp}`. DTO validation returns HTTP 400 `VALIDATION_ERROR` with field details. UUID path validation returns 400; missing/invalid bearer returns 401 (`AUTH_ACCESS_TOKEN_REQUIRED`, `AUTH_ACCESS_TOKEN_INVALID`, `AUTH_SESSION_INVALID`); denied permission/scope returns 403. Never treat a failed POST as a submitted application.

## API operations

`E2E` below means the single passing backend Submission suite exercises that behavior. `Code` means its contract is implemented but that particular variant was not asserted by the suite. All request examples use JSON.

| Operation | Auth and minimum request | Success and prerequisites | Errors / evidence |
| --- | --- | --- | --- |
| `POST /auth/register` | Public; `{ "email":"candidate@example.test", "password":"a private 8-128 character password" }` | 201 auth JSON and refresh cookie; creates ACTIVE user, CANDIDATE role and session. | 400 validation, 409 `AUTH_EMAIL_ALREADY_REGISTERED`, 403 origin, 429 throttle. **Code**; fixture CLI uses this API when approved. |
| `POST /auth/login` | Public; same body. | 200 auth JSON and refresh cookie for ACTIVE user. | 401 `AUTH_INVALID_CREDENTIALS`, 403 `AUTH_ACCOUNT_UNAVAILABLE`/`AUTH_ORIGIN_FORBIDDEN`, 429. **Code**. |
| `POST /auth/refresh`; `POST /auth/logout`; `GET /auth/me` | Refresh/logout use refresh cookie; `me` uses bearer. No JSON body. | 200 rotated auth JSON; 204 logout; 200 current user. | 401 invalid session for refresh/me; `me` also checks ACTIVE user and unrevoked session. Expired session rejection **E2E**; browser cookie rotation **Code**. |
| `GET /candidate/bootstrap`; `GET /candidate/onboarding-draft` | Bearer; no body. | 200 `{profile:{state:"exists"\|"not_created",canCreateProfile,canViewProfile},draft:{state:"missing"}\|{state:"exists",version}}`; draft GET returns `{data,stepIndex,version,updatedAt}` or `null`. Draft alone is not a profile. | 401 auth. Bootstrap/draft/import path **E2E**. |
| `PUT /candidate/onboarding-draft` | Bearer; `{version:0,stepIndex:6,data:<complete eight-section draft>}` on first save; use returned version thereafter. | 200 private draft with incremented version; no profile created. | 400 `CANDIDATE_DRAFT_INVALID`/`CANDIDATE_DRAFT_TOO_LARGE`; 409 `CANDIDATE_DRAFT_VERSION_CONFLICT`. **E2E** with valid draft. |
| `POST /candidate/profile/import-onboarding` | Bearer; `{version:<current draft version>,confirmPrivacy:true}` only after explicit user confirmation. | 201 complete profile with imported supported data and `privacySetting`; preserves draft. Account email, structure and active references must validate. Initial privacy is private: `searchableProfile/showEmail/showPhone/allowResumeDownload=false`, `allowJobMatching=true`. | 400 `CANDIDATE_IMPORT_PRIVACY_DIFFERENCES` returns `details.privacyDifferences` and `initialPrivacy`; only then seek explicit `confirmPrivacyDifferences:true`. 400 `CANDIDATE_IMPORT_UNSUPPORTED_ASSETS` returns `details.unsupportedAssets`; only then seek `confirmOmitUnsupportedAssets:true`. Also 400 invalid/email/reference, 404 missing draft, 409 version/profile/import conflict, 503 missing/invalid catalog. Basic consent/import **E2E**; all branches **unit/code**. |
| `POST /candidate/profile`; `GET /candidate/profile` | Bearer; manual create `{fullName:"Candidate"}`; GET requires `profile.view: OWN`. | 201 created profile with CANDIDATE role/private defaults; 200 own profile. Manual creation does **not** import an existing draft. | 409 `CANDIDATE_PROFILE_ALREADY_EXISTS`, 404 `CANDIDATE_PROFILE_NOT_FOUND`, 403 permission. Manual create and read **E2E**. |
| `POST /candidate/resumes` | Bearer, `resume.create: OWN`; `{name:"My CV",builderContent:{summary:"..."}}`; optional `templateCode`, `builderSettings`. Existing CandidateProfile required. | 201 `{id,name,sourceType:"BUILDER",status:"READY",isDefault,createdAt,updatedAt,versions:[{id,versionNumber:1,templateCode,builderContent,builderSettings,createdAt}]}`. JSON builder content/settings capped at 128 KiB. | 400 validation/content size, 404 profile, 403 permission. **E2E**. There is no local file/uploaded CV application attachment API. |
| `GET /candidate/resumes`; `GET /candidate/resumes/:resumeId`; `PATCH /candidate/resumes/:resumeId` | Bearer, own resume permission. PATCH `{name:"My CV",builderContent:{summary:"new"},expectedVersionNumber:1}`. | List: `{data:[Resume]}` with only latest version `{id,versionNumber,createdAt}`. Detail: all versions with builder JSON. PATCH 200 creates immutable version 2; application keeps selected version ID. | 404 `RESUME_NOT_FOUND`; 409 `RESUME_VERSION_CONFLICT`/`RESUME_STATE_CONFLICT`. List/detail/version and cross-account isolation **E2E**. Use `Resume.id` as `resumeId`, chosen `ResumeVersion.id` as `resumeVersionId`. |
| `POST /companies`; `GET /companies/me` | Bearer; `{name:"Test Company",slug:"test-company"}`. | 201 `{id,name,slug,status:"ACTIVE",verificationStatus,createdAt}`; creator becomes active OWNER with company-wide `company.view/update` and `application.view/review`. Workspace GET 200 `{data:[{id,name,slug,status,verificationStatus,memberRoleNames}]}`. | 400 invalid slug/name, 409 duplicate slug, 401 auth. **E2E**. A separately invited RECRUITER has `application.view/review`, but no `company.update`; only OWNER/ADMIN can create/publish the Job. |
| `POST /companies/:companyId/jobs` | Bearer, active member, `company.update: COMPANY`; `{categoryId:"<active category UUID>",title:"Test engineer",description:"At least twenty characters.",employmentType:"FULL_TIME",workplaceType:"REMOTE"}`. | 201 Job `{id,companyId,categoryId,status:"DRAFT",version:1,...}`. The browser fixture creates its own active category. | 400 `JOB_CATEGORY_INVALID`/validation, 403 permission, 404 company. **E2E**. |
| `PUT /companies/:companyId/jobs/:jobId/screening-questions`; company `GET` same path | PUT: bearer, active member, `company.update: COMPANY`; `{version:<current Job version>,questions:[{type:"TEXT",label:"Years of experience?",isRequired:true,displayOrder:0}]}`. GET needs `company.view: COMPANY`. | 200 `{jobId,version:<incremented>,questions:[{id,type,label,isRequired,displayOrder,options}]}`; GET 200 same shape. Only DRAFT/PAUSED Job; PUT replaces active set. At most 20, unique order 0-19. Choice types require 2-20 distinct options. | 400 validation/order/options, 403 permission, 404 other company/job, 409 `JOB_VERSION_CONFLICT`/`SCREENING_JOB_STATE_CONFLICT`. All five types, ordering, tenant isolation and replacement **E2E**. |
| `POST /companies/:companyId/jobs/:jobId/publish`; `pause`; `close` | Bearer, `company.update: COMPANY`; `{version:<latest Job version>}`. | 200 Job with next version and status `PUBLISHED`/`PAUSED`/`CLOSED`. Publish from DRAFT/PAUSED only; active company/category and future deadline/expiry. | 409 `JOB_VERSION_CONFLICT`, `JOB_STATE_CONFLICT`, `JOB_DEADLINE_EXPIRED`; 403/404 scope/ownership. Publish and pause **E2E**; company close **Code**. |
| `GET /jobs`; `GET /jobs/:jobId` | Public; list query `page=1&pageSize=20`, optional `q`, `companyId`, `categoryCode`, employment/workplace filters. | List `{data,pagination}`; detail Job fields plus ordered active `screeningQuestions[]`. Only eligible PUBLISHED jobs of ACTIVE companies/categories before deadline/expiry appear. | 404 `JOB_NOT_FOUND` for unavailable detail, 400 bad UUID/query. Discovery, public detail and disappearance after pause/close **E2E**. |
| `POST /jobs/:jobId/applications` | Bearer, `application.create: OWN`; exact body below. Existing CandidateProfile, owned READY BUILDER ResumeVersion with content, eligible published UUID Job, valid answers, no prior application. | 201 Application summary `{id,companyId,jobId,status:"SUBMITTED",version:1,resumeId,resumeVersionId,fullNameSnapshot,emailSnapshot,phoneSnapshot,currentLocationSnapshot,availability,preferredContactMethod,coverLetter,jobSnapshot,job,...}`. Application, status history and answers commit in one transaction. | 400 `RESUME_UNAVAILABLE` or screening error; 404 profile; 409 `JOB_UNAVAILABLE`/`APPLICATION_DUPLICATE`; 401/403 auth. Valid submit, duplicate, wrong CV owner and rejected answers without partial application **E2E**. |
| `GET /candidate/applications`; `GET /candidate/applications/:applicationId` | Bearer, `application.view: OWN`; list query `page`, `pageSize`, optional uppercase `status`. | List `{data,pagination}` with application summaries. Detail includes `resumeVersion` builder JSON and `answers:[{id,screeningQuestionId,questionSnapshot,answerValue,createdAt}]`. | 404 `APPLICATION_NOT_FOUND` for other candidate; 400 invalid status. List/detail and CV version snapshot **E2E**. |
| `GET /companies/:companyId/jobs/:jobId/applications`; `GET .../:applicationId`; `PATCH .../:applicationId/status` | Bearer, active company member, `application.view: COMPANY` for reads and `application.review: COMPANY` for PATCH. PATCH `{version:1,status:"REVIEWING"}`. | Lists `{data,pagination}`; detail includes answer and CV snapshots; PATCH 200 updated summary with incremented version and status. | 403 wrong permission/member, 404 other company/job/application, 409 `APPLICATION_VERSION_CONFLICT`/`APPLICATION_STATE_CONFLICT`. Review, answer visibility, stale version and cross-company isolation **E2E**. |
| `POST /candidate/saved-jobs`; `GET /candidate/saved-jobs`; `GET /candidate/saved-jobs/:jobId/status`; `DELETE /candidate/saved-jobs/:jobId` | Bearer, `saved_job.manage: OWN`, existing CandidateProfile; POST `{jobId:"<eligible UUID>"}`. | 201 `{id,jobId,savedAt,isAvailable:true,job}`; list `{data:[{id,jobId,savedAt,isAvailable,job|null}],pagination}`; status `{jobId,saved,isAvailable}`; delete 204. Paused/closed Job remains in list with `isAvailable:false,job:null`. | 400 invalid UUID, 404 missing profile/unavailable Job/saved row, 409 `SAVED_JOB_DUPLICATE`. Save/list/status/delete and closed-job redaction **E2E**. |
| `GET /admin/dashboard`, `/admin/users`, `/admin/companies`, `/admin/jobs` | Bearer with SYSTEM-scope `SUPPORT_ADMIN` grants (`user.view`, `company.view`, `job.view`); listings take page/pageSize/filter. | 200 counts or `{data,pagination}`. | 401 unauthenticated, 403 candidate/company-only role. These reads **E2E**. |
| `POST /admin/jobs/:jobId/close` | Bearer with SYSTEM `job.moderate` (normally `MODERATION_ADMIN`); no body. | 200 closed Job, audit record; subsequent public detail 404. | 403 SUPPORT_ADMIN, 409 repeat/invalid state. **E2E**. Other admin mutations are available in `admin.controller.ts` but are not needed for this browser flow and are **Code** only here. |

### Application body and answer rules

```json
{
  "resumeId": "<owned Resume UUID>",
  "resumeVersionId": "<version UUID within that Resume>",
  "details": {
    "contact": { "fullName": "Browser Candidate", "email": "candidate@example.test", "phone": "+84901234567" },
    "currentLocation": "Ho Chi Minh City",
    "availability": "within-2-weeks",
    "preferredContactMethod": "email"
  },
  "coverLetter": "Optional, at most 5000 characters",
  "answers": [
    { "questionId": "<TEXT UUID>", "answer": "Five years" },
    { "questionId": "<TEXTAREA UUID>", "answer": "Built a recruiting service." },
    { "questionId": "<SELECT UUID>", "answer": "Remote" },
    { "questionId": "<MULTI_SELECT UUID>", "answer": ["Node", "SQL"] },
    { "questionId": "<YES_NO UUID>", "answer": false }
  ]
}
```

`details.contact.fullName` is required (trimmed, 1-160), email required/valid (max 320), phone required (8-15 digits, common dial punctuation, max 32). `currentLocation` is optional (max 255). `availability` is exactly `immediately | within-1-week | within-2-weeks | within-1-month | negotiable`; `preferredContactMethod` is `email | phone`. Backend stores those in snapshot columns (availability/contact method become uppercase with underscores) and does not change CandidateProfile. Unknown body fields fail validation. `coverLetter` is optional; optional screening questions may be omitted. The Submit response is a **summary**; GET detail to inspect immutable answer and CV snapshots.

For answers, each `questionId` must be an active UUID from this Job. `TEXT` accepts 1-500 trimmed characters, `TEXTAREA` 1-5000, `YES_NO` a boolean including `false`, `SELECT` exactly one listed option, `MULTI_SELECT` 1 or more distinct listed options. Required questions need one answer. Invalid/foreign/duplicate/missing answers return 400 `SCREENING_ANSWER_INVALID`, `SCREENING_OPTION_INVALID`, `SCREENING_QUESTION_INVALID`, `SCREENING_ANSWER_DUPLICATE`, or `SCREENING_REQUIRED_ANSWER_MISSING`; malformed DTOs return `VALIDATION_ERROR`. The recruiter sees preserved `questionSnapshot`/`answerValue` even after the active questions change.

Review statuses: `SUBMITTED -> REVIEWING|REJECTED`, `REVIEWING -> SHORTLISTED|REJECTED`, `SHORTLISTED -> INTERVIEW|REJECTED`, `INTERVIEW -> OFFERED|REJECTED`; `OFFERED` and `REJECTED` are terminal. `WITHDRAWN` is a query enum value but has no candidate mutation endpoint. List filters use uppercase status. Reuse the latest `version` returned by the preceding review.

## Current Frontend handoff points (read-only inspection)

1. `src/services/api/candidateApplicationApi.ts` sends `details`, CV IDs, optional cover letter and typed answers in the Backend shape. `src/pages/candidate/JobApplicationPage/JobApplicationPage.tsx` chooses the real flow for UUID Job IDs and sends values from Steps 2-3. Do not substitute numeric demo IDs or local draft IDs.
2. `src/features/candidate/profile/config/candidateIntegrationConfig.ts` currently disables writes. Antigravity must coordinate its browser test against the isolated test Backend before enabling any Frontend write path. This Backend worktree does not alter that flag.
3. `src/services/api/apiTypes.ts` `normalizeCompanyApplication` currently omits `currentLocationSnapshot`, `availability`, `preferredContactMethod`, `answers`, `jobSnapshot`, and some ResumeVersion fields from the Backend response. If the UI claims or displays persisted Step 2/answer values, add explicit mappings and verify against GET detail. This is a Frontend adapter gap; the Backend already returns these fields.
4. Frontend should keep the application draft until POST returns 201, then clear it. Duplicate 409 means an application already exists; use candidate list/detail to navigate to it. Resume creation must preserve the original Job UUID and return route, then select the newly returned Resume UUID and ResumeVersion UUID before submitting.

## Optional browser fixture: prepared, **not executed**

`test/submission-browser-fixture.ts` is an explicitly invoked CLI. It uses Nest application APIs to register two normal accounts with real password hashes/sessions, creates a manual CandidateProfile and READY builder CV, creates a company whose owner can review applications, then creates a run-specific category, DRAFT Job, all five question types and publishes the Job. The account labeled `recruiter` receives the company **OWNER** role; OWNER has `application.view/review`, while a distinct `RECRUITER` membership is not created by this minimal fixture. It does not add an authentication shortcut, bind a server port, expose passwords/tokens, or modify existing accounts. Output contains only the run ID, emails and resource UUIDs. The candidate profile is created manually for the application browser test; use a separate fresh account to test onboarding import itself.

The utility refuses setup/cleanup unless an explicit `.env.test` file says `NODE_ENV=test`, the URL is exactly `127.0.0.1:5432/findwork_test?schema=public`, and the **connected** database/schema identity matches. Email delivery/workers are disabled in the utility process. The `--approve-test-writes` flag is an extra CLI guard; it does not replace user approval. No setup or cleanup command below has been executed.

After separate approval, from `server` in PowerShell, supply **different passwords of 12-128 characters** through masked prompts. Do not place passwords in command arguments, source files or logs:

```powershell
$runId = [guid]::NewGuid().ToString()
$env:BROWSER_FIXTURE_CANDIDATE_PASSWORD = (New-Object System.Net.NetworkCredential('', (Read-Host 'Candidate fixture password' -AsSecureString))).Password
$env:BROWSER_FIXTURE_RECRUITER_PASSWORD = (New-Object System.Net.NetworkCredential('', (Read-Host 'Recruiter fixture password' -AsSecureString))).Password
node .\test\preflight-submission-db.cjs --env-file D:\DACSN\Find-Work\server\.env.test
node .\node_modules\tsx\dist\cli.mjs test/submission-browser-fixture.ts setup --run-id $runId --env-file D:\DACSN\Find-Work\server\.env.test --approve-test-writes
```

The expected DB effects are two fixture User/Role/Session records, one CandidateProfile with private defaults, one READY Resume/ResumeVersion, one run-coded JobCategory, one ACTIVE Company with its standard company roles/OWNER member, one PUBLISHED Job and five screening questions. The script prints the real UUIDs and login emails; the operator supplies the prompted passwords in the browser login. **Keep the run ID** for cleanup. The fixture does not pre-submit an application, so the candidate can exercise the browser flow once. A second submission should receive 409 `APPLICATION_DUPLICATE`.

Stop browser activity for these fixture accounts/Job before cleanup. After separate approval, use the same run ID and environment:

```powershell
node .\node_modules\tsx\dist\cli.mjs test/submission-browser-fixture.ts cleanup --run-id $runId --env-file D:\DACSN\Find-Work\server\.env.test --approve-test-writes
Remove-Item Env:\BROWSER_FIXTURE_CANDIDATE_PASSWORD,Env:\BROWSER_FIXTURE_RECRUITER_PASSWORD -ErrorAction SilentlyContinue
```

Cleanup selects the exact `browser-<run UUID>` emails/company slug/category code and their owned IDs. It deletes only their dependent application/history/answers, saved jobs, CVs, questions, jobs, company records and fixture accounts, inside a transaction. It **refuses** to proceed if another account applied to/saved the fixture Job, a fixture account interacted with another Job/company, outsiders joined the company, or assignment/interview/invitation/external audit records need review. A failed setup can leave partial run-coded records; execute only this scoped cleanup after investigating the failure. Repeated setup refuses an existing run ID; repeated cleanup finds no run-owned rows. There is no truncate, reset, global seed or migration.

The CLI is TypeScript checked and its no-command usage path was executed without writes. Its setup/cleanup paths are **unverified** until explicitly approved and run against `findwork_test`. The browser flow likewise remains unverified.
