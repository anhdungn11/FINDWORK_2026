-- FINDWORK Phase 1 PostgreSQL integrity constraints
--
-- Append this file to the Prisma-generated initial migration BEFORE the
-- migration is applied. These constraints intentionally use PostgreSQL
-- features that are not fully represented in schema.prisma (partial unique
-- indexes, CHECK constraints, and authorization triggers). Composite foreign
-- keys are modeled directly in schema.prisma so Prisma Migrate owns them.

-- ---------------------------------------------------------------------------
-- Partial uniqueness / active-record invariants
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX "CompanyMember_one_active_owner_per_company_key"
ON "CompanyMember" ("companyId")
WHERE "isOwner" = TRUE AND "status" = 'ACTIVE';

CREATE UNIQUE INDEX "Resume_one_active_default_per_candidate_key"
ON "Resume" ("candidateProfileId")
WHERE "isDefault" = TRUE AND "deletedAt" IS NULL;

CREATE UNIQUE INDEX "CompanyInvitation_one_pending_per_email_key"
ON "CompanyInvitation" ("companyId", "emailNormalized")
WHERE "status" = 'PENDING';

CREATE UNIQUE INDEX "ApplicationAssignment_one_active_assignment_key"
ON "ApplicationAssignment" ("applicationId", "companyMemberId", "assignmentType")
WHERE "removedAt" IS NULL;

CREATE UNIQUE INDEX "InterviewParticipant_one_active_participant_key"
ON "InterviewParticipant" ("interviewId", "companyMemberId")
WHERE "removedAt" IS NULL;

-- ---------------------------------------------------------------------------
-- Basic value integrity
-- ---------------------------------------------------------------------------

ALTER TABLE "AuthSession"
ADD CONSTRAINT "AuthSession_expiry_after_creation_check"
CHECK ("expiresAt" > "createdAt");

ALTER TABLE "CandidateEducation"
ADD CONSTRAINT "CandidateEducation_start_month_check"
CHECK ("startMonth" BETWEEN 1 AND 12),
ADD CONSTRAINT "CandidateEducation_end_month_check"
CHECK ("endMonth" IS NULL OR "endMonth" BETWEEN 1 AND 12),
ADD CONSTRAINT "CandidateEducation_end_date_pair_check"
CHECK (("endMonth" IS NULL) = ("endYear" IS NULL)),
ADD CONSTRAINT "CandidateEducation_end_not_before_start_check"
CHECK (
  "endYear" IS NULL
  OR "endYear" > "startYear"
  OR ("endYear" = "startYear" AND "endMonth" >= "startMonth")
),
ADD CONSTRAINT "CandidateEducation_studying_end_date_check"
CHECK (NOT "isStudying" OR ("endMonth" IS NULL AND "endYear" IS NULL)),
ADD CONSTRAINT "CandidateEducation_gpa_nonnegative_check"
CHECK ("gpa" IS NULL OR "gpa" >= 0),
ADD CONSTRAINT "CandidateEducation_gpa_scale_positive_check"
CHECK ("gpaScale" IS NULL OR "gpaScale" > 0),
ADD CONSTRAINT "CandidateEducation_gpa_within_scale_check"
CHECK ("gpa" IS NULL OR "gpaScale" IS NULL OR "gpa" <= "gpaScale");

ALTER TABLE "CandidateExperience"
ADD CONSTRAINT "CandidateExperience_start_month_check"
CHECK ("startMonth" BETWEEN 1 AND 12),
ADD CONSTRAINT "CandidateExperience_end_month_check"
CHECK ("endMonth" IS NULL OR "endMonth" BETWEEN 1 AND 12),
ADD CONSTRAINT "CandidateExperience_end_date_pair_check"
CHECK (("endMonth" IS NULL) = ("endYear" IS NULL)),
ADD CONSTRAINT "CandidateExperience_end_not_before_start_check"
CHECK (
  "endYear" IS NULL
  OR "endYear" > "startYear"
  OR ("endYear" = "startYear" AND "endMonth" >= "startMonth")
),
ADD CONSTRAINT "CandidateExperience_current_end_date_check"
CHECK (NOT "isCurrent" OR ("endMonth" IS NULL AND "endYear" IS NULL));

ALTER TABLE "CandidateSkill"
ADD CONSTRAINT "CandidateSkill_source_xor_check"
CHECK (("skillId" IS NOT NULL) <> ("customSkillName" IS NOT NULL)),
ADD CONSTRAINT "CandidateSkill_years_nonnegative_check"
CHECK ("yearsOfExperience" IS NULL OR "yearsOfExperience" >= 0);

