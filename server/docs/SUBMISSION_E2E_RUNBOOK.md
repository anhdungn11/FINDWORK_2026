# Controlled submission E2E run

Status as of 2026-10-19: **Submission E2E passed 1/1** on `findwork_test/public:5432` after all seven migrations were applied and the test fixtures were corrected. The temporary `server/.env.test` copy used for that run was removed afterward; use the existing external test environment file for future preflight. The run's fixture cleanup left no recent run-owned users, companies or categories. Browser E2E and its separate fixture setup remain unexecuted; see [browser handoff](SUBMISSION_BROWSER_E2E_HANDOFF.md).

## Preconditions

1. Reuse the existing dedicated `findwork_test` database on loopback port 5432, schema `public`, with its test-only login. The read-only preflight already confirmed the actual database identity. Keep `findwork_dev` separate; do not recreate either database.
2. `D:\DACSN\Find-Work\server\.env.test` has `NODE_ENV=test` and targets the verified local database. An authorized operator may reuse this existing configuration in the current worktree after checking its secrets are still appropriate and `.env.test` remains Git-ignored. Alternatively fill `.env.test.example` with the same isolated target and new distinct secrets. Never copy a development URL.
3. All seven repository migrations, including `20261017100000_candidate_saved_jobs` and `20261017110000_screening_multi_select`, are already applied in `findwork_test`. The active permission registry includes scoped `CANDIDATE`, `SUPPORT_ADMIN`, and `MODERATION_ADMIN` roles; `CANDIDATE` has `saved_job.manage` at `OWN` scope. Recheck with preflight before any future writing run. This runbook does not apply migrations, seed, or grant permissions.
4. The suite creates only test users and roles assigned to those users; it never grants system roles to existing users. It uses `app.init()` without binding a port and does not restart the backend on port 3000.

## Read-only preflight (safe to run before E2E authorization)

From `D:\DACSN\Find-Work-Submission-Backend-MVP\server` in PowerShell:

```powershell
node .\test\preflight-submission-db.cjs
```

The current worktree can use the verified external test configuration without copying secrets:

```powershell
node .\test\preflight-submission-db.cjs --env-file D:\DACSN\Find-Work\server\.env.test
```

The preflight reads only the named test environment file (default `server/.env.test`), checks the URL before connecting, opens a read-only PostgreSQL session, verifies the actual database/address/port/schema, required tables, `MULTI_SELECT` enum and applied migrations, and checks active permission codes and scoped role grants. It prints no URL, username, password, or tokens. A failure exits nonzero. Passing this check is required before asking for authorization to execute the writing suite.

## Exact acceptance command — run only after explicit authorization

From the same `server` directory:

The prepared acceptance set is the existing Company Foundation suite (11 cases) plus the Submission workflow suite (1 case): 12 integration tests. Company/Admin cases require Scope A to provision `USER_ADMIN`, `AUDIT_VIEWER`, and their three SYSTEM grants. Both writing suites require separate Scope B authorization.

```powershell
$env:FINDWORK_TEST_ENV_FILE = 'D:\DACSN\Find-Work\server\.env.test'
node --experimental-vm-modules .\node_modules\jest\bin\jest.js --config jest.config.cjs --runInBand --runTestsByPath test/company-foundation.integration.spec.ts test/submission-workflow.integration.spec.ts
```

Do not use `npm test` for this gate: the default Jest configuration may select other integration specs. The command above executes only the two prepared suites against the named test URL. The Jest setup reads `FINDWORK_TEST_ENV_FILE` when set, otherwise `.env.test`; before fixture writes each suite checks `NODE_ENV=test`, the URL and actual connected database identity. Fixtures have unique run prefixes and guarded cleanup. If an identity check fails, cleanup is skipped. A hard process termination can leave fixtures; inspect their unique run prefixes and remove them only under a separate reviewed cleanup procedure. Never run broad cleanup against existing records.

## Expected acceptance coverage

The one workflow covers company creation, screening question configuration and publication, public job/company/question discovery, Candidate save/list/check/unsave with closed-job redaction, onboarding draft/import with consent, ResumeVersion, application with all five question types, recruiter answer review/status, candidate history, support admin listing and moderation admin job closure with audit. It checks cross-company and cross-candidate isolation, invalid resume ownership, duplicate saved jobs/application, missing/invalid/foreign answers without a partial application, missing/expired auth, forbidden admin access, job/resume/application version conflicts, historical answer stability after question replacement, and no answers required after clearing questions. These assertions passed in the authorized 2026-10-19 run; a future rerun requires fresh authorization.

Current evidence includes the authorized passing Submission HTTP E2E suite. Any future E2E rerun still requires the same isolation checks and explicit authorization for its database writes.
