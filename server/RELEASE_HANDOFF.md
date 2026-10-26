# Backend release handoff

Base path: `/api/v1`. All Admin and messaging routes require an access-token Bearer header. Pagination uses `page` and `pageSize` (maximum 100). The company `OWNER` role is company scoped; it does not grant Platform Admin access.

## First Platform SUPER_ADMIN

The seed creates the protected `SUPER_ADMIN` role but no account. `POST /auth/register/v2` creates only Candidate or Employer users. There is no HTTP bootstrap endpoint. On 26 October the shared integration database had **zero** `SUPER_ADMIN` assignments (read-only inspection).

After the operator authorizes a write to the exact target database and verifies a backup, run from `server` in a private PowerShell session:

```powershell
$env:FINDWORK_BOOTSTRAP_ENV_FILE = '.env.employer-media.local'
$env:ADMIN_BOOTSTRAP_EXPECTED_DATABASE = 'findwork_employer_media_3002'
node scripts/bootstrap-first-super-admin.cjs

# Only after explicit approval for this database:
$env:ADMIN_BOOTSTRAP_EMAIL = Read-Host 'New Platform Admin email'
$adminSecret = Read-Host 'New Platform Admin password (16-128 characters)' -AsSecureString
$secretPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecret)
try {
  $env:ADMIN_BOOTSTRAP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPtr)
  $env:ADMIN_BOOTSTRAP_ALLOW_WRITE = 'YES'
  $env:ADMIN_BOOTSTRAP_ALLOW_SHARED_DB = 'YES'
  node scripts/bootstrap-first-super-admin.cjs --apply
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPtr)
  Remove-Item Env:ADMIN_BOOTSTRAP_PASSWORD,Env:ADMIN_BOOTSTRAP_ALLOW_WRITE,Env:ADMIN_BOOTSTRAP_ALLOW_SHARED_DB,Env:ADMIN_BOOTSTRAP_EMAIL -ErrorAction SilentlyContinue
}
```

The command creates a **new** account with an Argon2id password hash, one `SUPER_ADMIN` role assignment, and an audit event in a single transaction. It rejects an existing email, a second bootstrap, a database identity mismatch, or missing authorization. It never prints credentials. Sign in with `POST /auth/login`; the Admin account's public `accountType` is `LEGACY_UNCLASSIFIED`, so Frontend must identify Platform Admin capability by a successful authorized Admin request, never by assuming a company role or treating `LEGACY_UNCLASSIFIED` as admin.

## Admin contracts

`GET /admin/dashboard` returns `{users,activeUsers,companies,activeCompanies,pendingCompanies,jobs,publishedJobs,applications}`. `GET /admin/users`, `/admin/companies`, `/admin/jobs`, and `/admin/audit` return `{data,pagination}`. Detail routes are `/admin/users/:userId`, `/admin/companies/:companyId`, and `/admin/jobs/:jobId`.

Mutations: `PATCH /admin/users/:userId/status` (`ACTIVE` or `SUSPENDED`), `POST /admin/users/:userId/disable`, `PATCH /admin/companies/:companyId/verification` (`VERIFIED` or `REJECTED`; rejection requires a reason), `PATCH /admin/companies/:companyId/status` (`ACTIVE` or `SUSPENDED`), and `POST /admin/jobs/:jobId/close`. Legal review also has `/admin/companies/:companyId/legal` and `/admin/companies/:companyId/legal/evidence/:evidenceId`. There is **no** Platform Admin creation/role assignment API, bulk moderation API, dashboard time series API, or generic audit export endpoint. `401` means no valid session; `403` means valid but insufficient permission.

## Email and AI

Verification: authenticated `POST /auth/email-verification/request` (204), then public `POST /auth/email-verification/confirm` with `{token}` (204). The frontend `/verify-email#token=...` page strips the fragment and calls the confirm endpoint. Invitations: `POST /companies/:companyId/invitations`, `GET /companies/:companyId/invitations`, `POST /company-invitations/accept` with `{token}`. Configure real HTTPS `EMAIL_VERIFY_URL` and `EMAIL_INVITATION_URL` pointing to reachable frontend pages, a verified sender, Resend key, encryption keyring, and both workers. The backend currently has no forgot/reset-password or interview/application/company-verification notification delivery contracts.

AI: `POST /ai/guest-sessions`, `POST /ai/conversations`, `GET /ai/conversations`, `GET/POST /ai/conversations/:conversationId/messages`, `DELETE /ai/conversations/:conversationId`, and `POST /ai/transcriptions`. Chat sends a normal JSON response, with persisted history and usage; there is **no streaming endpoint**. A live model answer requires server-only `FINDWORK_AI_API_KEY`, `FINDWORK_AI_MODEL`, and `FINDWORK_AI_INPUT_USD_PER_MILLION`/`FINDWORK_AI_OUTPUT_USD_PER_MILLION`; the current integration environment has no such values.

## Candidate ↔ Employer messaging

An application is the conversation. Candidate routes: `GET /candidate/conversations`, `GET/POST /candidate/conversations/:applicationId/messages`, `POST /candidate/conversations/:applicationId/read`. Employer routes: `GET /companies/:companyId/conversations`, `GET/POST /companies/:companyId/conversations/:applicationId/messages`, `POST /companies/:companyId/conversations/:applicationId/read`. Send body is `{body:string}` (1–4,000 trimmed characters). List and message responses include `unreadCount`; read returns `{readCount}`. Only the applying Candidate and company members with `application.view` can read. Employer sends require `application.review`. A draft application has no conversation. The additive migration `20261026010000_application_messaging` must be deployed to the selected database before using these endpoints.

The disposable HTTP acceptance command is `node scripts/accept-disposable-recruitment.cjs`. It provisions, tests, and removes a separate PostgreSQL database.

For retained Frontend acceptance, `node scripts/provision-frontend-acceptance.cjs` creates a distinct database, applies ten migrations, loads the official 34 provinces and 3,321 wards, and provisions real Candidate, Employer/OWNER, and Platform SUPER_ADMIN accounts. It writes backend settings to ignored `server/.env.frontend-acceptance.local` and account credentials to ignored `server/.env.frontend-acceptance.accounts.local`. It never prints the credentials. Start the isolated API with `node --env-file=.env.frontend-acceptance.local dist/main.js` from `server`; its base URL is `http://127.0.0.1:3003/api/v1`. Use the account file locally for Frontend sign-in. This database is separate from `findwork_employer_media_3002` and should remain the Frontend test target; changing the shared database still requires separate authorization.
