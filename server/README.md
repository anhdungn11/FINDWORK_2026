# FINDWORK Server — Phase 1

Backend foundation for FINDWORK.

## Stack

- NestJS 12
- TypeScript
- Prisma ORM 7
- PostgreSQL
- REST API under `/api/v1`

The React frontend at the repository root is intentionally unchanged in Phase 1.

## Prerequisites

- Node.js `^20.19`, `^22.12`, or `^24`
- PostgreSQL 15+ (the project owner currently targets PostgreSQL 17)
- An empty development database such as `findwork_dev`

## Local setup

```powershell
cd server
Copy-Item .env.example .env
# Edit .env and set DATABASE_URL to your local PostgreSQL credentials.
npm install
npm run prisma:validate
npm run prisma:generate
```

### Create the initial migration safely

Because this Phase 1 package was prepared without access to your local PostgreSQL credentials, the migration must be generated on the development machine rather than guessed.

```powershell
npx prisma migrate dev --name init --create-only
```

Before applying the migration, append `prisma/sql/phase1_constraints.sql` to the generated `migration.sql`, review the SQL, and then run:

```powershell
npx prisma migrate dev
npm run db:seed
```

## Run

```powershell
npm run start:dev
```

For the local demo, set `CORS_ORIGINS` in `server/.env` to include both
`http://localhost:5176` and `http://127.0.0.1:5176`. Nest loads `.env` from
its working directory; existing process environment variables take precedence.
Start the Backend from `server/` so it uses that file. The exact browser origin
must be allowed by both CORS and `AuthOriginGuard`.

Before the demo, run the read-only check from `server/`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-dev-demo.ps1
```

It verifies the local DEV target, Backend health and database connectivity,
public jobs and companies, and the auth CORS preflight. It never starts or
stops a server. If Backend 3000 is absent, start it in a separate terminal
with `npm run start:dev`; identify any existing port owner before restarting.
If the demo must be recovered, first run this check and use the verified
backup under `D:\DACSN\FindWork-Backups` for a separately approved restore.

Endpoints:

- `GET http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/api/v1/docs`

## Verification

```powershell
npm run prisma:validate
npm run prisma:generate
npm run build
npm test
npm run db:status
```

The database health endpoint intentionally fails with `503 DATABASE_UNAVAILABLE` when PostgreSQL cannot be reached.

## Invitation expiration maintenance (Phase 4.3C.2D CP2)

Run `npm run build` and deploy `npm run start:invitation-maintenance` as a supervised
long-running backend process. It scans at most 25 invitation candidates per pass,
rechecks them under Company then Invitation locks, and cancels active invitation
outbox jobs. Full batches are retried after 250 ms; idle passes run every 30 seconds.
Failures emit a fixed, redacted warning and retry with bounded exponential backoff
(30 seconds to 15 minutes). Monitor that warning and process liveness.

This maintenance process runs with `EMAIL_INVITATION_DELIVERY_ENABLED=false` and
`EMAIL_DELIVERY_MODE=disabled`; it does not call the provider or dispatch email.
Deploy maintenance separately regardless of verification worker status. The
verification email worker does not run invitation cleanup, so slow maintenance
cannot delay verification delivery. Starting the API alone does not schedule
cleanup. Invitation email dispatch remains unavailable in CP2.

## Invitation email worker (Phase 4.3C.2D CP3)

`npm run build` produces `dist/workers/invitation-email-worker.main.js`, the
entrypoint for `npm run start:invitation-email-worker`. This process imports only
Prisma, configuration, email crypto, the invitation outbox repository, and the
provider. It does not import CompanyModule, the verification worker, or invitation
maintenance. Run those processes independently under a supervisor. The worker
exits with a redacted error when its configuration or an active encryption key is
missing. Never use a production database while testing it.

`EMAIL_INVITATION_DELIVERY_ENABLED=false` remains the default. Production
configuration rejects `true` explicitly; **do not enable or deploy invitation
dispatch in production at CP3**. No real provider request is made by the test
suite. A future deployment requires an approved acceptance page at the configured
`EMAIL_INVITATION_URL`, a verified Resend sender, encryption key retention, and
an explicit rollout decision. The acceptance page must read `#token=...` from
the browser fragment and POST that token in the existing authenticated accept
request. The fragment stays out of the ordinary HTTP request to the frontend
server; browser history, extensions, and the final page can still access it.

The worker discovers at most 25 due jobs per pass without locks, then claims
each under PostgreSQL locks in Company → CompanyInvitation → EmailOutbox order,
using `SKIP LOCKED`. It requires an active company, pending unexpired invitation,
eligible queue or expired lease, remaining attempts, and the enabled flag. A
non-active company never receives an invitation email. While suspended, its
pending job retains ciphertext and is deferred for up to five minutes without
using an attempt. Reactivation permits the next due claim; the 23-hour retry
horizon still applies. The current company lifecycle has no archive transition
contract for pending invitations, so archived companies are also deferred and
cannot dispatch. Their jobs fail and scrub at the retry horizon.

Invitation creation sets its PostgreSQL transaction timezone to UTC. In the
local test setup, PostgreSQL and Node epoch times agreed, but PrismaPg's raw
`timestamptz` Date mapping under `Asia/Bangkok` appeared seven hours ahead and
Date writes could shift persisted instants. Eligibility, leases, and retry
horizons therefore use SQL comparisons to PostgreSQL `NOW()`. The encrypted
expiration must match the database timestamp exactly. Integration tests check
that newly created invitations expire seven days after PostgreSQL current time.

A short transaction repeats the eligibility and ownership checks immediately
before Resend. Provider calls occur outside database transactions. Cancellation
can happen after this final check and before or during the external request;
once dispatch begins, the worker cannot guarantee the email can be recalled.
Owner, status, kind, invitation ID, and database-time lease predicates prevent
a stale worker from changing a cancelled job back to queued, processing, or sent.

Template v1 reads the recipient, sender, URL base, and token from the authenticated
encrypted payload. It validates the token against the invitation hash and uses a
fragment URL. The `invite:<invitation-id>` idempotency key and rendered request
stay stable across retries. [Resend retains idempotency keys for 24 hours](https://resend.com/changelog/idempotency-keys);
the worker stops automatic retries after 23 hours from job creation, including
expired leases and uncertain provider responses. Retried requests within that
window can still have uncertain external outcomes, so delivery is at least once
attempted and never promised exactly once. Terminal jobs scrub ciphertext.

## Architecture boundary

Feature controllers must not call Prisma directly. Future modules follow:

```text
Controller
  -> authentication / authorization guards
  -> service
  -> repository
  -> Prisma
  -> PostgreSQL
```

Prisma types are backend implementation details and must not be imported by the React frontend.
