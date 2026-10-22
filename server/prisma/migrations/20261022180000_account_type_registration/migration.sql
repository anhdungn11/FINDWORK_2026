-- Additive only. Existing users remain NULL and are interpreted as
-- LEGACY_UNCLASSIFIED by the application. No existing row is reclassified.
CREATE TYPE "AccountType" AS ENUM ('CANDIDATE', 'EMPLOYER', 'LEGACY_UNCLASSIFIED');
ALTER TABLE "User" ADD COLUMN "accountType" "AccountType";
