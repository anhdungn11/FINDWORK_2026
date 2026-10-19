# Platform administration permission boundary

`server/prisma/seed-data/system-roles.ts` defines the proposed protected SYSTEM roles. `server/prisma/seed.ts` upserts these roles and synchronizes their grants idempotently. The seed also manages a separate protected `SUPER_ADMIN` role with every registered SYSTEM permission. No role or grant changes have been applied to PostgreSQL in this sprint; applying the seed requires explicit authorization and a review of current assignees.

| Role | SYSTEM grants | Admin API access |
| --- | --- | --- |
| CANDIDATE | None; candidate grants are OWN scoped | None |
| SUPPORT_ADMIN | `user.view`, `company.view`, `job.view` | Dashboard and user, company, job reads |
| USER_ADMIN (proposed) | `user.view`, `user.update` | User reads and ACTIVE/SUSPENDED changes to ordinary accounts |
| AUDIT_VIEWER (proposed) | `audit.view` | Audit metadata list only |
| VERIFICATION_ADMIN | `company.view`, `company.verify`, `company.suspend` | Company reads, verification and company status |
| MODERATION_ADMIN | `company.view`, `job.view`, `job.moderate` | Company/job reads and job closure |
| SUPER_ADMIN (existing, separately seeded) | All registered permissions at SYSTEM scope | All guarded admin operations |

`user.disable` remains limited to existing SUPER_ADMIN authority or a separately approved direct grant. The new USER_ADMIN role cannot permanently disable accounts, assign roles, assign permissions or update its own account status. Any active system administrator or account with a live direct SYSTEM grant is protected from account status mutation through the current admin endpoint; this includes the last administrator. A separate higher-authority workflow would be required to moderate privileged accounts.

Admin HTTP routes require an active token and their specific SYSTEM permission. Failed authentication returns 401; missing authority returns 403. Mutations audit their state changes in the same transaction. User responses select only safe fields, and audit list responses exclude payloads that might contain secrets. Company roles and candidate registration do not confer SYSTEM grants.

To activate the proposed roles after approval, review existing `SystemUserRole` and `SystemUserPermission` assignees, then apply the existing idempotent role seed through the approved database procedure and assign the two roles only to named platform staff. Do not run a global seed as a shortcut: the current seed also synchronizes existing roles and other reference data. Existing role assignees receive no new grants from these additive definitions.
