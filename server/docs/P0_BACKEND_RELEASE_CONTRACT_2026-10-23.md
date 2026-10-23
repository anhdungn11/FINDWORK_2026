# FINDWORK P0 backend contract and acceptance — 2026-10-23

This supersedes the earlier company administration and AI proposal documents for the `feat/backend-release-integration` branch. Every path below has the `/api/v1` prefix. JSON errors have `{code,message,details?,traceId,path,timestamp}`. The only database used for the evidence below is `127.0.0.1:5432/findwork_employer_media_3002/public`.

## Company locations and reference catalogs

| Method and path | Request | Response / rule |
| --- | --- | --- |
| `GET /reference/countries` | `page=1&pageSize=100&q?` | ISO 3166-1 alpha-2 `{data:[{code,name,englishName}],pagination}`. Search is accent-insensitive. |
| `GET /reference/provinces` | `page=1&pageSize=100&q?` | Active `{id,code,name,divisionType,isActive}` rows with pagination. The isolated DB contains 34 reviewed provinces from `vn-admin-2026-10-16`. |
| `GET /reference/wards` | `page=1&pageSize=100&provinceCode?&q?` | Active `{id,code,name,divisionType,codename,isActive,provinceCode}` rows, filtered by parent province and paginated. The isolated DB has **zero** verified 2026 ward rows. An empty result is not evidence that a named ward is invalid. |
| `GET /companies/:companyId/locations` | Bearer with `company.view:COMPANY` | Array of tenant locations, including `countryCode`, `provinceId`, `wardId`, `addressLine`, `isHeadquarters`, `province`, `ward`. |
| `POST /companies/:companyId/locations` | Bearer with `company.update:COMPANY`; `{countryCode?,provinceId?,wardId?,addressLine?}` | First row becomes headquarters. `wardId` must be active and in `provinceId`; Vietnamese provinces require `countryCode: "VN"`. Free-text legacy `addressLine` remains readable and editable. |
| `PATCH /companies/:companyId/locations/:locationId` | Same permission; changed fields | Returns updated location; a province change clears an old ward unless a new ward is sent. |
| `PUT /companies/:companyId/locations/:locationId/headquarters` | Same permission | Atomically transfers the single headquarters flag. |
| `DELETE /companies/:companyId/locations/:locationId` | Same permission | Transfer headquarters first if other locations exist; 409 `COMPANY_HEADQUARTERS_TRANSFER_REQUIRED`. |

