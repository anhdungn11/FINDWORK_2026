-- FINDWORK Phase 4.3C.2A — add-only schema foundation.
-- DO NOT alter the 3 historical Prisma migrations or run db push.
-- Verify current DB migration history before executing on findwork_test.
-- Email sending stays disabled until future phases wire verified delivery.
BEGIN;

CREATE TYPE "EmailOutboxKind" AS ENUM ('VERIFY_EMAIL', 'COMPANY_INVITATION');
CREATE TYPE "EmailOutboxStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

CREATE TABLE "EmailVerificationToken" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "emailNormalized" VARCHAR(320) NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "consumedAt" TIMESTAMPTZ(6),
  "revokedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailVerificationToken_expiry_after_creation_check"
    CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "EmailVerificationToken_terminal_xor_check"
    CHECK ("consumedAt" IS NULL OR "revokedAt" IS NULL),
  CONSTRAINT "EmailVerificationToken_email_nonblank_check"
    CHECK (BTRIM("emailNormalized") <> ''),
  CONSTRAINT "EmailVerificationToken_hash_format_check"
    CHECK ("tokenHash" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key"
  ON "EmailVerificationToken" ("tokenHash");
CREATE INDEX "EmailVerificationToken_userId_createdAt_idx"
  ON "EmailVerificationToken" ("userId", "createdAt");
CREATE INDEX "EmailVerificationToken_expiresAt_idx"
  ON "EmailVerificationToken" ("expiresAt");

-- Partial unique not represented in the matching Prisma 7 schema.
-- Even expired-but-still-open rows block another issue until old token revoked.
CREATE UNIQUE INDEX "EmailVerificationToken_one_open_per_user_key"
  ON "EmailVerificationToken" ("userId")
  WHERE "consumedAt" IS NULL AND "revokedAt" IS NULL;

ALTER TABLE "EmailVerificationToken"
  ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EmailOutbox" (
  "id" UUID NOT NULL,
  "kind" "EmailOutboxKind" NOT NULL,
  "verificationTokenId" UUID,
  "companyInvitationId" UUID,
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
  CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailOutbox_reference_kind_check"
    CHECK (
      ("kind" = 'VERIFY_EMAIL' AND "verificationTokenId" IS NOT NULL AND "companyInvitationId" IS NULL)
      OR
      ("kind" = 'COMPANY_INVITATION' AND "verificationTokenId" IS NULL AND "companyInvitationId" IS NOT NULL)
    ),
  CONSTRAINT "EmailOutbox_attempt_bounds_check"
    CHECK ("maxAttempts" BETWEEN 1 AND 20 AND "attemptCount" BETWEEN 0 AND "maxAttempts"),
  CONSTRAINT "EmailOutbox_idempotency_nonblank_check"
    CHECK (BTRIM("idempotencyKey") <> ''),
  CONSTRAINT "EmailOutbox_crypto_lifecycle_check"
    CHECK (
      (
        "status" IN ('QUEUED', 'PROCESSING')
        AND "payloadCiphertext" IS NOT NULL
        AND OCTET_LENGTH("payloadCiphertext") > 0
        AND "payloadNonce" IS NOT NULL
        AND OCTET_LENGTH("payloadNonce") = 12
        AND "payloadTag" IS NOT NULL
        AND OCTET_LENGTH("payloadTag") = 16
        AND "encryptionKeyId" IS NOT NULL
        AND BTRIM("encryptionKeyId") <> ''
      )
      OR
      (
        "status" IN ('SENT', 'FAILED', 'CANCELLED')
        AND "payloadCiphertext" IS NULL
        AND "payloadNonce" IS NULL
        AND "payloadTag" IS NULL
        AND "encryptionKeyId" IS NULL
      )
    ),
  CONSTRAINT "EmailOutbox_claim_lifecycle_check"
    CHECK (
      ("status" = 'PROCESSING' AND "claimedBy" IS NOT NULL AND BTRIM("claimedBy") <> '' AND "leaseUntil" IS NOT NULL)
      OR
      ("status" <> 'PROCESSING' AND "claimedBy" IS NULL AND "leaseUntil" IS NULL)
    ),
  CONSTRAINT "EmailOutbox_sent_lifecycle_check"
    CHECK (("status" = 'SENT') = ("sentAt" IS NOT NULL)),
  CONSTRAINT "EmailOutbox_cancel_lifecycle_check"
    CHECK (("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL))
);

CREATE UNIQUE INDEX "EmailOutbox_idempotencyKey_key"
  ON "EmailOutbox" ("idempotencyKey");
CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx"
  ON "EmailOutbox" ("status", "nextAttemptAt");
CREATE INDEX "EmailOutbox_status_leaseUntil_idx"
  ON "EmailOutbox" ("status", "leaseUntil");
CREATE INDEX "EmailOutbox_kind_verificationTokenId_idx"
  ON "EmailOutbox" ("kind", "verificationTokenId");
CREATE INDEX "EmailOutbox_kind_companyInvitationId_idx"
  ON "EmailOutbox" ("kind", "companyInvitationId");

ALTER TABLE "EmailOutbox"
  ADD CONSTRAINT "EmailOutbox_verificationTokenId_fkey"
  FOREIGN KEY ("verificationTokenId") REFERENCES "EmailVerificationToken"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailOutbox"
  ADD CONSTRAINT "EmailOutbox_companyInvitationId_fkey"
  FOREIGN KEY ("companyInvitationId") REFERENCES "CompanyInvitation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
