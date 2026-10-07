/*
  Phase 4.0 domain alignment.

  Safety notes:
  - This migration intentionally requires Company and Job to be empty because it replaces
    legacy inline location columns with normalized location tables and adds required Company
    identity columns that cannot be derived safely for existing rows.
  - DEV and TEST were audited before creation and both had 0 Company / 0 Job rows.
  - CandidatePrivacySetting searchableProfile is reset to false because the previous default
    was incorrect for the approved privacy baseline and there was no public consent flow yet.
*/

-- Fail fast instead of silently dropping legacy Company/Job location data.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Company" LIMIT 1) THEN
    RAISE EXCEPTION 'phase4_domain_alignment requires an empty Company table';
  END IF;

  IF EXISTS (SELECT 1 FROM "Job" LIMIT 1) THEN
    RAISE EXCEPTION 'phase4_domain_alignment requires an empty Job table';
  END IF;
END
$$;

-- CreateEnum
CREATE TYPE "CandidateCareerStatus" AS ENUM (
  'STUDENT',
  'INTERN',
  'LOOKING_FOR_JOB',
  'EMPLOYED',
  'UNEMPLOYED',
  'FREELANCER',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "CompanyVerificationStatus" AS ENUM (
  'UNVERIFIED',
  'PENDING',
  'VERIFIED',
  'REJECTED'
);

-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'EXPIRED';

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_provinceId_fkey";

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_ward_same_province_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_provinceId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_ward_same_province_fkey";

-- DropIndex
DROP INDEX "Company_provinceId_idx";

-- DropIndex
DROP INDEX "Job_provinceId_status_publishedAt_idx";

-- Privacy baseline is fail-closed.
UPDATE "CandidatePrivacySetting"
SET "searchableProfile" = FALSE
WHERE "searchableProfile" = TRUE;

-- AlterTable
ALTER TABLE "CandidatePrivacySetting"
ALTER COLUMN "searchableProfile" SET DEFAULT false;

-- AlterTable
ALTER TABLE "CandidateProfile"
ADD COLUMN "careerStatus" "CandidateCareerStatus";

-- AlterTable
ALTER TABLE "Company"
DROP COLUMN "addressLine",
DROP COLUMN "countryCode",
DROP COLUMN "provinceId",
DROP COLUMN "wardId",
ADD COLUMN "createdByUserId" UUID NOT NULL,
ADD COLUMN "legalName" VARCHAR(220),
ADD COLUMN "slug" VARCHAR(220) NOT NULL,
ADD COLUMN "taxCode" VARCHAR(80),
ADD COLUMN "verificationStatus" "CompanyVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN "verifiedAt" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "Job"
DROP COLUMN "addressLine",
DROP COLUMN "countryCode",
DROP COLUMN "provinceId",
DROP COLUMN "wardId",
ADD COLUMN "applicationDeadline" TIMESTAMPTZ(6),
ADD COLUMN "showSalary" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CompanyLocation" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "countryCode" VARCHAR(2),
    "provinceId" UUID,
    "wardId" UUID,
    "addressLine" VARCHAR(255),
    "isHeadquarters" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CompanyLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLocation" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "countryCode" VARCHAR(2),
    "provinceId" UUID,
    "wardId" UUID,
    "addressLine" VARCHAR(255),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "JobLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyLocation_companyId_idx"
ON "CompanyLocation"("companyId");

-- CreateIndex
CREATE INDEX "CompanyLocation_provinceId_idx"
ON "CompanyLocation"("provinceId");

-- CreateIndex
CREATE INDEX "CompanyLocation_wardId_idx"
ON "CompanyLocation"("wardId");

-- At most one headquarters location per company.
CREATE UNIQUE INDEX "CompanyLocation_one_headquarters_per_company_key"
ON "CompanyLocation"("companyId")
WHERE "isHeadquarters" = TRUE;

-- CreateIndex
CREATE INDEX "JobLocation_jobId_idx"
ON "JobLocation"("jobId");

-- CreateIndex
CREATE INDEX "JobLocation_provinceId_idx"
ON "JobLocation"("provinceId");

-- CreateIndex
CREATE INDEX "JobLocation_wardId_idx"
ON "JobLocation"("wardId");

-- At most one primary location per job.
CREATE UNIQUE INDEX "JobLocation_one_primary_per_job_key"
ON "JobLocation"("jobId")
WHERE "isPrimary" = TRUE;

-- CreateIndex
CREATE INDEX "CandidateProfile_careerStatus_idx"
ON "CandidateProfile"("careerStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key"
ON "Company"("slug");

-- Tax code is unique among non-archived companies when supplied.
CREATE UNIQUE INDEX "Company_taxCode_non_archived_key"
ON "Company"("taxCode")
WHERE "taxCode" IS NOT NULL
  AND "status" <> 'ARCHIVED';

-- CreateIndex
CREATE INDEX "Company_createdByUserId_idx"
ON "Company"("createdByUserId");

-- CreateIndex
CREATE INDEX "Company_verificationStatus_idx"
ON "Company"("verificationStatus");

-- CreateIndex
CREATE INDEX "Job_status_applicationDeadline_idx"
ON "Job"("status", "applicationDeadline");

-- CreateIndex
CREATE INDEX "Job_expiresAt_idx"
ON "Job"("expiresAt");

-- Location integrity.
ALTER TABLE "CompanyLocation"
ADD CONSTRAINT "CompanyLocation_ward_requires_province_check"
CHECK ("wardId" IS NULL OR "provinceId" IS NOT NULL),
ADD CONSTRAINT "CompanyLocation_nonempty_check"
CHECK (
  BTRIM(COALESCE("countryCode", '')) <> ''
  OR "provinceId" IS NOT NULL
  OR "wardId" IS NOT NULL
  OR BTRIM(COALESCE("addressLine", '')) <> ''
);

ALTER TABLE "JobLocation"
ADD CONSTRAINT "JobLocation_ward_requires_province_check"
CHECK ("wardId" IS NULL OR "provinceId" IS NOT NULL),
ADD CONSTRAINT "JobLocation_nonempty_check"
CHECK (
  BTRIM(COALESCE("countryCode", '')) <> ''
  OR "provinceId" IS NOT NULL
  OR "wardId" IS NOT NULL
  OR BTRIM(COALESCE("addressLine", '')) <> ''
);

-- Company identity sanity checks. Normalization itself is enforced in the service layer.
ALTER TABLE "Company"
ADD CONSTRAINT "Company_slug_nonblank_check"
CHECK (BTRIM("slug") <> ''),
ADD CONSTRAINT "Company_taxCode_nonblank_check"
CHECK ("taxCode" IS NULL OR BTRIM("taxCode") <> '');

-- Job temporal integrity. Publish-time completeness remains a service-level validation.
ALTER TABLE "Job"
ADD CONSTRAINT "Job_application_deadline_after_publish_check"
CHECK (
  "publishedAt" IS NULL
  OR "applicationDeadline" IS NULL
  OR "applicationDeadline" > "publishedAt"
),
ADD CONSTRAINT "Job_expiry_not_before_application_deadline_check"
CHECK (
  "expiresAt" IS NULL
  OR "applicationDeadline" IS NULL
  OR "expiresAt" >= "applicationDeadline"
);

-- AddForeignKey
ALTER TABLE "Company"
ADD CONSTRAINT "Company_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLocation"
ADD CONSTRAINT "CompanyLocation_companyId_fkey"
FOREIGN KEY ("companyId")
REFERENCES "Company"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLocation"
ADD CONSTRAINT "CompanyLocation_provinceId_fkey"
FOREIGN KEY ("provinceId")
REFERENCES "Province"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLocation"
ADD CONSTRAINT "CompanyLocation_ward_same_province_fkey"
FOREIGN KEY ("provinceId", "wardId")
REFERENCES "Ward"("provinceId", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLocation"
ADD CONSTRAINT "JobLocation_jobId_fkey"
FOREIGN KEY ("jobId")
REFERENCES "Job"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLocation"
ADD CONSTRAINT "JobLocation_provinceId_fkey"
FOREIGN KEY ("provinceId")
REFERENCES "Province"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLocation"
ADD CONSTRAINT "JobLocation_ward_same_province_fkey"
FOREIGN KEY ("provinceId", "wardId")
REFERENCES "Ward"("provinceId", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
