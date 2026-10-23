# Employer Media integration handoff — isolated branch

**Release update (2026-10-23):** The media contract and Frontend gaps are updated in [P0_BACKEND_RELEASE_CONTRACT_2026-10-23.md](./P0_BACKEND_RELEASE_CONTRACT_2026-10-23.md). This document records the earlier eight-migration baseline.

**Release update (2026-10-23):** The media contract and Frontend gaps are updated in [P0_BACKEND_RELEASE_CONTRACT_2026-10-23.md](./P0_BACKEND_RELEASE_CONTRACT_2026-10-23.md). This document records the earlier eight-migration baseline.

Status (2026-10-23): **real PostgreSQL and HTTP media acceptance passed on the isolated integration environment; browser acceptance pending**. Backend 3000, Frontend 5176, `findwork_dev`, and `findwork_test` were not changed.

## Local isolation gate

- Backend: `127.0.0.1:3002`, `NODE_ENV=test`, API prefix `/api/v1`.
- Frontend for Antigravity: `http://127.0.0.1:5177`, API base `http://127.0.0.1:3002/api/v1`. Use the same `127.0.0.1` host for cookies. Both `127.0.0.1:5177` and `localhost:5177` are explicitly allowed CORS/Auth origins; no wildcard.
- Dedicated storage: `C:\Users\HP\AppData\Local\FINDWORK\EmployerMedia3002`, outside Git. Its verified ACL permits only the local owner, SYSTEM, and Administrators. The configured root must already exist; the API never creates an arbitrary root.
- The dedicated `findwork_employer_media_3002` database was created empty and all eight migrations were applied there. The project's foundation permission/reference catalog was seeded there only. Test-owned users and companies were created through HTTP there. No DEV/TEST database was written.
- The Git-ignored `.env.employer-media.local` in this integration worktree has generated secrets, the dedicated database URL, explicit 5177 origins, and the private storage path. Never copy it into Git or use the demo database URL for port 3002.
- Backend 3002 is running. Before starting another process, check `GET http://127.0.0.1:3002/api/v1/health`. When stopped, run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-employer-media-integration.ps1` from `server`, then `node -r dotenv/config .\dist\main.js dotenv_config_path=.env.employer-media.local dotenv_config_override=true`. The checker requires ports 3002/5177 to be free, so use it before startup. Start Antigravity's separate Frontend checkout on `--host 127.0.0.1 --port 5177 --strictPort`. Do not restart or terminate 3000/5176. No worker entrypoint is needed.

## Exact media contract

`companyId` is a UUID. `kind` is exactly `logo` or `cover`. All errors use `{code,message,details?,traceId,path,timestamp}`.

| Method and URL | Request | Response | Key errors |
| --- | --- | --- | --- |
| `PUT /api/v1/companies/:companyId/media/:kind` | Bearer token for an active member with `company.update:COMPANY`; `multipart/form-data` with one `file` field. Let the browser set the multipart boundary. | `200 {"kind":"logo","available":true}`. The asset key is generated server-side, stored in the existing company column with audit, and never returned. | 400 `COMPANY_MEDIA_KIND_INVALID`, `COMPANY_MEDIA_FILE_REQUIRED`, `COMPANY_MEDIA_TYPE_INVALID`, `COMPANY_MEDIA_SIZE_INVALID`, `COMPANY_MEDIA_DIMENSIONS_INVALID`; 401 auth; 403 RBAC; 413 `REQUEST_FAILED` for Multer's 2 MiB transport cap; 503 `COMPANY_MEDIA_STORAGE_UNAVAILABLE`. |
| `GET /api/v1/companies/:companyId/media/:kind` | Public; no token or body. Company must be ACTIVE. | `200` binary image with matching `Content-Type`, `X-Content-Type-Options: nosniff`, restrictive CSP and `Cache-Control: no-store`. No JSON body on success. | 400 invalid kind; 404 `COMPANY_RESOURCE_NOT_FOUND` for unavailable company or `COMPANY_MEDIA_NOT_FOUND` for absent image; 503 `COMPANY_MEDIA_STORAGE_UNAVAILABLE` or `COMPANY_MEDIA_ASSET_UNAVAILABLE`. |
| `DELETE /api/v1/companies/:companyId/media/:kind` | Same Bearer permission as PUT; no body. | `200 {"kind":"logo","available":false}`. Clears key and audits; repeated removal is idempotent. | 400 invalid kind; 401/403 auth/RBAC; 503 unavailable storage. |

Accepted types are PNG, JPEG, and WebP with MIME matching the detected container. SVG and arbitrary URLs/paths are rejected. Logo size is at most 1 MiB and 2048 pixels per side; cover size at most 2 MiB and 4096 pixels per side; both are capped at 8,388,608 pixels. The upload parser caps every file at 2 MiB. Validation checks signatures and dimensions; **full image decode/re-encode, metadata stripping, and malware policy remain a production storage gate**.

Frontend example: after successful `PUT`, set the image source to `http://127.0.0.1:3002/api/v1/companies/<companyId>/media/logo?refresh=<new-value>` so the mounted `<img>` reloads immediately. On page reload, use the same URL without the query; `no-store` forces a fresh read. On 404, show a placeholder. After successful DELETE, hide the image immediately; a reload then yields 404. Do not send `logoAssetKey` or `coverAssetKey` in profile PATCH and do not synthesize image URLs from those internal keys.

Example error for a mismatched MIME type: HTTP 400 `{"code":"COMPANY_MEDIA_TYPE_INVALID","message":"Image type or size is invalid.","traceId":"...","path":"/api/v1/companies/<companyId>/media/logo","timestamp":"..."}`. Example missing file: HTTP 400 with `code:"COMPANY_MEDIA_FILE_REQUIRED"`. Example oversized multipart file: HTTP 413 with `code:"REQUEST_FAILED"`. The real trace ID and timestamp vary.

## Existing workspace contracts

`GET/PATCH /api/v1/companies/:companyId/profile` still use `company.view/update:COMPANY` and return the existing private profile. `GET/POST /api/v1/companies/:companyId/locations`, `PATCH/DELETE .../locations/:locationId`, and `PUT .../locations/:locationId/headquarters` retain their DTOs and response fields. The first location becomes headquarters; transfer headquarters before deleting it when other locations exist. Existing legal verification, member, Job, and Application routes and grants are unchanged. The focused HTTP test verifies profile, location create/list, and headquarters routing alongside media; the pre-existing DB-writing integration suite was not run.

## Acceptance still required

Real HTTP acceptance passed for registration, explicit Company creation and OWNER membership, Company Profile update/reload, first headquarters location create/list, legal verification request remaining PENDING, candidate and cross-company 403 denial, multipart logo and cover upload, repeat public GET with identical bytes and `no-store`, authorized DELETE, and 404 after deletion. Health, public jobs, companies and featured returned HTTP 200. Read-only database verification showed 8 applied migrations, two test-owned companies, two OWNER memberships and no remaining media keys after deletion. Browser acceptance on 5177 remains pending because that Frontend is not running. The 5176 website was unavailable for request tracing; its historical upload failure cannot be attributed to a specific status without a captured request. The demo worktree's `.env` has no `COMPANY_MEDIA_STORAGE_DIR`, which would cause HTTP 503 if its running process has no separate override. Frontend source has a global JSON `Content-Type` and explicitly sets bare `multipart/form-data` on `FormData`; Antigravity should clear the JSON default for this request, let the browser/Axios adapter supply the multipart boundary, and capture the actual response status and `code`.

A production rollout additionally needs shared durable storage and image decode/re-encode plus metadata/malware policy; the local adapter is appropriate only for one local Backend instance.