ALTER TABLE "CandidateLanguage"
ADD CONSTRAINT "CandidateLanguage_source_xor_check"
CHECK (("languageId" IS NOT NULL) <> ("customLanguageName" IS NOT NULL));

ALTER TABLE "CandidateLanguageCertificate"
ADD CONSTRAINT "CandidateLanguageCertificate_source_xor_check"
CHECK (("certificateTypeId" IS NOT NULL) <> ("customCertificateName" IS NOT NULL)),
ADD CONSTRAINT "CandidateLanguageCertificate_expiry_check"
CHECK ("issuedDate" IS NULL OR "expiryDate" IS NULL OR "expiryDate" >= "issuedDate");

ALTER TABLE "CandidateCareerPreference"
ADD CONSTRAINT "CandidateCareerPreference_salary_min_check"
CHECK ("salaryMin" IS NULL OR "salaryMin" >= 0),
ADD CONSTRAINT "CandidateCareerPreference_salary_max_check"
CHECK ("salaryMax" IS NULL OR "salaryMax" >= 0),
ADD CONSTRAINT "CandidateCareerPreference_salary_range_check"
CHECK ("salaryMin" IS NULL OR "salaryMax" IS NULL OR "salaryMin" <= "salaryMax"),
ADD CONSTRAINT "CandidateCareerPreference_availability_date_check"
CHECK (
  CASE
    WHEN "availabilityType" IS NULL THEN "availableFrom" IS NULL
    WHEN "availabilityType" = 'IMMEDIATELY' THEN "availableFrom" IS NULL
    WHEN "availabilityType" = 'SPECIFIC_DATE' THEN "availableFrom" IS NOT NULL
    ELSE FALSE
  END
);

ALTER TABLE "ResumeVersion"
ADD CONSTRAINT "ResumeVersion_version_positive_check"
CHECK ("versionNumber" > 0),
ADD CONSTRAINT "ResumeVersion_file_size_nonnegative_check"
CHECK ("fileSize" IS NULL OR "fileSize" >= 0);

ALTER TABLE "CompanyInvitation"
ADD CONSTRAINT "CompanyInvitation_expiry_after_creation_check"
CHECK ("expiresAt" > "createdAt");

ALTER TABLE "CompanyMember"
ADD CONSTRAINT "CompanyMember_owner_must_be_active_check"
CHECK (NOT "isOwner" OR "status" = 'ACTIVE'),
ADD CONSTRAINT "CompanyMember_removed_timestamp_check"
CHECK (
  ("status" = 'REMOVED' AND "removedAt" IS NOT NULL)
  OR ("status" <> 'REMOVED' AND "removedAt" IS NULL)
);

ALTER TABLE "Job"
ADD CONSTRAINT "Job_experience_min_check"
CHECK ("experienceMinMonths" IS NULL OR "experienceMinMonths" >= 0),
ADD CONSTRAINT "Job_experience_max_check"
CHECK ("experienceMaxMonths" IS NULL OR "experienceMaxMonths" >= 0),
ADD CONSTRAINT "Job_experience_range_check"
CHECK (
  "experienceMinMonths" IS NULL OR
  "experienceMaxMonths" IS NULL OR
  "experienceMinMonths" <= "experienceMaxMonths"
),
ADD CONSTRAINT "Job_salary_min_check"
CHECK ("salaryMin" IS NULL OR "salaryMin" >= 0),
ADD CONSTRAINT "Job_salary_max_check"
CHECK ("salaryMax" IS NULL OR "salaryMax" >= 0),
ADD CONSTRAINT "Job_salary_range_check"
CHECK ("salaryMin" IS NULL OR "salaryMax" IS NULL OR "salaryMin" <= "salaryMax"),
ADD CONSTRAINT "Job_version_positive_check"
CHECK ("version" > 0),
ADD CONSTRAINT "Job_published_timestamp_check"
CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL),
ADD CONSTRAINT "Job_expiry_after_publish_check"
CHECK ("publishedAt" IS NULL OR "expiresAt" IS NULL OR "expiresAt" > "publishedAt");

ALTER TABLE "JobSkill"
ADD CONSTRAINT "JobSkill_source_xor_check"
CHECK (("skillId" IS NOT NULL) <> ("customSkillName" IS NOT NULL));

ALTER TABLE "Application"
ADD CONSTRAINT "Application_version_positive_check"
CHECK ("version" > 0),
ADD CONSTRAINT "Application_submission_timestamp_check"
CHECK (
  ("status" = 'DRAFT' AND "submittedAt" IS NULL)
  OR
  ("status" <> 'DRAFT' AND "submittedAt" IS NOT NULL)
),
ADD CONSTRAINT "Application_submitted_snapshot_check"
CHECK (
  "status" = 'DRAFT'
  OR (
    "fullNameSnapshot" IS NOT NULL
    AND "emailSnapshot" IS NOT NULL
    AND "phoneSnapshot" IS NOT NULL
    AND "availability" IS NOT NULL
    AND "preferredContactMethod" IS NOT NULL
    AND "jobSnapshot" IS NOT NULL
  )
);

