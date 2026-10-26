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

Verification: authenticated `POST /auth/email-verification/request` (204), then public `POST /auth/email-verification/confirm` with `{token}` (204; invalid/replayed token 401). The frontend `/verify-email#token=...` page strips the fragment and calls confirm. Invitations: `POST /companies/:companyId/invitations`, `GET /companies/:companyId/invitations`, `POST /company-invitations/accept` with `{token}`. The existing invitation flow sends only when explicitly enabled.

Password reset: public `POST /auth/password-reset/request` with `{email:string}` returns 204 for both known and unknown active accounts when delivery is enabled; it returns 503 `AUTH_PASSWORD_RESET_DELIVERY_UNAVAILABLE` for all addresses while disabled. Public `POST /auth/password-reset/confirm` with `{token:string,password:string}` (12–128 characters) returns 204, or 401 `AUTH_PASSWORD_RESET_TOKEN_INVALID` for invalid, expired, or replayed tokens. The reset token expires after one hour. A successful confirm changes the Argon2id password, revokes all sessions, consumes the token, cancels any pending reset mail, and writes `auth.password_reset` audit. Both routes have a 5 requests per 10 minutes IP throttle and an allowed Origin guard. The Frontend reset page must read `#token=...`, remove it from browser history, collect the new password, and call confirm; never send the token in a URL query or log it.

Candidate recruitment mail is optional: enabling `EMAIL_RECRUITMENT_NOTIFICATIONS_ENABLED=true` queues encrypted application confirmation on submit, status notice on review, and interview invitation on schedule, only for active Candidates whose account email is verified. It sends to the verified account email, never an application contact snapshot. The outbox retries uncertain provider failures and cancels notices if the recipient, application status, or interview is no longer eligible. `EMAIL_APPLICATION_URL` is the externally reachable Frontend application-list base; the worker appends `/:applicationId`. The existing application and interview API request/response contracts are unchanged. No company-verification notification delivery is implemented.

To activate mail, privately configure `EMAIL_DELIVERY_MODE=resend`, `EMAIL_WORKER_ENABLED=true`, `EMAIL_ACTIVE_KEY_ID`, `EMAIL_KEYRING_JSON` (JSON map of key ID to 32 random bytes in base64), `EMAIL_RESEND_API_KEY`, `EMAIL_FROM` using a verified sender domain, and reachable HTTPS `EMAIL_VERIFY_URL`, `EMAIL_INVITATION_URL`, `EMAIL_RESET_URL`, and `EMAIL_APPLICATION_URL`. Set `EMAIL_INVITATION_DELIVERY_ENABLED`, `EMAIL_PASSWORD_RESET_ENABLED`, and `EMAIL_RECRUITMENT_NOTIFICATIONS_ENABLED` to `true` only for the flows being released. Start `node dist/workers/email-worker.main.js` for verification/reset/recruitment, and `node dist/workers/invitation-email-worker.main.js` when invitations are enabled, from `server` with the same private environment as the API. Confirm actual receipt in an authorized test mailbox and open every link before calling delivery PASS. The local disposable suite uses a fake provider adapter and proves queueing/link/token behavior only; it makes no Resend call. Keep secrets in ignored local environment files. A localhost Frontend URL is valid only for local testing, never for external recipients.

AI: `POST /ai/guest-sessions` returns `{id,expiresAt,token}`. Authenticated requests use `Authorization: Bearer <accessToken>`; Guest requests use `x-findwork-guest-token: <token>`. `POST /ai/conversations` returns `{id,createdAt,updatedAt}`; `GET /ai/conversations` returns an array; `GET /ai/conversations/:conversationId/messages` returns an array of `{id,role,content,createdAt}`; `POST /ai/conversations/:conversationId/messages` accepts `{content:string}` (1–4,000 characters), optionally one `image` multipart file for future premium entitlement, and returns `{user,assistant,usage}` on a real provider answer; `DELETE /ai/conversations/:conversationId` removes it. There is **no streaming endpoint**. Cross-account conversation access returns 404; missing/invalid credentials return 401. The current isolated API returns 503 `AI_PROVIDER_NOT_CONFIGURED` for message send and persists no fake answer.

