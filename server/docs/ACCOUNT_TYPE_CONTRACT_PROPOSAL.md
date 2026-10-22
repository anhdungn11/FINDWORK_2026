# Registration account type: approval proposal

Current registration accepts only `email` and `password`. `User` has no
persistent Candidate or Employer type. Registration assigns the CANDIDATE
system role but creates no CandidateProfile or Company. Employer access is
derived from active CompanyMembership plus company scoped permissions.
`POST /api/v1/companies` is the current explicit onboarding action.

To enforce separate types in a later approved release:

1. Add a nullable `User.accountType` enum with `CANDIDATE`, `EMPLOYER`, and
   `LEGACY_UNCLASSIFIED`. Backfill existing users to `LEGACY_UNCLASSIFIED`
   without inferring type from email, profile, or memberships. Preserve all
   existing roles and company links. During the compatibility period, old
   registration requests create `LEGACY_UNCLASSIFIED` users. New registration
   requests must explicitly select `CANDIDATE` or `EMPLOYER`. After the
   Frontend cutover, reject omitted or unknown types, backfill any remaining
   nulls, then make the column `NOT NULL` without a database default.
2. Return `accountType` from registration, login, refresh, and `GET /auth/me`.
   Give new CANDIDATE users the existing candidate grants. New EMPLOYER users
   can browse public jobs immediately and must explicitly create a company or
   accept an invitation before managing one. Neither route creates a
   CandidateProfile automatically.
3. Enforce type at company creation, invitation acceptance, and all employer
   management guards; require active membership and RBAC after the type check.
   Enforce the reciprocal rule on CandidateProfile creation and candidate
   application endpoints. `LEGACY_UNCLASSIFIED` retains existing membership
   and permission behavior so existing dual-role accounts keep working.
4. Define an explicit, audited account conversion or dual-role policy before
   permitting a new CANDIDATE account to become an employer. This policy is
   required before tightening the existing `POST /companies` onboarding flow.
   Add HTTP tests for both registration types, legacy owners, cross-company
   denial, invitation acceptance, public job browsing, and no read-side writes.

Approval boundary: the enum/column migration, registration contract cutover,
and type enforcement require separate approval. The current release makes no
schema, role, or existing-user changes. For rollback, deploy the prior guard
behavior first and leave the additive column inert; remove it only after a
separately reviewed data export and migration rollback.
