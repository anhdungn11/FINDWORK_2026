# Controlled submission E2E run

Status as of 2026-10-17: **blocked before connection** because `server/.env.test` is absent. No PostgreSQL-writing E2E has been run.

## Preconditions

1. Provide a dedicated PostgreSQL database named `findwork_test` on loopback port 5432, schema `public`, with a test-only login. Keep `findwork_dev` separate. The test account must be able to create and delete its own fixtures. Do not use a production or development connection string.
2. Create `server/.env.test` from `.env.test.example`, replace the placeholder password and both distinct secrets, and retain `NODE_ENV=test`, `API_PREFIX=api/v1`, and the exact `findwork_test?schema=public` target. `.env.test` is ignored by Git.
3. The test database must already have the repository's Prisma migrations applied, including `20261017100000_candidate_saved_jobs`, and the active permission registry plus scoped `CANDIDATE`, `SUPPORT_ADMIN`, and `MODERATION_ADMIN` system roles. `CANDIDATE` must have `saved_job.manage` at `OWN` scope. Provisioning requires separate authorization; this runbook does not apply migrations, seed, or grant permissions. New company role grants are created by the API. Existing company roles need the separately reviewed [permission bootstrap plan](SUBMISSION_INTEGRATION_READINESS.md#permission-bootstrap-plan--no-database-changes-performed).
4. The suite creates only test users and roles assigned to those users; it never grants system roles to existing users. It uses `app.init()` without binding a port and does not restart the backend on port 3000.

## Read-only preflight (safe to run before E2E authorization)

From `D:\DACSN\Find-Work-Submission-Backend-MVP\server` in PowerShell:

```powershell
node .\test\preflight-submission-db.cjs
```

The preflight reads only `server/.env.test`, checks the URL before connecting, opens a read-only PostgreSQL session, verifies the actual database/address/port/schema, required tables and applied migrations, and checks active permission codes and scoped role grants. It prints no URL, username, password, or tokens. A failure exits with code 2. Passing this check is required before asking for authorization to execute the writing suite.

## Exact acceptance command — run only after explicit authorization

From the same `server` directory:

```powershell
node --experimental-vm-modules .\node_modules\jest\bin\jest.js --config jest.config.cjs --runInBand --runTestsByPath test/submission-workflow.integration.spec.ts
```

Do not use `npm test` for this gate: the default Jest configuration may select other integration specs. The command above executes the one workflow against the `.env.test` URL. The Jest setup loads that file; before fixture writes the suite also checks `NODE_ENV=test`, the URL and actual connected database identity. The suite reads shared permission/role registry records and writes only run-prefixed fixtures. It deletes only recorded fixture user/company IDs (or recovers companies by the run UUID prefix) plus its uniquely coded category. If the identity check fails, cleanup is skipped. A hard process termination can leave fixtures; inspect their unique `submission-<run UUID>` prefix and remove them only under a separate reviewed cleanup procedure. Never run broad cleanup against existing records.

## Expected acceptance coverage

The one workflow covers company creation, draft and publish, public job/company discovery, candidate save/list/check/unsave with closed-job redaction, onboarding draft/import with consent, resume version continuity and stale update rejection, application and recruiter review, candidate status read, support admin listing and moderation admin job closure with audit. It checks cross-company and cross-candidate isolation, invalid resume ownership, duplicate saved jobs/application without extra status history, missing/expired auth, forbidden admin access, job/resume/application version conflicts, and a rejected moderation transition without an extra audit entry.

Current evidence is static inspection and unit/build gates only. HTTP/E2E acceptance remains unverified until the authorized command completes against the isolated database.