The only supported model provider is OpenAI Responses API. For a live smoke test, privately set `FINDWORK_AI_PROVIDER=openai`, a valid server-side `FINDWORK_AI_API_KEY`, supported `FINDWORK_AI_MODEL`, and current numeric `FINDWORK_AI_INPUT_USD_PER_MILLION` / `FINDWORK_AI_OUTPUT_USD_PER_MILLION` (positive and at most 100). Restart the API, sign in or obtain a Guest session, create a conversation, send a novel prompt, and verify a non-hardcoded `{assistant,usage}` response plus `GET .../messages` persistence. The backend uses a 30-second provider timeout, per-IP route throttles, per-identity daily budgets, and no provider key in responses. Transcription is premium gated and additionally needs `FINDWORK_AI_TRANSCRIPTION_MODEL` and `FINDWORK_AI_TRANSCRIPTION_MAX_COST_MICROS`; do not expose it as working until entitlement exists.

## Candidate ↔ Employer messaging

An application is the conversation. Candidate routes: `GET /candidate/conversations`, `GET/POST /candidate/conversations/:applicationId/messages`, `POST /candidate/conversations/:applicationId/read`. Employer routes: `GET /companies/:companyId/conversations`, `GET/POST /companies/:companyId/conversations/:applicationId/messages`, `POST /companies/:companyId/conversations/:applicationId/read`. Send body is `{body:string}` (1–4,000 trimmed characters). List and message responses include `unreadCount`; read returns `{readCount}`. Only the applying Candidate and company members with `application.view` can read. Employer sends require `application.review`. A draft application has no conversation. The additive migration `20261026010000_application_messaging` must be deployed to the selected database before using these endpoints.

The disposable HTTP acceptance command is `node scripts/accept-disposable-recruitment.cjs`. It provisions, tests, and removes a separate PostgreSQL database. It verifies all 12 migrations, Admin/recruitment/messaging, reset-token lifecycle, local verification, and mock recruitment mail worker. Provider receipt is a separate external acceptance gate.

For retained Frontend acceptance, `node scripts/provision-frontend-acceptance.cjs` creates a distinct database, applies 12 migrations, loads the official 34 provinces and 3,321 wards, and provisions real Candidate, Employer/OWNER, and Platform SUPER_ADMIN accounts. It writes backend settings to ignored `server/.env.frontend-acceptance.local` and account credentials to ignored `server/.env.frontend-acceptance.accounts.local`. It never prints credentials. The retained isolated database was migrated from 10 to 12 migrations on 26 October using `node scripts/migrate-frontend-acceptance.cjs`; the script checks the exact local database name before deployment and can be rerun idempotently. Start the isolated API with `node --env-file=.env.frontend-acceptance.local dist/main.js` from `server`; its base URL is `http://127.0.0.1:3003/api/v1`. Run `node scripts/check-frontend-acceptance.cjs` to check account login, Admin isolation, disabled email/reset, and unconfigured AI. Use the account file locally for Frontend sign-in. This database is separate from `findwork_employer_media_3002` and should remain the Frontend test target.

Unified release sequence: back up and verify the exact intended database, obtain explicit authorization before touching the shared database, deploy both additive migrations `20261026020000_password_reset` and `20261026030000_recruitment_email_notifications`, regenerate Prisma Client, build, run the disposable suite, then restart the API and email worker with reviewed private configuration. Verify real Resend receipt and one-time links in an authorized mailbox; verify a real OpenAI answer; run Frontend acceptance against the target API. Do not bootstrap the shared Platform Admin or deploy its migrations without the separate shared-database authorization.

`node scripts/check-shared-release-state.cjs` performs an identity-checked read-only check of the shared database's migration count and Platform SUPER_ADMIN assignments. On 26 October it reported 9 migrations and zero Super Admin assignments.
