-- Additive table; an absent row is always denied by the application.
CREATE TABLE "CompanyPlatformCapability" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "capabilityCode" VARCHAR(64) NOT NULL,
  "isGranted" BOOLEAN NOT NULL DEFAULT false,
  "grantedAt" TIMESTAMPTZ(6),
  "revokedAt" TIMESTAMPTZ(6),
  "changedByUserId" UUID,
  "reason" VARCHAR(500),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyPlatformCapability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompanyPlatformCapability_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CompanyPlatformCapability_code_check" CHECK ("capabilityCode" IN (
    'job.draft.create', 'job.draft.edit', 'job.publish', 'job.close',
    'application.view', 'application.pipeline.manage', 'interview.schedule',
    'team.invite', 'recruitment.analytics.view', 'ai.business.access'))
);
CREATE UNIQUE INDEX "CompanyPlatformCapability_companyId_capabilityCode_key"
  ON "CompanyPlatformCapability"("companyId", "capabilityCode");
CREATE INDEX "CompanyPlatformCapability_companyId_isGranted_idx"
  ON "CompanyPlatformCapability"("companyId", "isGranted");

-- Reviewed compatibility policy: existing companies keep the eight already
-- operating workflows, subject to member RBAC and company status. Publishing
-- remains separate from verification. Unimplemented business
-- analytics and business AI start denied. This insert runs only for companies
-- present when the migration is applied; future companies use application defaults.
INSERT INTO "CompanyPlatformCapability"
  ("id", "companyId", "capabilityCode", "isGranted", "grantedAt", "reason")
SELECT gen_random_uuid(), c."id", codes.code, codes.supported,
  CASE WHEN codes.supported THEN CURRENT_TIMESTAMP ELSE NULL END,
  'CP13 existing-company compatibility backfill'
FROM "Company" c
CROSS JOIN (VALUES
  ('job.draft.create', true), ('job.draft.edit', true), ('job.publish', true),
  ('job.close', true), ('application.view', true),
  ('application.pipeline.manage', true), ('interview.schedule', true),
  ('team.invite', true), ('recruitment.analytics.view', false),
  ('ai.business.access', false)
) AS codes(code, supported)
ON CONFLICT ("companyId", "capabilityCode") DO NOTHING;
