# FINDWORK Freemium AI and paid interviews — proposed architecture

Status: product decision recorded, design only. No billing schema migration, payment endpoint, charge, subscription grant, or premium activation has been executed. The P0 official ward import and live text AI provider test retain priority.

## Product rules

| Plan | Subject | Entitlements | Server limits |
| --- | --- | --- | --- |
| Free | Guest session or registered user | Limited text AI Q&A; existing job search, CV and application permissions continue | Existing guest session/IP and user text budgets apply until versioned plan limits are approved. Image, voice and mock interview denied. |
| Candidate Pro | Candidate user | Higher text limit, AI mock interview, voice, supported image analysis, detailed feedback and advanced CV assistance | Active, unexpired user entitlement; feature-specific quota and cost reservation on every request. |
| Business AI | Company tenant | AI recruitment assistance and approved interview features | Active, unexpired company entitlement **and** existing company RBAC; consent, audit, human review and feature-specific quotas. |

The current release has no verified paid entitlement source. Image and transcription now fail closed with 403 `AI_PREMIUM_ENTITLEMENT_REQUIRED` in source; the running 3002 process needs a controlled restart before that behavior is live. No AI mock interview endpoint exists. Text chat stays subject to the existing owner, rate and cost checks. Frontend flags never grant backend access.

## Proposed additive schema, subject to approval

| Table | Key fields/invariants |
| --- | --- |
| `SubscriptionPlanVersion` | Immutable `planCode`, `version`, `subjectType` (`USER`/`COMPANY`), currency, displayed price, effective/retired dates, feature limit JSON validated against a registry. No price edits in place. |
| `BillingSubscription` | UUID, exactly one `userId` or `companyId`, plan version FK, provider/customer/subscription IDs, `PENDING|TRIALING|ACTIVE|PAST_DUE|CANCELED|EXPIRED`, period bounds, cancel-at-period-end, unique provider ID. Client cannot set status. |
| `EntitlementGrant` | Subject, feature code, source subscription/admin grant, valid-from/to, quota policy version, revocation timestamp. Only backend reconciliation can create it; entitlement queries consider subscription state and expiry. |
| `FeatureUsageBucket` | Subject + feature + period key, request count, reserved/settled tokens and micro-USD, atomic compare-and-increment, idempotency key and unique request ledger. Release reservations on provider failure. |
| `PaymentEventInbox` | Provider event ID unique, signed payload hash, verification result, received/processed timestamps and failure state. Verify signature against raw bytes before accepting; idempotent replay. Restrict payload retention and logs. |
| `BillingAuditLog` | Actor, subject, transition, provider reference, timestamp and non-sensitive before/after state. |
| `InterviewConsent` | Candidate/employer consent state, policy version, scope, timestamp and revocation. Recording/transcript features require explicit consent from each required participant. |

Do not backfill a paid plan from account type, company role or frontend state. Preserve existing `AiUsageBucket`, `AiConversation` ownership, Account Type, company memberships and audit history. A migration must be additive, reviewed against a backup and applied only after explicit approval to the named database.

## Proposed API contract, inactive until approved

| Method/path | Auth | Contract |
| --- | --- | --- |
| `GET /api/v1/plans` | Public | Versioned public Free/Pro/Business features, currency and price display; no payment state. |
| `GET /api/v1/me/entitlements` | User Bearer | Effective user features, remaining quotas, expiry and subscription state; source is server-owned. |
| `GET /api/v1/companies/:id/entitlements` | Bearer `company.view:COMPANY` | Effective tenant features and quotas. Feature invocation also checks operation-specific company permission. |
| `POST /api/v1/billing/checkout-sessions` | Authenticated subject owner/admin | One approved plan version and idempotency key; returns a provider-hosted URL only after real provider session creation. No client-selected price or activation. |
| `GET /api/v1/billing/subscriptions/:id` | Subject owner or tenant billing admin | Server-reconciled lifecycle and invoice references; no raw provider secret. |
| `POST /api/v1/billing/webhooks/:provider` | Provider signed webhook | Verify raw signature, dedupe event ID, reconcile subscription, audit and then derive entitlements. Never trust an unsigned callback or browser redirect as proof of payment. |
| Premium AI/interview calls | Existing owner/tenant auth plus feature entitlement | 403 `AI_PREMIUM_ENTITLEMENT_REQUIRED` or `INTERVIEW_PREMIUM_ENTITLEMENT_REQUIRED`; 429 feature quota; 409 expired/transition conflict as appropriate. |

The current `/api/v1/ai/conversations` text flow remains the single public popup flow for Antigravity. The UI should show Free/Pro comparison, locked feature affordances and actual server entitlement/usage state; it should show checkout as pending until backend confirms it. It must retain provider errors and never claim a payment succeeded from a return URL.

Proposed Antigravity UI states: the public popup offers Free text and shows a clear quota/503 message; locked image, voice and mock interview actions link to a plan comparison page. Candidate account settings show Pro status, remaining quota and expiry from `GET /me/entitlements`; company billing settings show Business AI status only to the authorized tenant billing role. Checkout has `starting`, `provider redirect`, `pending confirmation`, `active`, `failed` and `expired` states driven by backend responses. A return URL only triggers a subscription status refresh. No frontend plan flag unlocks an API call.

## Cost and rollout gates

1. Approve plan feature codes, quota periods, prices/currency, trial/refund behavior, subscription owner roles, retention and consent policy. Determine which interview features are paid; current manual interview scheduling must keep working under existing permissions unless product explicitly changes it.
2. Choose payment provider and obtain sandbox credentials, webhook signing secret, legal/tax requirements and callback URLs. Design replay-safe verification and a reconciliation job for missed events.
3. Review additive migration against a fresh verified backup, existing rows and rollback plan. Apply only after explicit approval; no automatic premium grants or charges.
4. Enforce entitlement and atomic quota checks before provider/Zoom calls. Use server-side prices and a hard spend ceiling; account for concurrent requests, model/image token variability, failure refunds and expired subscriptions. Employer requests also require company RBAC; recording and generated feedback require consent and human review.
5. Test sandbox payment lifecycle, webhook forgery/replay, expiration, refund/cancel, concurrent quota requests, cross-tenant RBAC and audit. Then enable a small rollout with billing disabled by default until approved.

Reusable components: owned AI conversations, guest identity, daily usage reservation, OpenAI adapter, company RBAC, audit logs and interview sessions. New work: verified billing state, plan/entitlement policy, premium quota ledger, payment integration, consent/feedback rules and frontend subscription UX. Zoom OAuth/meeting creation remains a separate provider blocker.
