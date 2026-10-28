# CP13 company platform permissions

## Policy

Effective employer access requires an explicit company capability row with `isGranted=true`, an active company and account, an active company member with the existing internal RBAC permission, and the existing endpoint validation. A company owner has no platform bypass. Verification state is independent of capability approval: verifying a company changes no capability rows; granting `job.publish` changes no verification state. Missing rows deny.

The additive migration creates `CompanyPlatformCapability` with a unique `(companyId, capabilityCode)` key and an allowed-code CHECK constraint. It backfills companies that exist **at migration execution time** with the eight already operating capabilities granted, preserving their previous eligible workflows subject to member RBAC. `recruitment.analytics.view` and `ai.business.access` are recorded denied because no dedicated business endpoint exists. The migration neither assigns a system role nor changes company verification. New companies get ten explicit rows in the company creation transaction: `job.draft.create`, `job.draft.edit`, `job.close`, and `application.view` granted; all other capabilities denied. Company creation and permission lookup fail closed if rows cannot be written or found.

Deploy the migration only after a verified backup and owner approval. Do not apply it to a production or shared database as part of CP13 testing. For rollback, deploy the previous application build while retaining the additive table and its audit history. To reverse the schema later, export `CompanyPlatformCapability` and related `AuditLog` records, verify the export, then use a separately reviewed migration to drop the table; never delete grant history as an automatic rollback step. During mixed-version rollout, any companies created after the migration by the old application must be identified and reviewed for explicit rows before allowing employer writes.

## API contract

Both routes require a valid access token, an active `SUPER_ADMIN` system role, a system-scope permission, and a UUID company ID. A company owner cannot call them.

`GET /api/v1/admin/companies/:companyId/capabilities` requires `company.view` at SYSTEM scope. It returns `{ companyId, companyName, companyStatus, verificationStatus, capabilities }`. The array has all ten codes, each with `code`, `available`, `isGranted`, `configured`, `grantedAt`, `revokedAt`, `changedByUserId`, and `reason`. `configured:false` means the database row is absent and effective access is denied.

`PATCH /api/v1/admin/companies/:companyId/capabilities/:capabilityCode` requires `company.verify` at SYSTEM scope. Body: `{ "isGranted": true|false, "reason": "10 to 500 characters" }`. It returns `{ code, isGranted, changedByUserId, reason, updatedAt }`. Unknown codes return 400; attempting to grant an unavailable capability or repeat the current state returns 409. All successful changes atomically write the capability row and `AuditLog` action `admin.company.capability.grant` or `admin.company.capability.revoke`, with actor, company, before/after values and reason. Revocation is effective on the next protected request.

## Enforcement map

| Capability | Employer endpoints | Internal RBAC gate |
| --- | --- | --- |
| `job.draft.create` | `POST /companies/:companyId/jobs` | `company.update` |
| `job.draft.edit` | `PATCH /companies/:companyId/jobs/:jobId`; `PUT .../screening-questions` | `company.update` |
| `job.publish` | `POST .../jobs/:jobId/publish` | `company.update` |
| `job.close` | `POST .../jobs/:jobId/pause`, `POST .../jobs/:jobId/close` | `company.update` |
| `application.view` | Company job application list/detail and company interview list | `application.view` |
| `application.pipeline.manage` | Application status and assignment PATCH | `application.review` |
| `interview.schedule` | Interview schedule, reschedule, cancel and complete | `application.review` |
| `team.invite` | Invitation create/revoke, member role update/remove and ownership transfer | Existing company member/role permissions |
| `recruitment.analytics.view` | No dedicated backend analytics endpoint; grant rejected | None |
| `ai.business.access` | No company-scoped Business AI endpoint; grant rejected. Existing personal/guest AI remains separate. | None |

Public and candidate endpoints keep their existing authorization rules. Platform moderation operations remain system-scope operations, not employer actions. The frontend reads the actual GET response, disables unavailable codes, confirms revocations, requires a reason and reloads server state after PATCH.

## Validation

Use a fresh disposable PostgreSQL Docker container. Verify the container name, bound host port, database name, and PostgreSQL cluster fingerprint before running the integration suite. The CP13 test gate supports the Docker forwarded port 55432 only when the exact fingerprint matches `FINDWORK_TEST_DOCKER_SYSTEM_ID`.

The disposable-database backfill check replays the migration INSERT for a company whose capability rows were removed inside a transaction, verifies eight grants and two denials with verification unchanged, then rolls back. Evidence: docs/evidence/cp13-backfill-check.json. Run: node server/scripts/verify-cp13-backfill.cjs <disposable-test-env-file>.
