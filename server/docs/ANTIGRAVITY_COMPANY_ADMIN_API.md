# Company and Admin API handoff

**Release update (2026-10-23):** Legal verification, location catalogs, public media URLs, AI and interview contracts changed. Use [P0_BACKEND_RELEASE_CONTRACT_2026-10-23.md](./P0_BACKEND_RELEASE_CONTRACT_2026-10-23.md) for those routes and browser acceptance.

**Release update (2026-10-23):** Legal verification, location catalogs, public media URLs, AI and interview contracts changed. Use [P0_BACKEND_RELEASE_CONTRACT_2026-10-23.md](./P0_BACKEND_RELEASE_CONTRACT_2026-10-23.md) for those routes and browser acceptance.

Source: current Nest controllers, DTOs, services and selectors under `server/src/modules`. All paths below start with `/api/v1`. Protected routes use `Authorization: Bearer <accessToken>`. UUID parameters are v4. Company permissions require an active member and `COMPANY` scope; Admin permissions require `SYSTEM` scope. The API error body is `{code, message, details?, traceId, path, timestamp}`. Missing/invalid token returns 401; absent scope returns 403; validation returns 400 (`VALIDATION_ERROR`).

List responses use `{data: [...], pagination: {page, pageSize, total, totalPages}}` unless stated otherwise. Default page is 1 and pageSize is 20; maximum pageSize is 100.

## Company and public profile

| Method and path | Body/query | Permission | Response |
| --- | --- | --- | --- |
| `POST /companies` | `{name, slug}`; name 2–255 chars, slug 3–220 lowercase letters/digits/single hyphens | Active token | 201 `{id, name, slug, status, verificationStatus, createdAt}`; creates ACTIVE company and OWNER membership |
| `GET /companies/me` | None | Active token | `{data: [{id, name, slug, status, verificationStatus, memberRoleNames}]}` |
| `GET /companies` | `page`, `pageSize`, `q`, `industryCode`, `provinceId`, `verifiedOnly` | Public | Paginated ACTIVE profiles; fields include `isVerified`, `headquarters`, `jobsCount` |
| `GET /companies/:companyId` | None | Public | ACTIVE public profile; 404 `PUBLIC_COMPANY_NOT_FOUND` otherwise |
| `GET /companies/:companyId/profile` | None | `company.view` | Private profile including `legalName`, `taxCode`, `verificationStatus`, `verifiedAt`, `status` |
| `PATCH /companies/:companyId/profile` | Any nonempty subset of `name`, `legalName`, `taxCode`, `industryId`, `description`, `website`, `employeeSizeRange`, `foundedYear`; nullable fields accept null | `company.update` | Updated private profile; legal fields lock while PENDING/VERIFIED |
| `POST /companies/:companyId/verification-request` | No body | `company.update:COMPANY` | 200 private profile with `verificationStatus: PENDING`; requires a valid legal name and Vietnamese tax code, registered entity details in `PATCH /companies/:companyId/legal`, and active `BUSINESS_REGISTRATION` evidence. Missing requirements return 400 `COMPANY_VERIFICATION_PROFILE_INCOMPLETE`. |

Company creation conflicts return 409 `COMPANY_SLUG_ALREADY_EXISTS`. Profile errors include 400 `COMPANY_UPDATE_EMPTY`, `COMPANY_INDUSTRY_INVALID`, `COMPANY_VERIFICATION_PROFILE_INCOMPLETE`; 409 `COMPANY_VERIFIED_LEGAL_DETAILS_LOCKED`, `COMPANY_VERIFICATION_STATE_CONFLICT`; 404 `COMPANY_RESOURCE_NOT_FOUND`.

## Members, invitations and ownership

| Method and path | Body | Permission | Response |
| --- | --- | --- | --- |
| `GET /companies/:companyId/members` | None | `company.member.view` | `{data: [...]}` of active members with `id`, `user`, `roles`, `isOwner`, `status` |
| `PATCH /companies/:companyId/members/:memberId/role` | `{role}`: `ADMIN`, `HR_MANAGER`, `RECRUITER`, `HIRING_MANAGER`, `VIEWER` | `company.member.update` **and** `company.role.manage` | Updated member; only OWNER may assign ADMIN; cannot self-change or assign OWNER |
| `DELETE /companies/:companyId/members/:memberId` | None | `company.member.remove` | 200 `{id, status: "REMOVED"}`; active member access is revoked |
| `POST /companies/:companyId/members/ownership-transfer` | `{memberId}` | `company.ownership.transfer`, current OWNER | 200 `{companyId, previousOwnerMemberId, ownerMemberId}`; target must be active in same company |
| `GET /companies/:companyId/invitations` | None | `company.member.view` | Up to 50 recent invitation metadata records; no token hash or raw token |
| `POST /companies/:companyId/invitations` | `{email}` | `company.member.invite` | 201 invitation metadata; delivery must be configured, otherwise 503 `COMPANY_INVITATION_DELIVERY_UNAVAILABLE` |
| `POST /companies/:companyId/invitations/:invitationId/revoke` | None | `company.member.invite` | Revoked invitation metadata |
| `POST /company-invitations/accept` | `{token}`: 43 URL-safe characters | Active token matching invited email | `{companyId, companyMemberId, role: "VIEWER"}` |

Member errors include 404 `COMPANY_MEMBER_NOT_FOUND`, 403 `AUTHORIZATION_FORBIDDEN`, 409 `COMPANY_MEMBER_ROLE_UNCHANGED`, `COMPANY_OWNERSHIP_STATE_CONFLICT`. Invitation errors include 409 `COMPANY_INVITATION_ALREADY_PENDING`/`COMPANY_INVITATION_ALREADY_MEMBER`, 404 `COMPANY_INVITATION_NOT_FOUND`, 410 `COMPANY_INVITATION_EXPIRED`.

