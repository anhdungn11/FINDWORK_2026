CREATE TYPE "RecruitmentEmailKind" AS ENUM ('APPLICATION_CONFIRMED', 'APPLICATION_STATUS', 'INTERVIEW_INVITATION');

CREATE TABLE "RecruitmentEmailOutbox" (
  "id" UUID NOT NULL,
  "kind" "RecruitmentEmailKind" NOT NULL,
  "applicationId" UUID NOT NULL,
  "interviewId" UUID,
  "recipientUserId" UUID NOT NULL,
  "idempotencyKey" VARCHAR(200) NOT NULL,
  "payloadCiphertext" BYTEA,
  "payloadNonce" BYTEA,
  "payloadTag" BYTEA,
  "encryptionKeyId" VARCHAR(80),
  "status" "EmailOutboxStatus" NOT NULL DEFAULT 'QUEUED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 8,
  "nextAttemptAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimedBy" VARCHAR(128),
  "leaseUntil" TIMESTAMPTZ(6),
  "providerMessageId" VARCHAR(255),
  "lastErrorCode" VARCHAR(120),
  "sentAt" TIMESTAMPTZ(6),
  "cancelledAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecruitmentEmailOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecruitmentEmailOutbox_interview_kind_check"
    CHECK (("kind" = 'INTERVIEW_INVITATION') = ("interviewId" IS NOT NULL)),
  CONSTRAINT "RecruitmentEmailOutbox_attempt_bounds_check"
    CHECK ("maxAttempts" BETWEEN 1 AND 20 AND "attemptCount" BETWEEN 0 AND "maxAttempts"),
  CONSTRAINT "RecruitmentEmailOutbox_idempotency_nonblank_check" CHECK (BTRIM("idempotencyKey") <> ''),
  CONSTRAINT "RecruitmentEmailOutbox_crypto_lifecycle_check" CHECK (
    ("status" IN ('QUEUED','PROCESSING') AND "payloadCiphertext" IS NOT NULL
      AND OCTET_LENGTH("payloadCiphertext") > 0 AND "payloadNonce" IS NOT NULL
      AND OCTET_LENGTH("payloadNonce") = 12 AND "payloadTag" IS NOT NULL
      AND OCTET_LENGTH("payloadTag") = 16 AND "encryptionKeyId" IS NOT NULL
      AND BTRIM("encryptionKeyId") <> '')
    OR ("status" IN ('SENT','FAILED','CANCELLED') AND "payloadCiphertext" IS NULL
      AND "payloadNonce" IS NULL AND "payloadTag" IS NULL AND "encryptionKeyId" IS NULL)),
  CONSTRAINT "RecruitmentEmailOutbox_claim_lifecycle_check" CHECK (
    ("status" = 'PROCESSING' AND "claimedBy" IS NOT NULL AND "leaseUntil" IS NOT NULL)
    OR ("status" <> 'PROCESSING' AND "claimedBy" IS NULL AND "leaseUntil" IS NULL)),
  CONSTRAINT "RecruitmentEmailOutbox_sent_lifecycle_check" CHECK (("status" = 'SENT') = ("sentAt" IS NOT NULL)),
  CONSTRAINT "RecruitmentEmailOutbox_cancel_lifecycle_check" CHECK (("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "RecruitmentEmailOutbox_idempotencyKey_key" ON "RecruitmentEmailOutbox"("idempotencyKey");
CREATE INDEX "RecruitmentEmailOutbox_status_nextAttemptAt_idx" ON "RecruitmentEmailOutbox"("status", "nextAttemptAt");
CREATE INDEX "RecruitmentEmailOutbox_status_leaseUntil_idx" ON "RecruitmentEmailOutbox"("status", "leaseUntil");
CREATE INDEX "RecruitmentEmailOutbox_applicationId_createdAt_idx" ON "RecruitmentEmailOutbox"("applicationId", "createdAt");
ALTER TABLE "RecruitmentEmailOutbox" ADD CONSTRAINT "RecruitmentEmailOutbox_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecruitmentEmailOutbox" ADD CONSTRAINT "RecruitmentEmailOutbox_interviewId_fkey"
  FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecruitmentEmailOutbox" ADD CONSTRAINT "RecruitmentEmailOutbox_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
