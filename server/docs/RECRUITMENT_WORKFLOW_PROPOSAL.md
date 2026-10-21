# Recruitment workflow schema proposal — approval required

Current backend behavior uses the existing `ApplicationStatus` values. A company reviewer can move `SUBMITTED → REVIEWING → OFFERED` for a quick hire, or `SUBMITTED → REVIEWING → SHORTLISTED → INTERVIEW → OFFERED` for a standard hire. Status changes use application version compare and swap, write status history and audit, and appear in candidate reads. Existing `ApplicationAssignment` supports active, tenant scoped `PRIMARY_RECRUITER`, `REVIEWER`, and `INTERVIEWER` assignments. A review transition may carry an internal note in `ApplicationStatusHistory.note`; candidate reads exclude that note. No interview scheduling, email delivery, or offer acceptance is claimed.

Assignment records do not grant application access. Under the approved role matrix, `HIRING_MANAGER` and `VIEWER` have only `company.view`; they cannot read an assigned application. Recruiters and HR managers already have `application.view` at COMPANY scope. A hiring manager assignment is therefore recorded but cannot yet be worked by that member.

## Approval-gated minimal migration

An explicit job mode cannot be enforced with the current `Job` schema. An independent professional evaluation and in-app employer message cannot be persisted with the existing status history without inventing a status change. Proposed additive migration:

```sql
CREATE TYPE "RecruitmentWorkflowMode" AS ENUM ('QUICK', 'STANDARD');
ALTER TABLE "Job" ADD COLUMN "workflowMode" "RecruitmentWorkflowMode" NOT NULL DEFAULT 'STANDARD';

CREATE TABLE "ApplicationEvaluation" (
  "id" uuid PRIMARY KEY,
  "companyId" uuid NOT NULL,
  "applicationId" uuid NOT NULL,
  "reviewerMemberId" uuid NOT NULL,
  "summary" text NOT NULL,
  "recommendation" varchar(16) NOT NULL CHECK ("recommendation" IN ('ADVANCE', 'HOLD', 'DECLINE')),
  "createdAt" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ApplicationEvaluation_application_same_company_fkey"
    FOREIGN KEY ("companyId", "applicationId") REFERENCES "Application"("companyId", "id"),
  CONSTRAINT "ApplicationEvaluation_reviewer_same_company_fkey"
    FOREIGN KEY ("companyId", "reviewerMemberId") REFERENCES "CompanyMember"("companyId", "id")
);
CREATE INDEX "ApplicationEvaluation_application_createdAt_idx"
  ON "ApplicationEvaluation"("applicationId", "createdAt");

CREATE TABLE "ApplicationMessage" (
  "id" uuid PRIMARY KEY,
  "companyId" uuid NOT NULL,
  "applicationId" uuid NOT NULL,
  "senderMemberId" uuid NOT NULL,
  "body" text NOT NULL,
  "createdAt" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ApplicationMessage_application_same_company_fkey"
    FOREIGN KEY ("companyId", "applicationId") REFERENCES "Application"("companyId", "id"),
  CONSTRAINT "ApplicationMessage_sender_same_company_fkey"
    FOREIGN KEY ("companyId", "senderMemberId") REFERENCES "CompanyMember"("companyId", "id")
);
CREATE INDEX "ApplicationMessage_application_createdAt_idx"
  ON "ApplicationMessage"("applicationId", "createdAt");
```

Existing jobs default to `STANDARD`; no existing application status changes. No new system or company role is proposed. The Prisma models would mirror these columns, keys, and indexes. Apply only through an approved, reviewed migration against an approved target; this proposal has not been run.

## Separate role policy proposal for assigned hiring managers

To let an assigned `HIRING_MANAGER` see and evaluate only the applications assigned to them, add `application.view:ASSIGNED` and a new `application.evaluate:ASSIGNED` grant to that existing company role. Keep `VIEWER` unchanged. The `application.evaluate` permission registry entry would be `resource=application`, `action=evaluate`, COMPANY role usable only at `ASSIGNED` scope. The application read and evaluation guards must check an active `ApplicationAssignment` for the authenticated member, application, company and job; the existing COMPANY scoped recruiter and HR access remains unchanged. No status mutation grant is proposed for `HIRING_MANAGER`. This role policy and registry addition require separate approval before implementation or provisioning.