ALTER TABLE "Interview"
ADD CONSTRAINT "Interview_duration_positive_check"
CHECK ("durationMinutes" > 0);

ALTER TABLE "Role"
ADD CONSTRAINT "Role_kind_context_check"
CHECK (
  ("kind" = 'SYSTEM' AND "companyId" IS NULL AND "systemCode" IS NOT NULL)
  OR
  ("kind" = 'COMPANY' AND "companyId" IS NOT NULL AND "systemCode" IS NULL)
);

ALTER TABLE "SystemUserPermission"
ADD CONSTRAINT "SystemUserPermission_effect_scope_check"
CHECK (
  ("effect" = 'ALLOW' AND "dataScope" IS NOT NULL AND "dataScope" IN ('OWN', 'SYSTEM'))
  OR
  ("effect" = 'DENY' AND "dataScope" IS NULL)
);

ALTER TABLE "CompanyMemberPermission"
ADD CONSTRAINT "CompanyMemberPermission_effect_scope_check"
CHECK (
  ("effect" = 'ALLOW' AND "dataScope" IS NOT NULL AND "dataScope" IN ('ASSIGNED', 'COMPANY'))
  OR
  ("effect" = 'DENY' AND "dataScope" IS NULL)
);

-- ---------------------------------------------------------------------------
-- Location integrity: if both province and ward are supplied, the ward must
-- belong to the selected province.
-- ---------------------------------------------------------------------------

ALTER TABLE "CandidateProfile"
ADD CONSTRAINT "CandidateProfile_ward_requires_province_check"
CHECK ("wardId" IS NULL OR "provinceId" IS NOT NULL);

ALTER TABLE "Company"
ADD CONSTRAINT "Company_ward_requires_province_check"
CHECK ("wardId" IS NULL OR "provinceId" IS NOT NULL);

ALTER TABLE "Job"
ADD CONSTRAINT "Job_ward_requires_province_check"
CHECK ("wardId" IS NULL OR "provinceId" IS NOT NULL);

-- Composite location / tenant / ownership foreign keys are intentionally
-- NOT duplicated here. They are declared in schema.prisma with named
-- multi-field @relation mappings so Prisma Migrate can manage them without
-- generating follow-up migrations that drop them.

-- ---------------------------------------------------------------------------
-- Authorization context integrity
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "findwork_enforce_role_permission_scope"()
RETURNS TRIGGER AS $$
DECLARE
  role_kind TEXT;
BEGIN
  SELECT "kind"::text INTO role_kind
  FROM "Role"
  WHERE "id" = NEW."roleId";

  IF role_kind = 'SYSTEM' AND NEW."dataScope" NOT IN ('OWN', 'SYSTEM') THEN
    RAISE EXCEPTION 'SYSTEM roles may only use OWN or SYSTEM data scopes';
  END IF;

  IF role_kind = 'COMPANY' AND NEW."dataScope" NOT IN ('ASSIGNED', 'COMPANY') THEN
    RAISE EXCEPTION 'COMPANY roles may only use ASSIGNED or COMPANY data scopes';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RolePermission_scope_matches_role_kind_trg"
BEFORE INSERT OR UPDATE OF "roleId", "dataScope" ON "RolePermission"
FOR EACH ROW
EXECUTE FUNCTION "findwork_enforce_role_permission_scope"();

CREATE OR REPLACE FUNCTION "findwork_enforce_system_user_role_kind"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "Role"
    WHERE "id" = NEW."roleId"
      AND "kind" = 'SYSTEM'
  ) THEN
    RAISE EXCEPTION 'SystemUserRole may only reference SYSTEM roles';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SystemUserRole_system_role_only_trg"
BEFORE INSERT OR UPDATE OF "roleId" ON "SystemUserRole"
FOR EACH ROW
EXECUTE FUNCTION "findwork_enforce_system_user_role_kind"();

-- ---------------------------------------------------------------------------
-- Notes intentionally left to business services rather than SQL CHECKs:
-- - every active Company must have exactly one owner (partial uniqueness only
--   enforces "at most one"; create/transfer ownership must be transactional),
-- - Application status transition rules,
-- - required screening answers and answer type/options,
-- - privacy rules for employer access to candidate profiles,
-- - permission delegation / anti-privilege-escalation beyond role/scope context,
-- - immutable permission-code semantics and higher-level authorization policy.
-- ---------------------------------------------------------------------------