Location errors: 400 `COMPANY_LOCATION_EMPTY`, `COMPANY_LOCATION_INVALID`, `COMPANY_LOCATION_REFERENCE_INVALID`; 403 `AUTHORIZATION_FORBIDDEN`/`AUTHORIZATION_COMPANY_SCOPE_REQUIRED`; 404 `COMPANY_RESOURCE_NOT_FOUND`; 409 `COMPANY_HEADQUARTERS_INCONSISTENT`. The 2026 ward import is blocked until a complete dated official extract is reconciled. Do not backfill guessed codes or make district a required field. Source evidence: [Statistics Office administrative register](https://danhmuchanhchinh.nso.gov.vn/), [Decision 19/2025/QD-TTg](https://vanban.chinhphu.vn/?classid=1&docid=214409&pageid=27160), and the reviewed local manifest `prisma/seed-data/vietnam-administrative-2026-10-16.json`.

## Private legal verification

`UNVERIFIED` is the existing schema's draft state. `PENDING` means submitted; `VERIFIED` means reviewer approved. `REJECTED` can be edited and submitted again. There is no automatic verification.

| Method and path | Request | Response / rule |
| --- | --- | --- |
| `PATCH /companies/:companyId/profile` | Bearer `company.update:COMPANY`; `{legalName,taxCode}` plus existing brand fields | Legal name and Vietnamese 10 or 13-digit tax identifier are checked at submission. Legal fields lock while PENDING or VERIFIED. |
| `GET /companies/:companyId/legal` | Bearer `company.update:COMPANY` | `{id,legalName,taxCode,verificationStatus,legalProfile,legalEvidence}`. Evidence list contains metadata only, never `storageKey`. |
| `PATCH /companies/:companyId/legal` | Bearer `company.update:COMPANY`; `{registeredAddress,representativeName,representativeTitle?,contactEmail,contactPhone}` | Validated private registered entity record, audited without copying sensitive values into audit JSON. |
| `POST /companies/:companyId/legal/evidence` | Bearer `company.update:COMPANY`; multipart fields `kind` (`BUSINESS_REGISTRATION`, `TAX_CERTIFICATE`, `REPRESENTATIVE_AUTHORIZATION`) and `file` | 201 metadata `{id,kind,originalName,mimeType,byteSize,sha256,createdAt}`. PDF, PNG or JPEG; at most 10 MiB; bytes are stored under the private media root's `legal` namespace, never exposed publicly. |
| `GET /companies/:companyId/legal/evidence/:evidenceId` | Bearer `company.update:COMPANY` | Private attachment bytes, `Cache-Control: no-store`, `nosniff` and restrictive CSP. |
| `DELETE /companies/:companyId/legal/evidence/:evidenceId` | Bearer `company.update:COMPANY` | 200 `{id,removed:true}`; unavailable during review or after approval. |
| `POST /companies/:companyId/verification-request` | Bearer `company.update:COMPANY` | 200 private profile with `PENDING`; requires valid legal identifiers, legal profile and business registration evidence. |
| `GET /admin/companies/:companyId/legal` and `/evidence/:evidenceId` | Bearer `company.verify:SYSTEM` | Private reviewer metadata/attachment; download is audited. |
| `PATCH /admin/companies/:companyId/verification` | Bearer `company.verify:SYSTEM`; `{status:"VERIFIED"}` or `{status:"REJECTED",reason:"..."}` | 200 reviewed company. Rejection reason must be 10–1000 chars; reviewer cannot be a company member. Only ACTIVE/PENDING can be decided. |

Key errors: 400 `COMPANY_VERIFICATION_PROFILE_INCOMPLETE`, `COMPANY_LEGAL_FILE_REQUIRED`, `COMPANY_LEGAL_FILE_SIZE_INVALID`, `COMPANY_LEGAL_FILE_TYPE_INVALID`; 403 `COMPANY_VERIFICATION_SELF_REVIEW_FORBIDDEN`; 409 `COMPANY_VERIFIED_LEGAL_DETAILS_LOCKED`, `COMPANY_VERIFICATION_STATE_CONFLICT`, `COMPANY_STATE_CONFLICT`; 503 `COMPANY_LEGAL_STORAGE_UNAVAILABLE`. Never put a tax identifier or document bytes in the public company response.

## Logo and cover

`PUT /companies/:companyId/media/:kind` takes one multipart `file` and `company.update:COMPANY`; `kind` is `logo` or `cover`. It returns `200 {kind,available:true}`. **Do not set a bare `Content-Type: multipart/form-data` header** in the browser: let Axios/browser add the boundary. PNG/JPEG/WebP are validated by signature, MIME, dimensions and size (logo 1 MiB/2048px, cover 2 MiB/4096px, both 8,388,608 pixels maximum). `GET` is public binary with `Cache-Control: no-store`; `DELETE` returns `200 {kind,available:false}` and subsequent GET returns 404 `COMPANY_MEDIA_NOT_FOUND`. Public `GET /companies` and `GET /companies/:id` now return `logoUrl` and `coverUrl` as `/api/v1/companies/:id/media/:kind` when present, otherwise `null`; internal asset keys remain private.

The integrated Frontend branch currently calls the media PUT with an explicit multipart header, and its public company detail mapping sets `logo:null` and `cover:null` even for a backend UUID. Antigravity should remove the explicit header, map `logoUrl`/`coverUrl` through `normalizePublicCompany`, resolve their relative API paths against the backend origin, and use them in `CompanyDetailRecord`. The Employer Profile preview already uses the stable GET URL and a cache-busting query after upload. On F5, `no-store` makes the same GET load the current image. Inspect the browser Network panel for PUT status/code, multipart boundary, GET status/content-type and the image element `src`.

## FINDWORK AI

The backend has a real OpenAI Responses adapter, `store:false`, server-only credentials, owned PostgreSQL conversations, guest tokens stored as hashes, provider usage accounting, image input and WAV transcription. **No provider credentials are configured in the isolated environment, so generation returns HTTP 503 `AI_PROVIDER_NOT_CONFIGURED`; no assistant message is saved.** Image and audio provider success remain unverified until real credentials and supported models are supplied.

| Method and path | Request | Response |
| --- | --- | --- |
| `POST /ai/guest-sessions` | No auth | 201 `{id,token,expiresAt}`. Store token only in session memory and send it as `X-Findwork-Guest-Token`; 3 sessions per direct IP per 24 hours. |
| `POST /ai/conversations` | Bearer user token or guest token | 201 `{id,createdAt,updatedAt}`. |
| `GET /ai/conversations` | Same identity | Up to 30 owned conversations. |
| `GET /ai/conversations/:id/messages` | Same identity | Up to 100 owned messages; foreign IDs return 404 `AI_CONVERSATION_NOT_FOUND`. |
| `POST /ai/conversations/:id/messages` | JSON `{content}` or multipart `content` plus optional `image` (PNG/JPEG/WebP, 2 MiB) | On genuine provider success `{user,assistant,usage}`; image bytes are sent to the provider and not retained. |
| `POST /ai/transcriptions` | Multipart WAV `file`, 2 MB/60 seconds maximum | On genuine provider success `{text}`. |
| `DELETE /ai/conversations/:id` | Same identity | 200 `{id,deleted:true}`. Expired guest history is also purged in bounded batches when new guest sessions are issued. |

Generation budgets: guest 5 calls, 32,000 reserved tokens and 3,000 estimated micro-USD per UTC day; user 20 calls, 120,000 tokens and 20,000 estimated micro-USD. Each text request reserves 9,000 tokens; an image request reserves 20,000 because image tokenization depends on the configured model. Older context is trimmed to 7,000 UTF-8 bytes and new text is limited to 4,000 UTF-8 bytes. The provider model and current input/output price per million tokens must be configured together with `FINDWORK_AI_API_KEY`; transcription also needs `FINDWORK_AI_TRANSCRIPTION_MODEL` and `FINDWORK_AI_TRANSCRIPTION_MAX_COST_MICROS`. Per-IP throttles cover session issuance, generation and audio. No credential is returned to the browser. The integrated Frontend branch currently posts to `/ai/chat` and keeps history in `localStorage`; it must use these conversation endpoints and its own guest token, and should not label every HTTP failure as a provider configuration error. Provider references: [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [image input](https://developers.openai.com/api/docs/guides/images-vision), [audio transcription](https://platform.openai.com/docs/api-reference/audio).

## Interview and session

| Method and path | Request | Response |
| --- | --- | --- |
| `POST /companies/:companyId/applications/:applicationId/interviews` | Bearer `application.review:COMPANY`; `{scheduledAt:<ISO instant with timezone>,durationMinutes:15..240,type:"ONSITE"|"PHONE"|"VIDEO",location?,provider?:"MANUAL"|"ZOOM",meetingUrl?}` | 201 persisted Interview plus one InterviewSession. ONSITE requires `location`; VIDEO with MANUAL requires a real supplied HTTPS `meetingUrl`. ZOOM returns 503 `INTERVIEW_ZOOM_NOT_CONFIGURED` and creates nothing. |
| `GET /companies/:companyId/applications/:applicationId/interviews` | Bearer `application.view:COMPANY` | Up to 100 interviews for this tenant/application. |
| `GET /candidate/applications/:applicationId/interviews` | Bearer candidate with `application.view:OWN` | Only the applicant's interviews; other candidate IDs return 404. |
| `PATCH /companies/:companyId/interviews/:id/reschedule` | Bearer `application.review:COMPANY`; `{scheduledAt}` | 200 persisted `RESCHEDULED`; audited. |
| `PATCH /companies/:companyId/interviews/:id/cancel` or `/complete` | Same permission | 200 `CANCELLED` or `COMPLETED`; audited; repeated terminal transition returns 409 `INTERVIEW_STATE_CONFLICT`. |

The existing Interview/application/member tenant foreign keys remain in place. The additive `InterviewSession` row records `MANUAL` and a user-supplied URL only when applicable. Zoom OAuth, account configuration, webhook handling and real provider meeting creation are unavailable; no Zoom meeting link is generated.

## Evidence and browser acceptance

- Migration `20261023090000_employer_ai_interview_foundation` applied only to `findwork_employer_media_3002`; read-only state check reported 9 completed migrations and 34 provinces/0 wards.
- `npm run build`, `npm run prisma:validate` and `npm run test:unit -- --runInBand` passed (27 suites, 238 tests). The existing DB-writing Jest suites target `findwork_test` and were deliberately not run against the isolated DB.
- `node scripts/accept-isolated-media.cjs` passed real HTTP logo/cover upload, repeat GET, replacement, deletion, 404 and cross-company denial on the isolated DB. `node scripts/accept-isolated-release.cjs` passed location, legal review/approval/rejection/resubmission, private evidence, guest AI honest 503, owned history, job creation/publish, interview schedule/reschedule/cancel, candidate access and PostgreSQL audit evidence. The extended release run passed on 2026-10-23 with `FINDWORK_ACCEPT_SKIP_GUEST=1` because the earlier run had already exercised guest-session issuance. A subsequent media rerun hit the intentional registration throttle (429) after the release fixtures; the preceding media pass remains the evidence for that flow. Acceptance test records remain in the isolated database.
- Port 3002 was already held by an older `node -r dotenv/config .\\dist\\main.js` process. The new build was verified on port 3003 against the same database and private media root. Browser acceptance on 5177 is pending the Frontend contract changes above and a controlled restart of the 3002 backend process.

For browser acceptance, use the integrated Frontend worktree `D:/DACSN/Find-Work-Employer-UX` at `http://127.0.0.1:5177` with `VITE_API_BASE_URL=http://127.0.0.1:3002/api/v1` and `VITE_ENABLE_WORKSPACE_WRITES=true`. First restart the identified isolated backend at 3002 with `.env.employer-media.local` and verify `/api/v1/health`; do not point it to `findwork_dev` or `findwork_test`. Register an EMPLOYER, create a company, upload a valid PNG through Employer Profile, confirm the PUT is 200 and the public media GET is 200 `image/png`, navigate to the UUID public company route, then press F5 and confirm the new logo remains visible. Repeat for cover, replacement and deletion; use a second employer account to confirm 403 on cross-company PUT/DELETE. Exercise province search, legal evidence submission and pending state, reviewer decision, guest AI 503, and candidate/employer interview visibility with test-owned accounts.
