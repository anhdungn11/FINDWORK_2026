# Platform administration permission boundary

The table records the existing approved seed policy. Every listed administrative grant has `SYSTEM` scope; Candidate grants have `OWN` scope. Company roles have no SYSTEM grants. HTTP admin routes enforce both an active access token and the required SYSTEM scope through `AccessTokenGuard`, `PermissionGuard`, and `requireSystem`.

| Existing role | SYSTEM grants | Available admin operations |
| --- | --- | --- |
| CANDIDATE | None | None |
| SUPPORT_ADMIN | `user.view`, `company.view`, `job.view` | Dashboard; user, company and job lists/details |
| VERIFICATION_ADMIN | `company.view`, `company.verify`, `company.suspend` | Company list/detail, pending verification decisions, suspend/reactivate |
| MODERATION_ADMIN | `company.view`, `job.view`, `job.moderate` | Company and job list/detail; close published or paused jobs |

`user.update`, `user.disable`, and `audit.view` exist in the permission registry and their guarded endpoints are implemented, but **no default role grants them**. This is intentional in the existing seed policy and handoff. No registration, company ownership, invitation, or role change API grants SYSTEM permissions. Admin mutations write audit records in the same transaction as their state change. Admin user responses explicitly select safe fields; the audit list excludes payload columns.

## Policy decision needed before account moderation is available by default

The minimal role change to enable account moderation for the existing `SUPPORT_ADMIN` role is to add `user.update:SYSTEM` and `user.disable:SYSTEM` to that role's seed grants. This would authorize **every current and future SUPPORT_ADMIN assignee** to suspend/reactivate and disable other users. `audit.view:SYSTEM` should be approved separately for an explicitly designated administrator because it exposes platform audit metadata. Confirm the intended assignees and whether audit access belongs to `SUPPORT_ADMIN` or requires a separate protected role or direct grant.

Do not provision any of these grants until the product owner approves that authority. This delivery does not modify `SYSTEM_ROLES`, assign `SystemUserRole`, write `SystemUserPermission`, run a seed, or change PostgreSQL grants. Candidate, company OWNER, RECRUITER, and current administrative roles retain exactly the permissions in the table above.

Operationally, `GET /admin/audit`, `PATCH /admin/users/:userId/status`, and `POST /admin/users/:userId/disable` remain unavailable to default roles. They return 403 to authenticated callers without a separately authorized SYSTEM grant and 401 without authentication.
