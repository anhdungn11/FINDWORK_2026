# CP13D company Business AI

## Integration and scope

CP13D starts at CP13A 173ea3745fca7cdc337a25f0679fc71c3a0ecb7d and merges CP13B e9350fb43a65b3494f934e49495702ba039b8774. Merge commit: b84514d5b86ca52f34ecda125d5366b96a949ad0. The seven endpoints use the existing OpenAI Responses adapter when configured. Tests and Chrome acceptance replace that adapter with a deterministic mock; no live credits were used.

The five POST routes draft a job, improve a job description, suggest screening questions, suggest interview questions, and suggest a recruitment plan. They return bounded, validated JSON for the CP13B frontend. They never publish jobs, update applications, reject candidates, or make hiring decisions. An optional improve-job jobId is checked against the requested company. Prompt construction uses submitted job and planning fields only; the backend does not fetch candidate CVs or applications. The provider request sets store:false. The server stores generation metadata and counters, never prompts or outputs; no company chat history is advertised.

## API and access

All routes have prefix /api/v1/companies/:companyId/ai. Every route requires authentication, active user and company, active membership in that exact company, explicit granted ai.business.access platform capability and company RBAC. Missing capability or quota rows fail closed. OWNER has no platform bypass. recruitment.analytics.view remains unavailable and denied.

| Method and path | Response | Internal permission |
| --- | --- | --- |
| POST draft-job | Job draft fields and markdown | ai.business.generate |
| POST improve-job | Improved description, requirements, critique, scores | ai.business.generate |
| POST screening-questions | Structured questions | ai.business.generate |
| POST interview-questions | Question categories | ai.business.generate |
| POST recruitment-plan | Timeline phases and risk tips | ai.business.generate |
| GET status | Status, version, feature flags, supported models | company.view |
| GET quota | Monthly total/remaining, daily used/limit, renewal date | company.view |

Request bodies are declared in server/src/modules/ai/company-ai.dto.ts and match src/services/api/employerAiApi.ts. The global validation pipe rejects unknown fields. Status available means quota exists and provider configuration is present; it does not claim live provider health. Provider errors return truthful failures and the frontend clears stale results. No fabricated fallback results remain.

Super Admin GET /api/v1/admin/companies/:companyId/capabilities reports actual rows. PATCH /api/v1/admin/companies/:companyId/capabilities/ai.business.access accepts isGranted and a 10 to 500 character reason. Both retain CP13A system permissions and active SUPER_ADMIN checks, with atomic audit. Company verification and capability approval remain separate. Existing and new companies start with AI denied. OWNER, ADMIN, HR_MANAGER, RECRUITER and HIRING_MANAGER receive internal ai.business.generate; VIEWER cannot POST.

## Quota and migration

Migration 20261028170000_company_business_ai_quota adds CompanyAiQuota and CompanyAiGenerationLog and backfills quota rows for existing companies without granting AI. Migration 20261028171000_business_ai_internal_permission adds internal RBAC to the five employer roles. New company creation writes its quota row transactionally. Neither migration changes SystemUserRole, verification or candidate quota.

One successful generation consumes one request credit. Effective defaults are 100 per UTC month and 20 per UTC day, configurable through FINDWORK_COMPANY_AI_MONTHLY_LIMIT and FINDWORK_COMPANY_AI_DAILY_LIMIT. Per-company database ceilings also apply; the lower limit wins. An atomic conditional PostgreSQL UPDATE reserves a request under row lock, preventing concurrent overdraw. Failed provider or malformed-output calls are marked FAILED and refunded. Exhaustion returns HTTP 429 AI_COMPANY_QUOTA_EXCEEDED.

Rollback: deploy the previous application build while retaining the additive tables and permission/audit history. Before a later schema reversal, export and verify company AI usage metadata, then use a separately reviewed migration. Do not automatically delete counters or audit history. During mixed-version rollout, provision quota rows for companies created by an older application before AI can be granted. Production/shared migrations require owner approval and verified backup.

## Validation and limits

A fingerprinted disposable PostgreSQL Docker cluster on 127.0.0.1:55432/findwork_test ran Prisma validation and all 15 migrations. Full backend Jest: 49 suites, 526 passed, 2 skipped. Frontend Vitest: 419 passed. TypeScript, ESLint and both production builds passed. Real Chrome with the explicit mock provider confirmed Admin grant/revoke, Employer generated result, denial after revoke, one usage unit and two audit actions. Evidence: docs/evidence/cp13d-chrome-acceptance.json and three full-page screenshots.

Production readiness still needs a controlled live-provider smoke test with owner-approved credentials and credits, production backup and migration approval, and resolution or explicit waiver of the two pre-existing skipped backend tests. Mock-provider evidence establishes application integration and security behavior, not live-provider availability.
Existing-company backfill replay evidence: docs/evidence/cp13d-backfill-check.json. The transaction restored one quota row and all five internal role grants while AI capability stayed denied and verification stayed unchanged; it was rolled back.
