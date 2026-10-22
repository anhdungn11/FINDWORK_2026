# Account type API handoff (isolated branch)

This contract requires migration `20261022180000_account_type_registration`
before deployment. The migration is prepared but has not been applied to any
database. The live demo Backend does not yet serve this contract.
The SQL only creates the enum and adds a nullable `User.accountType` column;
it neither updates existing users nor touches memberships or business data.
Deploying the prior Backend code remains a safe application rollback because
it ignores the additive column. Dropping the column is a separate migration
decision after data export. No migration was run for this branch.

## Registration and session

`POST /api/v1/auth/register/v2` is the route for Antigravity (public, origin
allowlist and rate limit). It requires an explicit account type:

```json
{"email":"person@example.com","password":"StrongPassword123!","accountType":"CANDIDATE"}
```

`accountType` accepts exactly `CANDIDATE` or `EMPLOYER`. Omission, explicit
`null`, other values, and extra fields fail with HTTP 400 `VALIDATION_ERROR`.
The existing `POST /api/v1/auth/register` remains available for old clients;
it accepts the same typed field but omission creates `LEGACY_UNCLASSIFIED`.
Duplicate email returns 409 `AUTH_EMAIL_ALREADY_REGISTERED`. Success returns
HTTP 201, sets the existing HTTP-only refresh cookie, and includes:

```json
{"accessToken":"<JWT>","accessTokenExpiresInSeconds":900,"user":{"id":"<UUID>","email":"person@example.com","status":"ACTIVE","emailVerified":false,"accountType":"CANDIDATE"}}
```

`POST /api/v1/auth/login` and `POST /api/v1/auth/refresh` retain their request,
cookie, and HTTP 200 contracts and add `user.accountType` to the same response.
`GET /api/v1/auth/me` (Bearer token) returns the same `user` fields. Existing
database users with `accountType = NULL` are reported as
`LEGACY_UNCLASSIFIED`; their roles and memberships are unchanged. Account type
is read from the database session on every authenticated request, not trusted
from a JWT or Frontend workspace selection.

## Workspace rules

| API | CANDIDATE | EMPLOYER | LEGACY_UNCLASSIFIED |
| --- | --- | --- | --- |
| `GET /api/v1/jobs`, `GET /api/v1/jobs/:jobId` | Public | Public | Public |
| `GET /api/v1/companies/me` | Authenticated membership list | Authenticated membership list | Authenticated membership list |
| `POST /api/v1/companies` | 403 | Explicit onboarding; creates OWNER | Existing behavior |
| `POST /api/v1/company-invitations/accept` | 403 | Explicit invitation acceptance | Existing behavior |
| `/api/v1/companies/:companyId/...` management | 403 | Active membership plus company RBAC | Existing membership plus RBAC |
| `/api/v1/candidate/...` and candidate applications | Candidate permissions | 403 | Existing candidate permissions |

Type mismatch returns HTTP 403 `AUTH_ACCOUNT_TYPE_FORBIDDEN`. Missing/invalid
access token retains the existing HTTP 401 auth codes. A valid Employer type
alone never grants company access: missing or cross-company membership and
missing RBAC grants return 403 `AUTHORIZATION_FORBIDDEN`. Company creation
still requires an explicit authenticated POST; reads never create a Company,
membership, CandidateProfile, CV, or Application. Employer public Job browsing
needs no CandidateProfile.

New typed CANDIDATE accounts cannot use company onboarding or invitations.
Old registration clients can still create `LEGACY_UNCLASSIFIED` accounts through
the original route during the compatibility period. Retiring that legacy route
and defining audited conversion between types are separate cutover decisions.
