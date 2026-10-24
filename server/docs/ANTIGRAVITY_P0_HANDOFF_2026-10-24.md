# FINDWORK backend P0 integration handoff — 2026-10-24

**Next-sprint update:** [Official ward snapshot, current AI sequence and Freemium gates](./P0_WARD_AI_NEXT_SPRINT_HANDOFF_2026-10-24.md) supersedes the ward and AI readiness statements below. The media contract and prior HTTP evidence remain valid.

Branch `feat/backend-release-integration`; API base `http://127.0.0.1:3002/api/v1`; integration PostgreSQL database `findwork_employer_media_3002`. This document records today's live 3002 evidence. The broader [release contract](./P0_BACKEND_RELEASE_CONTRACT_2026-10-23.md) defines the existing legal and interview APIs. Do not point acceptance scripts at `findwork_dev` or `findwork_test`.

## P0-01 logo and cover: backend HTTP/storage PASS, browser pending

| Method/path | Auth/request | Successful response | Important errors |
| --- | --- | --- | --- |
| `PUT /companies/:companyId/media/:kind` | Bearer access token; active member with `company.update:COMPANY`; `kind=logo|cover`; `multipart/form-data`, one `file` part | `200 {"kind":"logo","available":true}` | 400 `COMPANY_MEDIA_FILE_REQUIRED`, `COMPANY_MEDIA_KIND_INVALID`, `COMPANY_MEDIA_TYPE_INVALID`, `COMPANY_MEDIA_SIZE_INVALID`, `COMPANY_MEDIA_DIMENSIONS_INVALID`; 401; 403 `AUTHORIZATION_FORBIDDEN` or `AUTH_ACCOUNT_TYPE_FORBIDDEN`; 413 multipart cap; 503 storage unavailable |
| `GET /companies/:companyId/media/:kind` | Public, no bearer token | `200` binary image, matching `Content-Type`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` | 404 `COMPANY_MEDIA_NOT_FOUND` or unavailable company; 503 storage/asset unavailable |
| `DELETE /companies/:companyId/media/:kind` | Same Bearer permission as PUT | `200 {"kind":"logo","available":false}` | 401/403; 400 invalid kind; 503 storage unavailable |
| `GET /companies/:companyId` and `GET /companies` | Public | `logoUrl` and `coverUrl` are relative `/api/v1/companies/:id/media/:kind` paths or `null` | 404 unavailable company |

`companyId` is a UUID. Accepted images are PNG, JPEG and WebP with matching declared MIME and detected signature; logo maximum 1 MiB and 2048 pixels per side, cover maximum 2 MiB and 4096 pixels per side, both maximum 8,388,608 pixels. The multipart parser caps each file at 2 MiB. Asset keys and private filesystem paths must never become browser URLs. All errors use `{code,message,details?,traceId,path,timestamp}`.

Browser example: construct `FormData`, append exactly `file`, and call `apiClient.put('/companies/<uuid>/media/logo', formData, {headers:{Authorization:'Bearer <access-token>'}})`. Let the browser set the multipart boundary; remove any default JSON `Content-Type` before this call. On 200, set image `src` to `http://127.0.0.1:3002/api/v1/companies/<uuid>/media/logo?t=<timestamp>`. On F5, read the saved media presence from the private profile or public `logoUrl`, then use the stable URL. On DELETE 200, clear the local image flag. An absent image gives GET 404 and should display the placeholder.

Today's read-only inspection of company `c49eaf31-68b5-4b33-9b22-02bcce25453b`: logo file and HTTP GET both 197,565 bytes, SHA-256 `0a20ae65d26790bf5260dedb13d730636a133b860b72ced34e3c90b4d3c19b2f`; cover both 105,510 bytes, SHA-256 `043d9251c202d9112bab35e6eee9bcdd3bcf3f2c80e4b878f4ed61e3960e2232`. Both returned HTTP 200, `image/png`, `no-store`, and `Access-Control-Allow-Origin: http://127.0.0.1:5177`. Public company GET returned both relative URLs. `node scripts/accept-isolated-media.cjs` passed upload, repeat GET, replacement, deletion, subsequent 404, and cross-company 403 on a new test-owned company.

