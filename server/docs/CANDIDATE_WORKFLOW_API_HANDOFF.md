# Candidate workflow API handoff

All routes have the `/api/v1` prefix. Candidate routes require a Bearer access token. Errors have `{ code, message, details?, traceId, path, timestamp }`; Nest validation failures use HTTP 400 and `code: "VALIDATION_ERROR"` with `details` containing field errors. No route here changes CandidateProfile as a side effect of submitting an Application.

## CandidateProfile from an existing onboarding draft

1. `GET /candidate/bootstrap` returns `{ profile: { state: "exists" | "not_created", canCreateProfile, canViewProfile }, draft: { state: "missing" } | { state: "exists", version } }`. `GET /candidate/onboarding-draft` returns the current account's saved version and content. A draft, even version 13, is not yet a CandidateProfile.
2. Show the exact draft preview, including privacy changes and avatar/CV assets that cannot be imported. Obtain user confirmation before POST. `POST /candidate/profile/import-onboarding` accepts `{ "version": 13, "confirmPrivacy": true, "confirmPrivacyDifferences"?: true, "confirmOmitUnsupportedAssets"?: true }`. The two optional confirmations are required only when the server reports corresponding differences/assets. Do not send them merely because a checkbox was preselected.
3. Import checks the authenticated user's own draft and exact version, complete supported draft structure, account email, active reference values and the Candidate system role. The transaction creates profile, private initial privacy setting, role assignment and supported education, experience, skills, languages/certificates and career preferences. It preserves the draft and does not create an avatar or Resume. Response HTTP 201 is the full CandidateProfile with nested imported records and `privacySetting`.
4. Initial privacy is `{ searchableProfile: false, showEmail: false, showPhone: false, allowResumeDownload: false, allowJobMatching: true }`. If draft choices differ, HTTP 400 `CANDIDATE_IMPORT_PRIVACY_DIFFERENCES` returns `details: { privacyDifferences: string[], initialPrivacy: object }`. Present the listed changes and request `confirmPrivacyDifferences: true` only after explicit consent. Unsupported assets return HTTP 400 `CANDIDATE_IMPORT_UNSUPPORTED_ASSETS` with `details.unsupportedAssets: ("avatar" | "resume")[]`; explicit asset omission needs its own flag. Neither confirmation silently changes the saved draft.
5. Other actionable errors: 400 `CANDIDATE_ONBOARDING_INVALID`, `CANDIDATE_ONBOARDING_EMAIL_MISMATCH`, `CANDIDATE_REFERENCE_INVALID`; 401 invalid access token/session; 404 `CANDIDATE_ONBOARDING_DRAFT_NOT_FOUND`; 409 `CANDIDATE_ONBOARDING_VERSION_CONFLICT`, `CANDIDATE_PROFILE_ALREADY_EXISTS`, `CANDIDATE_IMPORT_CONFLICT`; 500 `CANDIDATE_ROLE_NOT_CONFIGURED`; 503 `CANDIDATE_REFERENCE_CATALOG_UNAVAILABLE` or `CANDIDATE_REFERENCE_CATALOG_INVALID`. `POST /candidate/profile` is the separate manual creation route and only needs `fullName` plus optional profile fields; it does not import draft content.

## Resume and application prerequisites

`POST /candidate/resumes` accepts `{ name: string (2–180), builderContent: object, templateCode?: string (max 80), builderSettings?: object }` and returns HTTP 201 with `{ id, name, sourceType: "BUILDER", status: "READY", isDefault, createdAt, updatedAt, versions: [{ id, versionNumber: 1, templateCode, builderContent, builderSettings, createdAt }] }`. JSON content/settings together are limited to 128 KiB. CandidateProfile and `resume.create: OWN` are required. `GET /candidate/resumes` returns `{ data: Resume[] }` with only the newest version summary `{ id, versionNumber, createdAt }` per Resume; `GET /candidate/resumes/:resumeId` returns all versions and builder content. `PATCH /candidate/resumes/:resumeId` needs creation fields plus `expectedVersionNumber` and creates a new version. Use `Resume.id` for `resumeId` and the chosen `ResumeVersion.id` for `resumeVersionId`; local/demo IDs cannot be submitted. Relevant errors: 400 validation/content size, 401 auth, 403 permission, 404 missing profile or Resume, 409 stale version/state.

