CREATE TABLE "PasswordResetToken" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "emailNormalized" VARCHAR(320) NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "consumedAt" TIMESTAMPTZ(6),
  "revokedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_terminal_xor_check" CHECK ("consumedAt" IS NULL OR "revokedAt" IS NULL),
  CONSTRAINT "PasswordResetToken_email_nonblank_check" CHECK (BTRIM("emailNormalized") <> ''),
  CONSTRAINT "PasswordResetToken_hash_format_check" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE UNIQUE INDEX "PasswordResetToken_one_open_per_user_key" ON "PasswordResetToken"("userId")
  WHERE "consumedAt" IS NULL AND "revokedAt" IS NULL;
CREATE INDEX "PasswordResetToken_userId_createdAt_idx" ON "PasswordResetToken"("userId", "createdAt");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PasswordResetOutbox" (
  "id" UUID NOT NULL,
  "tokenId" UUID NOT NULL,
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
  CONSTRAINT "PasswordResetOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetOutbox_attempt_bounds_check"
    CHECK ("maxAttempts" BETWEEN 1 AND 20 AND "attemptCount" BETWEEN 0 AND "maxAttempts"),
  CONSTRAINT "PasswordResetOutbox_idempotency_nonblank_check" CHECK (BTRIM("idempotencyKey") <> ''),
  CONSTRAINT "PasswordResetOutbox_crypto_lifecycle_check" CHECK (
    ("status" IN ('QUEUED','PROCESSING') AND "payloadCiphertext" IS NOT NULL
      AND OCTET_LENGTH("payloadCiphertext") > 0 AND "payloadNonce" IS NOT NULL
      AND OCTET_LENGTH("payloadNonce") = 12 AND "payloadTag" IS NOT NULL
      AND OCTET_LENGTH("payloadTag") = 16 AND "encryptionKeyId" IS NOT NULL
      AND BTRIM("encryptionKeyId") <> '')
    OR ("status" IN ('SENT','FAILED','CANCELLED') AND "payloadCiphertext" IS NULL
      AND "payloadNonce" IS NULL AND "payloadTag" IS NULL AND "encryptionKeyId" IS NULL)),
  CONSTRAINT "PasswordResetOutbox_claim_lifecycle_check" CHECK (
    ("status" = 'PROCESSING' AND "claimedBy" IS NOT NULL AND "leaseUntil" IS NOT NULL)
    OR ("status" <> 'PROCESSING' AND "claimedBy" IS NULL AND "leaseUntil" IS NULL)),
  CONSTRAINT "PasswordResetOutbox_sent_lifecycle_check" CHECK (("status" = 'SENT') = ("sentAt" IS NOT NULL)),
  CONSTRAINT "PasswordResetOutbox_cancel_lifecycle_check" CHECK (("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "PasswordResetOutbox_tokenId_key" ON "PasswordResetOutbox"("tokenId");
CREATE UNIQUE INDEX "PasswordResetOutbox_idempotencyKey_key" ON "PasswordResetOutbox"("idempotencyKey");
CREATE INDEX "PasswordResetOutbox_status_nextAttemptAt_idx" ON "PasswordResetOutbox"("status", "nextAttemptAt");
CREATE INDEX "PasswordResetOutbox_status_leaseUntil_idx" ON "PasswordResetOutbox"("status", "leaseUntil");
ALTER TABLE "PasswordResetOutbox" ADD CONSTRAINT "PasswordResetOutbox_tokenId_fkey"
  FOREIGN KEY ("tokenId") REFERENCES "PasswordResetToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
