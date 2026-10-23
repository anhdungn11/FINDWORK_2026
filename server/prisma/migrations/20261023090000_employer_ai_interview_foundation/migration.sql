CREATE TYPE "LegalEvidenceKind" AS ENUM ('BUSINESS_REGISTRATION', 'TAX_CERTIFICATE', 'REPRESENTATIVE_AUTHORIZATION');
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE "InterviewSessionProvider" AS ENUM ('MANUAL', 'ZOOM');
ALTER TABLE "Company" ADD COLUMN "verificationRejectionReason" VARCHAR(1000);

CREATE TABLE "CompanyLegalProfile" (
  "companyId" UUID NOT NULL PRIMARY KEY REFERENCES "Company"("id") ON DELETE RESTRICT,
  "registeredAddress" VARCHAR(500) NOT NULL,
  "representativeName" VARCHAR(160) NOT NULL,
  "representativeTitle" VARCHAR(160),
  "contactEmail" VARCHAR(320) NOT NULL,
  "contactPhone" VARCHAR(32) NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL
);
CREATE TABLE "CompanyLegalEvidence" (
  "id" UUID NOT NULL PRIMARY KEY,
  "companyId" UUID NOT NULL REFERENCES "Company"("id") ON DELETE RESTRICT,
  "kind" "LegalEvidenceKind" NOT NULL,
  "originalName" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(100) NOT NULL,
  "byteSize" INTEGER NOT NULL CHECK ("byteSize" > 0 AND "byteSize" <= 10485760),
  "sha256" VARCHAR(64) NOT NULL,
  "storageKey" VARCHAR(512) NOT NULL,
  "uploadedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ(6)
);
CREATE INDEX "CompanyLegalEvidence_companyId_deletedAt_createdAt_idx" ON "CompanyLegalEvidence"("companyId", "deletedAt", "createdAt");

CREATE TABLE "InterviewSession" (
  "id" UUID NOT NULL PRIMARY KEY,
  "interviewId" UUID NOT NULL UNIQUE REFERENCES "Interview"("id") ON DELETE RESTRICT,
  "provider" "InterviewSessionProvider" NOT NULL DEFAULT 'MANUAL',
  "joinUrl" VARCHAR(1000),
  "externalMeetingId" VARCHAR(255),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "InterviewSession_zoom_external_id_required" CHECK ("provider" <> 'ZOOM' OR "externalMeetingId" IS NOT NULL)
);

CREATE TABLE "AiGuestSession" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tokenHash" VARCHAR(64) NOT NULL UNIQUE,
  "ipHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AiGuestSession_ipHash_createdAt_idx" ON "AiGuestSession"("ipHash", "createdAt");
CREATE TABLE "AiConversation" (
  "id" UUID NOT NULL PRIMARY KEY,
  "ownerUserId" UUID REFERENCES "User"("id") ON DELETE RESTRICT,
  "guestSessionId" UUID REFERENCES "AiGuestSession"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "AiConversation_one_owner" CHECK (("ownerUserId" IS NULL) <> ("guestSessionId" IS NULL))
);
CREATE INDEX "AiConversation_ownerUserId_createdAt_idx" ON "AiConversation"("ownerUserId", "createdAt");
CREATE INDEX "AiConversation_guestSessionId_createdAt_idx" ON "AiConversation"("guestSessionId", "createdAt");
CREATE TABLE "AiMessage" (
  "id" UUID NOT NULL PRIMARY KEY,
  "conversationId" UUID NOT NULL REFERENCES "AiConversation"("id") ON DELETE RESTRICT,
  "role" "AiMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");
CREATE TABLE "AiUsageBucket" (
  "ownerKey" VARCHAR(80) NOT NULL,
  "day" DATE NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "reservedTokens" INTEGER NOT NULL DEFAULT 0,
  "reservedCostMicros" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  PRIMARY KEY ("ownerKey", "day"),
  CONSTRAINT "AiUsageBucket_nonnegative" CHECK ("requestCount" >= 0 AND "reservedTokens" >= 0 AND "reservedCostMicros" >= 0)
);