The invalid-location assertions have been separated into `accept-isolated-location-validation.cjs`, which reuses an existing employer token and company ID without registration. No reusable token was available during this pass, so authenticated invalid-address HTTP checks remain pending. Public query validation returned HTTP 400 for `provinceCode=ZZ`; the media pass is unaffected.

The separate Frontend checkout currently sets a bare multipart header in `src/services/api/companyWorkspaceApi.ts`, drops `logoUrl`/`coverUrl` in `normalizePublicCompany`, and sets `logo:null`/`cover:null` on the UUID public company detail page. Map and resolve these fields against backend origin. The Employer Profile preview builds the correct URL, but its actual browser request/element state has not been captured. Capture the PUT request boundary/status/body, GET URL/status/MIME, image `src`, and state after F5, replace and delete before marking browser PASS. Keep `127.0.0.1` consistent across frontend and backend.

## P0-02 administrative address catalog: province API PASS, wards BLOCKED

| Method/path | Auth/request | Response |
| --- | --- | --- |
| `GET /reference/countries` | Public; `q?`, `page=1`, `pageSize=1..100` | `{data:[{code,name,englishName}],pagination}`; ISO alpha-2 code |
| `GET /reference/provinces` | Public; `q?`, `page`, `pageSize` | `{data:[{id,code,name,divisionType,isActive}],pagination}`; active rows, accent-insensitive name/code search |
| `GET /reference/wards` | Public; `provinceCode=<official two-digit code>`, `q?`, `page`, `pageSize` | `{data:[{id,code,name,divisionType,codename,isActive,provinceCode}],pagination}`; currently empty because no approved ward snapshot is loaded |
| `POST /companies/:companyId/locations` | Bearer `company.update:COMPANY`; `{countryCode?:"VN",provinceId?:UUID,wardId?:UUID,addressLine?:string}` | 201 location; first location is headquarters |
| `PATCH /companies/:companyId/locations/:locationId` | Same auth; changed fields | 200 updated location; changing province clears old ward if no new ward is supplied |
| `GET /companies/:companyId/locations` | Bearer `company.view:COMPANY` | Tenant locations with `province`/`ward` objects and `isHeadquarters` |
| `PUT /companies/:companyId/locations/:locationId/headquarters` | Bearer `company.update:COMPANY` | 200 transferred headquarters |

Reference IDs in writes are database UUIDs; `code` is the official administrative code. Do not submit a code as a UUID or invent a code. Invalid/inactive province or a ward outside its province returns 400 `COMPANY_LOCATION_REFERENCE_INVALID`; ward without province or a non-VN country with a Vietnamese province returns 400 `COMPANY_LOCATION_INVALID`; an empty new location returns 400 `COMPANY_LOCATION_EMPTY`. Existing address-only locations remain readable/editable to preserve legacy records. A new structured VN address cannot include a valid ward until the official ward data is approved and imported.

Live HTTP returned 34 provinces and zero wards. `q=bac ninh` returned official code `24`, `Thành phố Bắc Ninh`; pagination works. The offline `npm.cmd run validate:admin:2026` validated the 34-row `vn-admin-2026-10-16` province manifest and explicitly reported the ward catalog blocked. No ward seed or migration was run.

