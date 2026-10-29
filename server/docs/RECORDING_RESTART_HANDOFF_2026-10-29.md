# Recording and controlled restart handoff — 2026-10-29

## Current runtime and roles

- Frontend `http://127.0.0.1:5177`: Vite PID 1680 from `D:\DACSN\Find-Work-Employer-UX`.
- Backend `http://127.0.0.1:3002/api/v1`: Node PID 18216 from this recovery worktree. Health returns `status: ok`, `database: up`. The running module graph is backend SHA `131aeaaa90c60eefbc23b98068c07823c46293af`; building later source does not hot reload it.
- Database `findwork_employer_media_3002`: 16 completed migrations. Keep it, the private credentials, and worker settings intact.
- Established accounts: Super Admin (system role), AnhDungEconomy `EMPLOYER` with `OWNER` company role, and `nanhdung840@gmail.com` `CANDIDATE`. Use their existing private credential records. Do not place secrets in commands or recordings.

## Existing recording records and read routes

- Company `c49eaf31-68b5-4b33-9b22-02bcce25453b` (AnhDungEconomy), job `a7d58b1c-155f-4cf0-bdf2-d8788b6faaf0` (Nhân Viên Kinh Doanh).
- Application `5dc573f0-451f-46c0-b2b7-9d9f6ff38a3b`: `SUBMITTED`, one linked builder resume/version, one candidate message. Interview `f149c8c8-60ce-48da-8dfe-a69a9c1896f6`: `SCHEDULED`, PHONE, 2026-10-30 09:00–09:30 Asia/Ho_Chi_Minh.
- Candidate API reads: `/candidate/profile`, `/candidate/resumes`, `/candidate/resumes/:resumeId`, `/candidate/applications/:applicationId`, `/candidate/applications/:applicationId/interviews`, `/candidate/conversations/:applicationId/messages`.
- Employer API reads: `/companies/:companyId/jobs/:jobId/applications/:applicationId`, `/companies/:companyId/applications/:applicationId/interviews`, `/companies/:companyId/conversations/:applicationId/messages`.
- Admin API reads: `/admin/dashboard`, `/admin/companies/:companyId`, `/admin/jobs/:jobId`, `/admin/audit`, `/admin/reports/summary`.
- Employer report: `/companies/:companyId/reports/recruitment`, optional `jobId=:jobId`. Prefix every API path above with `/api/v1` on port 3002.

## Restart only when separately authorized

The **original** private launcher `D:\FINDWORK_Backups\findwork_review_f938cba61488_20261028_110523\provider-prep\start-recruitment-backend-3002.cjs` pins obsolete SHA `28d35a9cd5b0aaeb58750714d93960f0583841c0` and writes a one-use process record. The running 3002 came from a temporary copy pinned to `131aeaaa...`; its record is `reporting-3002-131aeaaa-process.json`. Neither original file nor private environment was edited. A later restart must make a fresh copy pinned to the intended checkout SHA, with a unique process record filename. Do not reuse an old copy or delete old records.

Run these PowerShell commands in one shell, after checking the desired recording SHA against `git rev-parse HEAD` and completing the backend build. The preflight checks the exact local DB name, fingerprint, 16 migrations, provider configuration, and `EMAIL_WORKER_ENABLED=false` **before** the current backend is stopped.