## Company jobs and applicants

| Method and path | Body/query | Permission | Response |
| --- | --- | --- | --- |
| `POST /companies/:companyId/jobs` | `{categoryId, title, description, employmentType, workplaceType, ...}`; see `CreateJobDto` for optional experience, salary and deadline fields | `company.update` | 201 DRAFT Job with UUID and `version` |
| `GET /companies/:companyId/jobs` | `page`, `pageSize`, optional `status` | `company.view` | Paginated company Jobs, including drafts |
| `GET /companies/:companyId/jobs/:jobId` | None | `company.view` | One company Job, including drafts |
| `PATCH /companies/:companyId/jobs/:jobId` | Changed `CreateJobDto` fields plus required `version` | `company.update` | Updated DRAFT Job; 409 `JOB_VERSION_CONFLICT` if stale |
| `POST /companies/:companyId/jobs/:jobId/publish`, `/pause`, `/close` | `{version}` | `company.update` | 200 updated Job; valid state/deadline required |
| `GET`, `PUT /companies/:companyId/jobs/:jobId/screening-questions` | PUT `{version, questions: [{type, label, isRequired, displayOrder, options?}]}`; type is `TEXT`, `TEXTAREA`, `YES_NO`, `SELECT` or `MULTI_SELECT` | GET `company.view`; PUT `company.update` | Active questions / updated Job and questions |
| `GET /jobs`, `GET /jobs/:jobId` | List: `page`, `pageSize`, `q`, `companyId`, `categoryCode`, `employmentType`, `workplaceType` | Public | Published, available Jobs only; detail includes active screening questions |
| `GET /companies/:companyId/jobs/:jobId/applications` | `page`, `pageSize`, optional `status` | `application.view` | Paginated applications |
| `GET /companies/:companyId/jobs/:jobId/applications/:applicationId` | None | `application.view` | Application detail with saved answers and snapshots |
| `PATCH /companies/:companyId/jobs/:jobId/applications/:applicationId/status` | `{version, status}`; status one of `REVIEWING`, `SHORTLISTED`, `INTERVIEW`, `OFFERED`, `REJECTED` | `application.review` | Updated Application; history and audit persisted atomically |

Applicant status errors include 404 `APPLICATION_NOT_FOUND`, 409 `APPLICATION_VERSION_CONFLICT` and `APPLICATION_STATE_CONFLICT`. Company and Job IDs are tenant checked. Candidate submission is `POST /jobs/:jobId/applications` with owned `resumeId`, `resumeVersionId`, `details` and screening `answers`; duplicate returns 409 `APPLICATION_DUPLICATE`.

## Platform Admin

| Method and path | Body/query | Required SYSTEM permission | Response |
| --- | --- | --- | --- |
| `GET /admin/dashboard` | None | `user.view` + `company.view` + `job.view` | PostgreSQL counts: `users`, `activeUsers`, `companies`, `activeCompanies`, `pendingCompanies`, `jobs`, `publishedJobs`, `applications` |
| `GET /admin/users`, `GET /admin/users/:userId` | List: `page`, `pageSize`, `status` (`ACTIVE`, `SUSPENDED`, `DISABLED`), `q` (email) | `user.view` | Paginated safe user rows / detail: `id`, `email`, `status`, `emailVerifiedAt`, timestamps |
| `PATCH /admin/users/:userId/status` | `{status: "ACTIVE" | "SUSPENDED"}` | `user.update` | Updated safe user; self and platform-authority targets return 403 |
| `POST /admin/users/:userId/disable` | No body | `user.disable` | 200 updated safe user; DISABLED is terminal |
| `GET /admin/companies`, `GET /admin/companies/:companyId` | List: `page`, `pageSize`, `q`, `status`, `verificationStatus` | `company.view` | Paginated companies / detail; `verificationStatus=PENDING` defaults to ACTIVE unless `status` is explicit |
| `PATCH /admin/companies/:companyId/verification` | `{status: "VERIFIED" | "REJECTED"}` | `company.verify` | Updated company; only ACTIVE/PENDING is actionable |
| `PATCH /admin/companies/:companyId/status` | `{status: "ACTIVE" | "SUSPENDED"}` | `company.suspend` | Updated company |
| `GET /admin/jobs`, `GET /admin/jobs/:jobId` | List: `page`, `pageSize`, `status`, `companyId` | `job.view` | Paginated platform Jobs / detail |
| `POST /admin/jobs/:jobId/close` | No body | `job.moderate` | 200 CLOSED Job when previously PUBLISHED/PAUSED |
| `GET /admin/audit` | `page`, `pageSize` | `audit.view` | Paginated `{id, actorUserId, companyId, action, targetType, targetId, createdAt}` only |

Admin errors include 404 `USER_NOT_FOUND`, `COMPANY_NOT_FOUND`, `JOB_NOT_FOUND`; 409 `USER_STATE_CONFLICT`, `COMPANY_STATE_CONFLICT`, `JOB_STATE_CONFLICT`; and 403 `ADMIN_SELF_MUTATION_FORBIDDEN`, `ADMIN_PRIVILEGED_TARGET_FORBIDDEN`. No admin user response selects hashes or tokens. `USER_ADMIN` and `AUDIT_VIEWER` are proposed roles until separately provisioned and assigned to named platform staff.