An Application requires an existing CandidateProfile, an owned, non-deleted READY builder ResumeVersion with content, a published eligible real UUID Job, permission `application.create: OWN`, valid answers for every required question and no previous application for that candidate/Job. Job eligibility includes active company/category and future deadline/expiry when set. Duplicate submit is HTTP 409 `APPLICATION_DUPLICATE`.

## Application submit: actual persisted Step 2 values

`POST /jobs/:jobId/applications` now requires the following JSON (HTTP 201 on success):

```json
{
  "resumeId": "<Resume UUID v4>",
  "resumeVersionId": "<ResumeVersion UUID v4>",
  "details": {
    "contact": {
      "fullName": "Applicant-specific name",
      "email": "applicant@example.com",
      "phone": "+84901234567"
    },
    "currentLocation": "Ho Chi Minh City",
    "availability": "within-2-weeks",
    "preferredContactMethod": "phone"
  },
  "coverLetter": "Optional text",
  "answers": [{ "questionId": "<active question UUID v4>", "answer": true }]
}
```

`details.contact.fullName` is trimmed and required (1–160); email is trimmed and validated (max 320); phone is trimmed, max 32 characters, with 8–15 digits and common dial characters. `currentLocation` is optional, trimmed, max 255. `availability` is one of `immediately`, `within-1-week`, `within-2-weeks`, `within-1-month`, `negotiable`; `preferredContactMethod` is `email` or `phone`. `coverLetter` is optional, trimmed, max 5000. Unknown fields fail validation rather than being silently discarded. Missing or invalid `details` returns HTTP 400 `VALIDATION_ERROR`.

The Application row stores the submitted contact values in `fullNameSnapshot`, `emailSnapshot`, `phoneSnapshot`, `currentLocationSnapshot`, `availability` (`IMMEDIATELY` etc.) and `preferredContactMethod` (`EMAIL`/`PHONE`). It also stores `coverLetter`, CV IDs, Job snapshot and screening answer snapshots in the same transaction. Responses from submit, candidate list/detail and recruiter list/detail expose these snapshot fields. CandidateProfile contact fields remain unchanged. Frontend must send Step 2 values in `details` and must not claim they were submitted when `details` is absent or the POST fails. Frontend-only draft fields outside this DTO are not persisted.

## Screening and review

`GET /jobs/:jobId` returns active `screeningQuestions[]` ordered by `displayOrder`, then ID; each has `{ id, type, label, isRequired, displayOrder, options }`. Company GET/PUT `/companies/:companyId/jobs/:jobId/screening-questions` require company-wide view/update permission; PUT accepts `{ version, questions: [{ type, label, isRequired, displayOrder, options? }] }` on DRAFT or PAUSED Jobs, with at most 20 questions, unique order 0–19 and 2–20 unique options for choice types. A published Job must be paused before replacement. Active question IDs are server UUIDs.

Application `answers` has at most 20 `{ questionId, answer }` entries. `TEXT` takes 1–500 trimmed characters; `TEXTAREA` 1–5000; `YES_NO` a boolean including `false`; `SELECT` one listed option string; `MULTI_SELECT` a nonempty array of distinct listed option strings. Every required question needs one answer; optional unanswered questions can be omitted. Invalid, foreign or duplicate answers return HTTP 400 (`SCREENING_ANSWER_INVALID`, `SCREENING_OPTION_INVALID`, `SCREENING_QUESTION_INVALID`, `SCREENING_ANSWER_DUPLICATE`, `SCREENING_REQUIRED_ANSWER_MISSING`). Recruiter and candidate detail GET include immutable `questionSnapshot` and `answerValue` for every persisted answer. Replacement does not rewrite historical answers.

Application status starts `SUBMITTED`. Employer review PATCH `/companies/:companyId/jobs/:jobId/applications/:applicationId/status` takes `{ version, status }` with transitions `SUBMITTED → REVIEWING/REJECTED`, `REVIEWING → SHORTLISTED/REJECTED`, `SHORTLISTED → INTERVIEW/REJECTED`, `INTERVIEW → OFFERED/REJECTED`. `OFFERED` and `REJECTED` are terminal. `WITHDRAWN` is an enum/query value without a candidate mutation route. Candidate reads require `application.view: OWN`; recruiter reads/review need scoped company permissions and active membership. Stale version and invalid transition return HTTP 409.

## Test boundary

The two pending migrations are `20261017100000_candidate_saved_jobs` and `20261017110000_screening_multi_select`. This handoff introduces no new migration. PostgreSQL-writing E2E has not been run; it requires separate authorization and the controlled runbook.
