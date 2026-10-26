# FINDWORK unified release operator runbook

Release worktree: `D:\DACSN\Find-Work-Release`, branch `release/v1.0.0-integrated`.
Local acceptance uses Frontend `http://127.0.0.1:5178`, API `http://127.0.0.1:3003/api/v1`, and PostgreSQL database `findwork_frontend_acceptance_cc7531c3be19`. Its private API configuration explicitly permits only Origin `http://127.0.0.1:5178`. Keep the 5177/3002 integration pair separate. Production must list its own exact HTTPS origins; never use `*` or a forged Origin header.

## Shared database hold and deployment

The shared `findwork_employer_media_3002` database had 9 completed migrations and zero Platform Super Admin assignments on 2026-10-26. No release migration or bootstrap has been applied to it. It requires separate, explicit owner authorization for the exact database and for each write operation.

1. Freeze the release commit. In a private operator session, verify connection host `127.0.0.1`, port `5432`, database `findwork_employer_media_3002`, schema `public`, `FINDWORK_EXPECTED_DATABASE`, and `SELECT current_database(), current_schema()`. Run `node scripts/check-shared-release-state.cjs` from `server` for an identity-checked read-only migration and admin count.
2. Before any write, run the identity-checked `node scripts/backup-integration-db.cjs` from `server`. Save its custom-format dump and SHA-256 outside the worktree with restricted access. Require its manifest and extraction checks to pass; rehearse a restore into a new disposable database and compare key table counts. A manifest check alone is not a restore rehearsal.
3. Review the additive SQL in `20261026010000_application_messaging`, `20261026020000_password_reset`, and `20261026030000_recruitment_email_notifications`. Confirm the exact target and expected migration change from 9 to 12. Generate the Prisma Client and build from the frozen release commit. Run the disposable HTTP suite independently.
4. Only after explicit authorization and a verified backup, set the private shared environment with `FINDWORK_EXPECTED_DATABASE=findwork_employer_media_3002`; run `prisma migrate deploy --config prisma7.config.ts` from the release `server` directory with that environment. Verify `prisma migrate status --config prisma7.config.ts` reports 12 and inspect schema/health before restarting the shared API. Do not point the local 5178 acceptance instance at the shared API.
5. First Platform Admin bootstrap is a separate privileged write. Follow `server/RELEASE_HANDOFF.md` only after separate authorization for the shared database and the exact new account. Never reuse an acceptance account or print its password.
6. On any migration or smoke failure, stop further writes. Decide on repair or restore with the owner using the verified backup and a rehearsed recovery procedure. Do not improvise a destructive rollback.

## Provider activation

AI: privately configure `FINDWORK_AI_PROVIDER=openai`, a server-side `FINDWORK_AI_API_KEY`, supported `FINDWORK_AI_MODEL`, and current positive input/output price settings. Restart the API, send a new authenticated or Guest prompt, and verify a real provider response and persisted message. Keep provider failure as `503 AI_PROVIDER_NOT_CONFIGURED` until then. Do not expose the key or enable billing without owner action.

Email: first verify the sender domain and an authorized test mailbox, then privately configure `EMAIL_DELIVERY_MODE=resend`, `EMAIL_WORKER_ENABLED=true`, `EMAIL_ACTIVE_KEY_ID`, `EMAIL_KEYRING_JSON` (32 random bytes per key, base64), `EMAIL_RESEND_API_KEY`, `EMAIL_FROM`, and reachable HTTPS verification, invitation, reset, and application URLs. Enable only the intended invitation, reset, and recruitment flags. Start the API and relevant email workers with the same private configuration. Confirm actual receipt and one-time link behavior in the authorized mailbox. Local mock-worker tests prove queueing and token handling, not Resend delivery.