Official baseline: [Decision 19/2025/QĐ-TTg](https://vanban.chinhphu.vn/?classid=1&docid=214409&pageid=27160), effective 2025-07-01, and the [Statistics Office live register](https://danhmuchanhchinh.nso.gov.vn/DiaBan1.aspx). The [Statistics Office statistics page](https://danhmuchanhchinh.nso.gov.vn/Tinh_tk_new.aspx) lists 2026 ward counts by province, and its [service description](https://danhmuchanhchinh.nso.gov.vn/DMDVHC.asmx) exposes date-parameterized ward lookup. These sources show changes after the 2025 baseline, including [resolution 237/NQ-UBTVQH16](https://danhmuchanhchinh.nso.gov.vn/NghiDinh.aspx) for Đồng Nai. A complete, dated and reproducible 2026 extract of every code, name, type, parent and effective date has not been acquired or reconciled. The existing `validateAdministrativeWardImport` is only an offline structural gate; it is not a verified seed. Before any write: acquire the official extract, record source/version/date and checksum, reconcile every row and 2026 province count plus later resolutions, review code collisions and referenced legacy rows, prepare idempotent upsert preserving UUIDs/history, preview changes and verify a backup. Seek separate approval for applying any new catalog or schema change to this integration DB. Frontend should show the ward catalog as unavailable rather than accept arbitrary typed ward values.

## P0-03 FINDWORK AI: HTTP blocker confirmed

| Method/path | Auth/request | Response |
| --- | --- | --- |
| `POST /ai/guest-sessions` | No auth, no body | 201 `{id,token,expiresAt}`; keep token in session memory and send `X-Findwork-Guest-Token` on later calls |
| `POST /ai/conversations` | User Bearer token or guest token | 201 `{id,createdAt,updatedAt}` |
| `GET /ai/conversations` | Same owner | Up to 30 owned conversations |
| `GET /ai/conversations/:id/messages` | Same owner | Up to 100 `{id,role,content,createdAt}` messages; foreign ID gives 404 `AI_CONVERSATION_NOT_FOUND` |
| `POST /ai/conversations/:id/messages` | Same owner; JSON `{content:string}` or multipart `content` plus optional `image` PNG/JPEG/WebP up to 2 MiB | Real provider success: `{user,assistant,usage}`; no provider config: 503 `AI_PROVIDER_NOT_CONFIGURED` with no saved messages |
| `POST /ai/transcriptions` | Same owner; multipart `file` WAV up to 2 MB/60 seconds | Real provider success `{text}`; invalid format 400 `AI_AUDIO_INVALID`; provider/config failure 503 |
| `DELETE /ai/conversations/:id` | Same owner | 200 `{id,deleted:true}` |

Guest sessions are limited to three per direct IP per 24 hours; conversation count and daily request/token/cost budgets also apply. Foreign history is isolated. The server-side OpenAI Responses adapter uses `store:false`; image bytes are sent as an image input and are not retained. Audio uses the provider transcription endpoint. Provider key, supported model, current input/output pricing and transcription model/cost ceiling must be configured server-side via `FINDWORK_AI_*` variables. No credential is configured on the live 3002 instance. Today's real HTTP check: guest 201, conversation 201, message 503 `AI_PROVIDER_NOT_CONFIGURED`, history 200 `[]`, anonymous history 401, deletion 200. Mocked adapter unit tests verify the Responses text/vision payload, no provider retention, transcription multipart and refusal without credentials. They do not prove a real provider response or browser rendering.

The separate Frontend checkout still posts to `/ai/chat`, which is not this contract. Replace with guest session + conversation flow, carry the guest token in memory, and show the actual `code` on failures. Do not display 503 as a generated answer. Model support for image input and real transcription remain provider acceptance gates.

## Existing P1 contracts and release commands

Private legal profile/evidence/verification and interview routes are detailed in the [release contract](./P0_BACKEND_RELEASE_CONTRACT_2026-10-23.md). Legal evidence is private PDF/PNG/JPEG up to 10 MiB, admin review requires `company.verify:SYSTEM`, and submission stays `PENDING` until reviewed. Interview schedule/reschedule/cancel and candidate visibility exist; Zoom returns `INTERVIEW_ZOOM_NOT_CONFIGURED` until real OAuth/meeting integration is available. These P1 flows were not rerun in this P0 pass.

Safe verification from `server`: `npm.cmd run build`; `npm.cmd run test:unit -- --runInBand`; `npm.cmd run validate:admin:2026`; `$env:DOTENV_CONFIG_PATH='.env.employer-media.local'; npm.cmd run prisma:validate`; `node scripts/check-isolated-state.cjs`; `node scripts/inspect-isolated-media.cjs` (requires read access to private media root); `node scripts/accept-isolated-media.cjs` (creates test-owned isolated DB fixtures and is subject to registration throttle); `node scripts/accept-isolated-ai-blocker.cjs` (creates and removes a guest conversation). To start a stopped 3002 backend, first run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-employer-media-integration.ps1`, then `node -r dotenv/config .\dist\main.js dotenv_config_path=.env.employer-media.local dotenv_config_override=true`. The checker intentionally refuses occupied ports. Never start another process on 3002 over an unidentified listener.
