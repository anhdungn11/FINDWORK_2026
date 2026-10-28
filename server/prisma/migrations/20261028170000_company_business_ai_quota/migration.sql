-- Company AI accounting is separate from personal and guest AI usage.
-- Credits are generation requests; no prompt, output, CV or application content is retained.
CREATE TABLE "CompanyAiQuota" (
  "companyId" UUID NOT NULL PRIMARY KEY,
  "monthlyLimit" INTEGER NOT NULL DEFAULT 10000,
  "dailyLimit" INTEGER NOT NULL DEFAULT 1000,
  "monthlyUsed" INTEGER NOT NULL DEFAULT 0,
  "dailyUsed" INTEGER NOT NULL DEFAULT 0,
  "monthStart" DATE NOT NULL,
  "dayStart" DATE NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyAiQuota_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CompanyAiQuota_limits_check" CHECK ("monthlyLimit" BETWEEN 0 AND 10000 AND "dailyLimit" BETWEEN 0 AND 1000),
  CONSTRAINT "CompanyAiQuota_usage_check" CHECK ("monthlyUsed" >= 0 AND "dailyUsed" >= 0)
);

CREATE TABLE "CompanyAiGenerationLog" (
  "id" UUID NOT NULL PRIMARY KEY,
  "companyId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "feature" VARCHAR(50) NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "model" VARCHAR(120) NOT NULL,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyAiGenerationLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CompanyAiGenerationLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CompanyAiGenerationLog_feature_check" CHECK ("feature" IN ('DRAFT_JOB', 'IMPROVE_JOB', 'SCREENING_QUESTIONS', 'INTERVIEW_QUESTIONS', 'RECRUITMENT_PLAN')),
  CONSTRAINT "CompanyAiGenerationLog_status_check" CHECK ("status" IN ('PENDING', 'SUCCEEDED', 'FAILED')),
  CONSTRAINT "CompanyAiGenerationLog_tokens_check" CHECK ("inputTokens" >= 0 AND "outputTokens" >= 0)
);
CREATE INDEX "CompanyAiGenerationLog_companyId_createdAt_idx" ON "CompanyAiGenerationLog"("companyId", "createdAt");
CREATE INDEX "CompanyAiGenerationLog_actorUserId_createdAt_idx" ON "CompanyAiGenerationLog"("actorUserId", "createdAt");

-- Existing companies retain the CP13A denied AI capability. This only provisions counters.
INSERT INTO "CompanyAiQuota" ("companyId", "monthStart", "dayStart")
SELECT "id", date_trunc('month', NOW() AT TIME ZONE 'UTC')::date,
       (NOW() AT TIME ZONE 'UTC')::date FROM "Company"
ON CONFLICT ("companyId") DO NOTHING;
