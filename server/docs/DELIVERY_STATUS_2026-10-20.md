# Backend delivery status — 2026-10-20

Base path: `/api/v1`. Protected routes require `Authorization: Bearer <accessToken>` and an active session. UUID path parameters are UUIDv4. Global DTO validation rejects unknown properties with HTTP 400. The API error filter returns `{code,message,details?,traceId,path,timestamp}`.

## Completion matrix

| Workflow | Status | Evidence / blocker |
| --- | --- | --- |
| Company registration, owner bootstrap, ownership transfer, profile and locations | IMPLEMENTED; TESTED at unit level | Existing `company-foundation` and `company-profile-locations` specs plus a new unrun ownership integration scenario; no database test run in this cycle. |
| Invitations and acceptance | IMPLEMENTED; TESTED in existing integration specs | Acceptance creates active VIEWER membership; no database test run in this cycle. |
| Member listing, role change, removal | IMPLEMENTED; TESTED at unit level | New member service/controller, 4 focused unit tests and an unrun integration scenario; PostgreSQL E2E still BLOCKED by fixture/write/cleanup authorization. |
| Company verification request and admin review | IMPLEMENTED; TESTED at unit level | Legal name and tax code required; PENDING decision gate; unrun integration scenario; PostgreSQL E2E still BLOCKED by fixture/write/cleanup authorization. |
| Company jobs, public jobs, candidate applications, recruiter review and candidate status | IMPLEMENTED; TESTED in existing integration spec source | `submission-workflow.integration.spec.ts` covers publish, search, apply, screening answers, duplicate prevention, tenant isolation, review and moderation. It was not run in this cycle. |
| Admin dashboard, lists, details, moderation and audit | IMPLEMENTED; TESTED at unit level | Dashboard uses PostgreSQL counts; new detail reads and review rules pass unit tests. PostgreSQL E2E still BLOCKED by authorization. |
| Production database migration / live write smoke | BLOCKED | No approval for fixture setup, real writes or cleanup. No `findwork_dev` write, reset or global seed was run. |

## New contracts for Antigravity

| Method and path | Permission | Input | Success | Main errors |
| --- | --- | --- | --- | --- |
| `GET /companies/:companyId/members` | `company.member.view` at COMPANY scope | None | `{data:[{id,companyId,status,isOwner,joinedAt,removedAt,user:{id,email,status},roles:[{role:{id,name}}]}]}` for active members. | 401, 403, 400 invalid UUID. |
| `PATCH /companies/:companyId/members/:memberId/role` | `company.member.update` and `company.role.manage` at COMPANY scope | `{role:"ADMIN"\|"HR_MANAGER"\|"RECRUITER"\|"HIRING_MANAGER"\|"VIEWER"}` | Updated member shape from list. One role is assigned. Only OWNER may assign ADMIN. Owners and the actor cannot be changed. | 400 invalid role/UUID; 403 unauthorized/protected member; 404 `COMPANY_MEMBER_NOT_FOUND`; 409 unavailable/unchanged role. |
| `DELETE /companies/:companyId/members/:memberId` | `company.member.remove` at COMPANY scope | None | HTTP 200 `{id,status:"REMOVED"}`. A removed member loses company authorization. Owners and the actor cannot be removed. | 400 invalid UUID; 403 unauthorized/protected member; 404 `COMPANY_MEMBER_NOT_FOUND`; 409 concurrent change. |
| `POST /companies/:companyId/members/ownership-transfer` | `company.ownership.transfer` at COMPANY scope; caller must be current owner | `{memberId:"<active member UUID>"}` | HTTP 200 `{companyId,previousOwnerMemberId,ownerMemberId}`. Former owner becomes ADMIN; target becomes OWNER in one transaction with audit. | 400 invalid UUID; 403 nonowner/self transfer; 404 other company/inactive member; 409 ownership/role conflict. |
| `POST /companies/:companyId/verification-request` | `company.update` at COMPANY scope | None; set `legalName` and `taxCode` first with `PATCH /companies/:companyId/profile` | HTTP 200 company profile with `verificationStatus:"PENDING"`. Rejected companies may resubmit. | 400 `COMPANY_VERIFICATION_PROFILE_INCOMPLETE`; 403; 409 `COMPANY_VERIFICATION_STATE_CONFLICT`. |
| `GET /admin/users/:userId` | `user.view` at SYSTEM scope | None | `{id,email,status,emailVerifiedAt,createdAt,updatedAt}`. | 401, 403, 404 `USER_NOT_FOUND`. |
| `GET /admin/companies/:companyId` | `company.view` at SYSTEM scope | None | Company status, verification and legal profile, locations, and `_count` for members/jobs/applications. | 401, 403, 404 `COMPANY_NOT_FOUND`. |
| `GET /admin/jobs/:jobId` | `job.view` at SYSTEM scope | None | Job content, compensation, status/version, company/category summary, application count. | 401, 403, 404 `JOB_NOT_FOUND`. |
| `GET /admin/companies` | `company.view` at SYSTEM scope | `page`, `pageSize`, optional `status`, `verificationStatus`, `q` (name substring) | `{data,pagination}`. Use `verificationStatus=PENDING` for the review queue. | 400 invalid filter; 401, 403. |
| `PATCH /admin/companies/:companyId/verification` | `company.verify` at SYSTEM scope | `{status:"VERIFIED"\|"REJECTED"}` | Updated company summary and atomic audit. Company must be ACTIVE and PENDING. | 400, 401, 403, 404, 409 state conflict. |

Existing job/application/admin endpoints and response examples are in `SUBMISSION_BACKEND_MVP_API.md` and `SUBMISSION_BROWSER_E2E_HANDOFF.md`. Public company jobs are `GET /jobs?companyId=<UUID>`; the public list returns an empty `data` array when no job passes visibility rules. No business records are generated by these reads.

## Verification in this cycle

- `npm.cmd run build`: passed.
- `npm.cmd run test:unit -- --runInBand`: 16 suites, 160 tests passed at final HEAD.
- `git diff --check`: passed.
- `tsc --noEmit -p tsconfig.json`: passed after adding the integration scenario.
- PostgreSQL integration, fixture CLI, live HTTP write smoke and cleanup: not run because each requires explicit authorization.

Next implementation task: run the existing guarded `submission-workflow.integration.spec.ts` and add database integration coverage for member role changes and verification review after approval for fixture creation, test writes and cleanup against `findwork_test`.