## Proposed API contract after approval

- `POST /companies/:companyId/jobs` and draft `PATCH /companies/:companyId/jobs/:jobId` accept `workflowMode: QUICK|STANDARD`; company and public job reads return it. Publishing freezes the mode. With the mode stored, `REVIEWING → OFFERED` is valid only for QUICK, and `SHORTLISTED → INTERVIEW → OFFERED` remains valid for STANDARD. Earlier jobs stay STANDARD.
- `POST /companies/:companyId/jobs/:jobId/applications/:applicationId/evaluations` requires either existing `application.review` at COMPANY scope or the separately approved `application.evaluate` at ASSIGNED scope with an active assignment to that application. Body: `{summary:string(1..5000),recommendation:ADVANCE|HOLD|DECLINE}`. The server derives reviewer member ID and tenant. Recruiter detail lists evaluations; candidate detail never does. Evaluation has no automatic status effect.
- `POST /companies/:companyId/jobs/:jobId/applications/:applicationId/messages` requires `application.review` at COMPANY scope and an active member. Body: `{body:string(1..5000)}`. The server derives the sender and tenant. Candidate detail lists persisted in-app employer messages. No email or external delivery is implied.
- All new writes require active application/company/membership checks, same-company foreign keys, atomic audit, and tenant scoped reads. Existing permission codes and role grants remain unchanged.

The schema and API additions above are pending explicit approval. The current backend supports the two status paths operationally but does not record or enforce a job's selected mode.

## Interview scheduling using existing schema — contract approval required

`Interview` and `InterviewParticipant` already persist company-scoped interview time, duration, ONSITE/PHONE/VIDEO type, location/meeting URL, SCHEDULED/RESCHEDULED/COMPLETED/CANCELLED status and same-company participants. The permission registry already contains `interview.view`, `interview.create`, `interview.update`, `interview.cancel`, `interview.evaluate` and `interview.respond`, but the default company roles have no interview grants and there are no interview HTTP routes. Scheduling therefore remains unavailable.

Minimal proposed routes under `/api/v1/companies/:companyId/jobs/:jobId/applications/:applicationId/interviews`:

| Method/path | Proposed permission and DTO | Response and behavior |
| --- | --- | --- |
| `GET /` and `GET /:interviewId` | `interview.view:COMPANY`, active member; list `page`, `pageSize`. | Paginated list or one tenant-scoped interview with active participants; read only. |
| `POST /` | `interview.create:COMPANY`; `{scheduledAt:ISO8601 future,durationMinutes:int(15..480),type:ONSITE|PHONE|VIDEO,location?:string(1..255),meetingUrl?:HTTPS URL,participantMemberIds?:UUID[]}`. | 201 SCHEDULED interview. Resolve participants to active same-company members; transactionally create interview, participants and audit. No email, calendar event or external meeting is created. |
| `PATCH /:interviewId` | `interview.update:COMPANY`; `{scheduledAt?:ISO8601 future,durationMinutes?:int(15..480),type?,location?,meetingUrl?,participantMemberIds?,expectedUpdatedAt:ISO8601}`. | 200 RESCHEDULED or edited interview; compare timestamp, update participants and audit atomically. |
| `POST /:interviewId/cancel` | `interview.cancel:COMPANY`; `{expectedUpdatedAt:ISO8601}`. | 200 CANCELLED interview with audit; cancellation is terminal. |

All routes must join application to the requested company and job, reject foreign or absent IDs with 404, stale edits with 409, invalid DTO/state with 400/409, and unauthorized access with 401/403. `Interview` has no integer version field, so timestamp compare-and-swap is the minimum without migration; if that is insufficient, seek approval for an additive version column. Decide candidate visibility and location/meeting URL redaction before adding a candidate interview read route. These DTOs and transitions are a proposal only. Approve exact role grants separately; `HIRING_MANAGER` receives no permission based on its name alone. Independent interviewer evaluations still need the proposed `ApplicationEvaluation` table and assignment-aware access policy above; `interview.evaluate` in the registry alone cannot persist an evaluation.