```powershell
$repo = 'D:\DACSN\Find-Work-Email-Recovery'
$launcherSource = 'D:\FINDWORK_Backups\findwork_review_f938cba61488_20261028_110523\provider-prep\start-recruitment-backend-3002.cjs'
$recordDirectory = 'D:\FINDWORK_Backups\findwork_review_f938cba61488_20261028_110523\provider-prep'
Push-Location (Join-Path $repo 'server')
try { npm run build; if ($LASTEXITCODE -ne 0) { throw 'Backend build failed' } } finally { Pop-Location }
$head = (git -c safe.directory='D:/DACSN/Find-Work-Email-Recovery' -C $repo rev-parse HEAD).Trim()
if (git -c safe.directory='D:/DACSN/Find-Work-Email-Recovery' -C $repo status --porcelain) { throw 'Recovery checkout is dirty' }
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmssfff')
$launcherCopy = Join-Path $env:TEMP "findwork-3002-$stamp.cjs"
$recordName = "findwork-3002-$stamp-process.json"
$raw = [IO.File]::ReadAllText($launcherSource)
if (-not $raw.Contains('28d35a9cd5b0aaeb58750714d93960f0583841c0') -or -not $raw.Contains('recruitment-3002-provider-process.json')) { throw 'Private launcher changed; re-inspect it' }
$raw = $raw.Replace('28d35a9cd5b0aaeb58750714d93960f0583841c0', $head).Replace('recruitment-3002-provider-process.json', $recordName)
[IO.File]::WriteAllText($launcherCopy, $raw, [Text.UTF8Encoding]::new($false))
& 'C:\nvm4w\nodejs\node.exe' $launcherCopy preflight
```

For the currently recorded PID, verify identity immediately before stopping. If any assertion fails, stop the procedure and inspect; never stop an unidentified process.

```powershell
$listener = Get-NetTCPConnection -State Listen -LocalPort 3002 -ErrorAction Stop
$process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
$current = Get-Content -LiteralPath (Join-Path $recordDirectory 'reporting-3002-131aeaaa-process.json') | ConvertFrom-Json
if ($listener.OwningProcess -ne $current.pid -or $current.cwd -ne 'D:/DACSN/Find-Work-Email-Recovery/server' -or $process.Name -ne 'node.exe' -or $process.CommandLine -ne 'C:/nvm4w/nodejs/node.exe dist/main.js') { throw 'Backend identity changed' }
Stop-Process -Id $current.pid -ErrorAction Stop
& 'C:\nvm4w\nodejs\node.exe' $launcherCopy start
Invoke-RestMethod 'http://127.0.0.1:3002/api/v1/health'
Get-NetTCPConnection -State Listen -LocalPort 5177,3002 | Select-Object LocalPort,OwningProcess
```

If frontend 5177 is separately found stopped, its observed startup command is `npx vite --host 127.0.0.1 --port 5177 --strictPort` from `D:\DACSN\Find-Work-Employer-UX`. Leave a healthy 5177 untouched.

The private launcher explicitly sets `EMAIL_WORKER_ENABLED=false`, `EMAIL_INVITATION_DELIVERY_ENABLED=false`, `EMAIL_PASSWORD_RESET_ENABLED=false`, and `EMAIL_RECRUITMENT_NOTIFICATIONS_ENABLED=true` with `EMAIL_DELIVERY_MODE=resend`. General workers must remain off; new recruitment events can queue mail, but this API launch does not drain queued jobs.

## Checks completed

- Read-only SQL: application, interview, profile/resume links, candidate message count/read flags, 16 migrations, and Admin/company reporting totals.
- Live authenticated HTTP: employer applicant detail/list, interview list, conversation/message reads; Admin dashboard, company/job details, audit list, reporting; company report with and without its owned job. The owner is denied candidate-only and Admin routes, and a foreign-company report returns 403.
- Backend unit suite: 35 suites / 285 tests passed after the messaging guard change. Backend build passed. No database-writing integration tests ran because no verified disposable test database configuration was present.
## Recording limits

- Verification and interview invitation were already accepted and sent once; do not resend. An application confirmation job remains queued. Do not start general email workers.
- Backend reports distinguish current status from period events; interviews are independent of application stage. Hires, billing, partnerships, and packages are `UNAVAILABLE` rather than zero. The employer reporting route requires active company membership and company permissions; the Admin report requires SYSTEM permissions.
- The company messaging capability guard added after the live `131aeaaa` runtime is **not live** until a separately authorized backend restart. When loaded, company conversation routes require `application.view` platform capability in addition to their existing company permissions; tell Antigravity if it handles `PLATFORM_CAPABILITY_DENIED`.
- Candidate-side HTTP reads require the candidate's established private credential path. They are not inferred from the owner's browser session. Database-writing integration tests were not run without a verified disposable database.