-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'FREELANCE', 'TEMPORARY', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "WorkplaceType" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "CareerLevel" AS ENUM ('INTERN', 'FRESHER', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER');

-- CreateEnum
CREATE TYPE "LocationPreferenceMode" AS ENUM ('SELECTED', 'NATIONWIDE');

-- CreateEnum
CREATE TYPE "SalaryExpectationType" AS ENUM ('RANGE', 'NEGOTIABLE', 'NOT_IMPORTANT');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('IMMEDIATELY', 'SPECIFIC_DATE');

-- CreateEnum
CREATE TYPE "LanguageProficiency" AS ENUM ('BASIC', 'CONVERSATIONAL', 'PROFESSIONAL', 'FLUENT', 'NATIVE');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFICIENT', 'EXPERT');

-- CreateEnum
CREATE TYPE "ResumeSourceType" AS ENUM ('UPLOADED', 'BUILDER');

-- CreateEnum
CREATE TYPE "ResumeStatus" AS ENUM ('READY', 'UPLOADING', 'FAILED');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CompanyMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "CompanyInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SalaryPeriod" AS ENUM ('HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ApplicationAvailability" AS ENUM ('IMMEDIATELY', 'WITHIN_1_WEEK', 'WITHIN_2_WEEKS', 'WITHIN_1_MONTH', 'NEGOTIABLE');

-- CreateEnum
CREATE TYPE "ApplicationContactMethod" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "ScreeningQuestionType" AS ENUM ('TEXT', 'TEXTAREA', 'YES_NO', 'SELECT');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('ONSITE', 'PHONE', 'VIDEO');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "InterviewParticipantRole" AS ENUM ('INTERVIEWER', 'HIRING_MANAGER', 'OBSERVER');

-- CreateEnum
CREATE TYPE "RoleKind" AS ENUM ('SYSTEM', 'COMPANY');

-- CreateEnum
CREATE TYPE "PermissionEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "DataScope" AS ENUM ('OWN', 'ASSIGNED', 'COMPANY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('PRIMARY_RECRUITER', 'REVIEWER', 'INTERVIEWER');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "emailNormalized" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "lastUsedAt" TIMESTAMPTZ(6),
    "userAgent" TEXT,
    "ipAddress" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fullName" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(32),
    "dateOfBirth" DATE,
    "gender" "Gender",
    "countryCode" VARCHAR(2),
    "provinceId" UUID,
    "wardId" UUID,
    "addressLine" VARCHAR(255),
    "bio" TEXT,
    "avatarAssetKey" VARCHAR(512),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEducation" (
    "id" UUID NOT NULL,
    "candidateProfileId" UUID NOT NULL,
    "school" VARCHAR(255) NOT NULL,
    "degree" VARCHAR(160) NOT NULL,
    "major" VARCHAR(160) NOT NULL,
    "location" VARCHAR(255),
    "startMonth" INTEGER NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endMonth" INTEGER,
    "endYear" INTEGER,
    "isStudying" BOOLEAN NOT NULL DEFAULT false,
    "gpa" DECIMAL(7,3),
    "gpaScale" DECIMAL(7,3),
    "achievements" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CandidateEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateExperience" (
    "id" UUID NOT NULL,
    "candidateProfileId" UUID NOT NULL,
    "companyName" VARCHAR(255) NOT NULL,
    "position" VARCHAR(180) NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "workplaceType" "WorkplaceType" NOT NULL,
    "location" VARCHAR(255),
    "startMonth" INTEGER NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endMonth" INTEGER,
    "endYear" INTEGER,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "achievements" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CandidateExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateExperienceSkill" (
    "id" UUID NOT NULL,
    "experienceId" UUID NOT NULL,
    "skillId" UUID,
    "skillName" VARCHAR(160) NOT NULL,

    CONSTRAINT "CandidateExperienceSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSkill" (
    "id" UUID NOT NULL,
    "candidateProfileId" UUID NOT NULL,
    "skillId" UUID,
    "customSkillName" VARCHAR(160),
    "level" "SkillLevel" NOT NULL,
    "yearsOfExperience" DECIMAL(5,2),
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateLanguage" (
    "id" UUID NOT NULL,
    "candidateProfileId" UUID NOT NULL,
    "languageId" UUID,
    "customLanguageName" VARCHAR(160),
    "overallLevel" "LanguageProficiency" NOT NULL,
    "listeningLevel" "LanguageProficiency" NOT NULL,
    "speakingLevel" "LanguageProficiency" NOT NULL,
    "readingLevel" "LanguageProficiency" NOT NULL,
    "writingLevel" "LanguageProficiency" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CandidateLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateLanguageCertificate" (
    "id" UUID NOT NULL,
    "candidateLanguageId" UUID NOT NULL,
    "certificateTypeId" UUID,
    "customCertificateName" VARCHAR(180),
    "level" VARCHAR(120),
    "overallScore" VARCHAR(80),
    "scores" JSONB,
    "issuedDate" DATE,
    "expiryDate" DATE,
    "issuer" VARCHAR(180),
    "credentialId" VARCHAR(180),
    "verificationUrl" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CandidateLanguageCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateCareerPreference" (
    "id" UUID NOT NULL,
    "candidateProfileId" UUID NOT NULL,
    "locationMode" "LocationPreferenceMode" NOT NULL,
    "salaryType" "SalaryExpectationType" NOT NULL,
    "salaryMin" DECIMAL(19,2),
    "salaryMax" DECIMAL(19,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
    "salaryPeriod" "SalaryPeriod" NOT NULL DEFAULT 'MONTH',
    "desiredCareerLevel" "CareerLevel",
    "availabilityType" "AvailabilityType",
    "availableFrom" DATE,
    "willingToRelocate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CandidateCareerPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateDesiredPosition" (
    "id" UUID NOT NULL,
    "careerPreferenceId" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CandidateDesiredPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatePreferredCategory" (
    "careerPreferenceId" UUID NOT NULL,
    "jobCategoryId" UUID NOT NULL,

    CONSTRAINT "CandidatePreferredCategory_pkey" PRIMARY KEY ("careerPreferenceId","jobCategoryId")
);

-- CreateTable
CREATE TABLE "CandidatePreferredLocation" (
    "careerPreferenceId" UUID NOT NULL,
    "provinceId" UUID NOT NULL,

    CONSTRAINT "CandidatePreferredLocation_pkey" PRIMARY KEY ("careerPreferenceId","provinceId")
);

-- CreateTable
CREATE TABLE "CandidatePreferredEmploymentType" (
    "careerPreferenceId" UUID NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,

    CONSTRAINT "CandidatePreferredEmploymentType_pkey" PRIMARY KEY ("careerPreferenceId","employmentType")
);

-- CreateTable
CREATE TABLE "CandidatePreferredWorkplaceType" (
    "careerPreferenceId" UUID NOT NULL,
    "workplaceType" "WorkplaceType" NOT NULL,

    CONSTRAINT "CandidatePreferredWorkplaceType_pkey" PRIMARY KEY ("careerPreferenceId","workplaceType")
);

-- CreateTable
CREATE TABLE "CandidatePrivacySetting" (
    "candidateProfileId" UUID NOT NULL,
    "searchableProfile" BOOLEAN NOT NULL DEFAULT true,
    "showEmail" BOOLEAN NOT NULL DEFAULT false,
    "showPhone" BOOLEAN NOT NULL DEFAULT false,
    "allowResumeDownload" BOOLEAN NOT NULL DEFAULT false,
    "allowJobMatching" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CandidatePrivacySetting_pkey" PRIMARY KEY ("candidateProfileId")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" UUID NOT NULL,
    "candidateProfileId" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "sourceType" "ResumeSourceType" NOT NULL,
    "status" "ResumeStatus" NOT NULL DEFAULT 'READY',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileOriginalName" VARCHAR(255),
    "fileMimeType" VARCHAR(120),
    "fileSize" INTEGER,
    "fileStorageKey" VARCHAR(512),
    "templateCode" VARCHAR(80),
    "builderContent" JSONB,
    "builderSettings" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "industryId" UUID,
    "description" TEXT,
    "website" VARCHAR(1000),
    "employeeSizeRange" VARCHAR(120),
    "foundedYear" INTEGER,
    "countryCode" VARCHAR(2),
    "provinceId" UUID,
    "wardId" UUID,
    "addressLine" VARCHAR(255),
    "logoAssetKey" VARCHAR(512),
    "coverAssetKey" VARCHAR(512),
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMember" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "CompanyMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyInvitation" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "emailNormalized" VARCHAR(320) NOT NULL,
    "invitedByMemberId" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "status" "CompanyInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "createdByMemberId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "title" VARCHAR(220) NOT NULL,
    "description" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "workplaceType" "WorkplaceType" NOT NULL,
    "countryCode" VARCHAR(2),
    "provinceId" UUID,
    "wardId" UUID,
    "addressLine" VARCHAR(255),
    "experienceMinMonths" INTEGER,
    "experienceMaxMonths" INTEGER,
    "salaryMin" DECIMAL(19,2),
    "salaryMax" DECIMAL(19,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
    "salaryPeriod" "SalaryPeriod" NOT NULL DEFAULT 'MONTH',
    "salaryNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSkill" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "skillId" UUID,
    "customSkillName" VARCHAR(160),
    "requirementLevel" "SkillLevel",
    "isRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "JobSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningQuestion" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "type" "ScreeningQuestionType" NOT NULL,
    "label" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ScreeningQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "candidateProfileId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "resumeVersionId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "fullNameSnapshot" VARCHAR(160),
    "emailSnapshot" VARCHAR(320),
    "phoneSnapshot" VARCHAR(32),
    "currentLocationSnapshot" VARCHAR(255),
    "availability" "ApplicationAvailability",
    "preferredContactMethod" "ApplicationContactMethod",
    "coverLetter" TEXT,
    "jobSnapshot" JSONB,
    "submittedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationAnswer" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "screeningQuestionId" UUID NOT NULL,
    "questionSnapshot" JSONB NOT NULL,
    "answerValue" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ApplicationAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusHistory" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus" NOT NULL,
    "changedByUserId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationAssignment" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "companyMemberId" UUID NOT NULL,
    "assignmentType" "AssignmentType" NOT NULL,
    "assignedByMemberId" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMPTZ(6),

    CONSTRAINT "ApplicationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "scheduledAt" TIMESTAMPTZ(6) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "type" "InterviewType" NOT NULL,
    "location" VARCHAR(255),
    "meetingUrl" VARCHAR(1000),
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdByMemberId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewParticipant" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "companyMemberId" UUID NOT NULL,
    "participantRole" "InterviewParticipantRole" NOT NULL DEFAULT 'INTERVIEWER',
    "addedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMPTZ(6),

    CONSTRAINT "InterviewParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "code" VARCHAR(160) NOT NULL,
    "resource" VARCHAR(80) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "kind" "RoleKind" NOT NULL,
    "companyId" UUID,
    "systemCode" VARCHAR(100),
    "name" VARCHAR(160) NOT NULL,
    "normalizedName" VARCHAR(160) NOT NULL,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "dataScope" "DataScope" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "SystemUserRole" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemUserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "CompanyMemberRole" (
    "companyId" UUID NOT NULL,
    "companyMemberId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMemberRole_pkey" PRIMARY KEY ("companyMemberId","roleId")
);

-- CreateTable
CREATE TABLE "SystemUserPermission" (
    "userId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "effect" "PermissionEffect" NOT NULL,
    "dataScope" "DataScope",
    "assignedByUserId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SystemUserPermission_pkey" PRIMARY KEY ("userId","permissionId")
);

-- CreateTable
CREATE TABLE "CompanyMemberPermission" (
    "companyId" UUID NOT NULL,
    "companyMemberId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "effect" "PermissionEffect" NOT NULL,
    "dataScope" "DataScope",
    "assignedByUserId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CompanyMemberPermission_pkey" PRIMARY KEY ("companyMemberId","permissionId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "companyId" UUID,
    "action" VARCHAR(180) NOT NULL,
    "targetType" VARCHAR(120) NOT NULL,
    "targetId" VARCHAR(120),
    "beforeData" JSONB,
    "afterData" JSONB,
    "metadata" JSONB,
    "ipAddress" VARCHAR(64),
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Industry" (
    "id" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCategory" (
    "id" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "JobCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "parentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SkillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "categoryId" UUID NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "englishLabel" VARCHAR(120) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageCertificateType" (
    "id" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "languageId" UUID NOT NULL,
    "label" VARCHAR(180) NOT NULL,
    "supportsOverallScore" BOOLEAN NOT NULL DEFAULT false,
    "supportsLevel" BOOLEAN NOT NULL DEFAULT false,
    "levelOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scoreFields" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LanguageCertificateType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Province" (
    "id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "divisionType" VARCHAR(80) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ward" (
    "id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "provinceId" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "divisionType" VARCHAR(80) NOT NULL,
    "codename" VARCHAR(180) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailNormalized_key" ON "User"("emailNormalized");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "CandidateProfile_provinceId_idx" ON "CandidateProfile"("provinceId");

-- CreateIndex
CREATE INDEX "CandidateProfile_wardId_idx" ON "CandidateProfile"("wardId");

-- CreateIndex
CREATE INDEX "CandidateEducation_candidateProfileId_idx" ON "CandidateEducation"("candidateProfileId");

-- CreateIndex
CREATE INDEX "CandidateExperience_candidateProfileId_idx" ON "CandidateExperience"("candidateProfileId");

-- CreateIndex
CREATE INDEX "CandidateExperienceSkill_experienceId_idx" ON "CandidateExperienceSkill"("experienceId");

-- CreateIndex
CREATE INDEX "CandidateExperienceSkill_skillId_idx" ON "CandidateExperienceSkill"("skillId");

-- CreateIndex
CREATE INDEX "CandidateSkill_candidateProfileId_idx" ON "CandidateSkill"("candidateProfileId");

-- CreateIndex
CREATE INDEX "CandidateSkill_skillId_idx" ON "CandidateSkill"("skillId");

-- CreateIndex
CREATE INDEX "CandidateLanguage_candidateProfileId_idx" ON "CandidateLanguage"("candidateProfileId");

-- CreateIndex
CREATE INDEX "CandidateLanguage_languageId_idx" ON "CandidateLanguage"("languageId");

-- CreateIndex
CREATE INDEX "CandidateLanguageCertificate_candidateLanguageId_idx" ON "CandidateLanguageCertificate"("candidateLanguageId");

-- CreateIndex
CREATE INDEX "CandidateLanguageCertificate_certificateTypeId_idx" ON "CandidateLanguageCertificate"("certificateTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateCareerPreference_candidateProfileId_key" ON "CandidateCareerPreference"("candidateProfileId");

-- CreateIndex
CREATE INDEX "CandidateDesiredPosition_careerPreferenceId_displayOrder_idx" ON "CandidateDesiredPosition"("careerPreferenceId", "displayOrder");

-- CreateIndex
CREATE INDEX "CandidatePreferredCategory_jobCategoryId_idx" ON "CandidatePreferredCategory"("jobCategoryId");

-- CreateIndex
CREATE INDEX "CandidatePreferredLocation_provinceId_idx" ON "CandidatePreferredLocation"("provinceId");

-- CreateIndex
CREATE INDEX "Resume_candidateProfileId_deletedAt_idx" ON "Resume"("candidateProfileId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Resume_candidateProfileId_id_key" ON "Resume"("candidateProfileId", "id");

-- CreateIndex
CREATE INDEX "ResumeVersion_resumeId_createdAt_idx" ON "ResumeVersion"("resumeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeVersion_resumeId_versionNumber_key" ON "ResumeVersion"("resumeId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeVersion_resumeId_id_key" ON "ResumeVersion"("resumeId", "id");

-- CreateIndex
CREATE INDEX "Company_industryId_idx" ON "Company"("industryId");

-- CreateIndex
CREATE INDEX "Company_provinceId_idx" ON "Company"("provinceId");

-- CreateIndex
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- CreateIndex
CREATE INDEX "CompanyMember_userId_status_idx" ON "CompanyMember"("userId", "status");

-- CreateIndex
CREATE INDEX "CompanyMember_companyId_status_idx" ON "CompanyMember"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMember_companyId_userId_key" ON "CompanyMember"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMember_companyId_id_key" ON "CompanyMember"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyInvitation_tokenHash_key" ON "CompanyInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "CompanyInvitation_companyId_status_idx" ON "CompanyInvitation"("companyId", "status");

-- CreateIndex
CREATE INDEX "CompanyInvitation_emailNormalized_status_idx" ON "CompanyInvitation"("emailNormalized", "status");

-- CreateIndex
CREATE INDEX "CompanyInvitation_expiresAt_idx" ON "CompanyInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "Job_companyId_status_publishedAt_idx" ON "Job"("companyId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Job_categoryId_status_publishedAt_idx" ON "Job"("categoryId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Job_provinceId_status_publishedAt_idx" ON "Job"("provinceId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Job_status_publishedAt_idx" ON "Job"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Job_companyId_id_key" ON "Job"("companyId", "id");

-- CreateIndex
CREATE INDEX "JobSkill_jobId_idx" ON "JobSkill"("jobId");

-- CreateIndex
CREATE INDEX "JobSkill_skillId_idx" ON "JobSkill"("skillId");

-- CreateIndex
CREATE INDEX "ScreeningQuestion_jobId_isActive_displayOrder_idx" ON "ScreeningQuestion"("jobId", "isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningQuestion_jobId_id_key" ON "ScreeningQuestion"("jobId", "id");

-- CreateIndex
CREATE INDEX "Application_companyId_status_createdAt_idx" ON "Application"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Application_candidateProfileId_status_updatedAt_idx" ON "Application"("candidateProfileId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Application_jobId_status_createdAt_idx" ON "Application"("jobId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Application_resumeVersionId_idx" ON "Application"("resumeVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_candidateProfileId_jobId_key" ON "Application"("candidateProfileId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_companyId_id_key" ON "Application"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_id_key" ON "Application"("jobId", "id");

-- CreateIndex
CREATE INDEX "ApplicationAnswer_jobId_idx" ON "ApplicationAnswer"("jobId");

-- CreateIndex
CREATE INDEX "ApplicationAnswer_screeningQuestionId_idx" ON "ApplicationAnswer"("screeningQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationAnswer_applicationId_screeningQuestionId_key" ON "ApplicationAnswer"("applicationId", "screeningQuestionId");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_applicationId_createdAt_idx" ON "ApplicationStatusHistory"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_changedByUserId_createdAt_idx" ON "ApplicationStatusHistory"("changedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationAssignment_companyMemberId_removedAt_idx" ON "ApplicationAssignment"("companyMemberId", "removedAt");

-- CreateIndex
CREATE INDEX "ApplicationAssignment_applicationId_removedAt_idx" ON "ApplicationAssignment"("applicationId", "removedAt");

-- CreateIndex
CREATE INDEX "ApplicationAssignment_companyId_assignmentType_idx" ON "ApplicationAssignment"("companyId", "assignmentType");

-- CreateIndex
CREATE INDEX "Interview_companyId_status_scheduledAt_idx" ON "Interview"("companyId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Interview_applicationId_scheduledAt_idx" ON "Interview"("applicationId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Interview_companyId_id_key" ON "Interview"("companyId", "id");

-- CreateIndex
CREATE INDEX "InterviewParticipant_interviewId_removedAt_idx" ON "InterviewParticipant"("interviewId", "removedAt");

-- CreateIndex
CREATE INDEX "InterviewParticipant_companyMemberId_removedAt_idx" ON "InterviewParticipant"("companyMemberId", "removedAt");

-- CreateIndex
CREATE INDEX "InterviewParticipant_companyId_idx" ON "InterviewParticipant"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_resource_action_idx" ON "Permission"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "Role_systemCode_key" ON "Role"("systemCode");

-- CreateIndex
CREATE INDEX "Role_kind_isActive_idx" ON "Role"("kind", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Role_companyId_normalizedName_key" ON "Role"("companyId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Role_companyId_id_key" ON "Role"("companyId", "id");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "SystemUserRole_roleId_idx" ON "SystemUserRole"("roleId");

-- CreateIndex
CREATE INDEX "CompanyMemberRole_companyId_idx" ON "CompanyMemberRole"("companyId");

-- CreateIndex
CREATE INDEX "CompanyMemberRole_roleId_idx" ON "CompanyMemberRole"("roleId");

-- CreateIndex
CREATE INDEX "CompanyMemberRole_assignedByUserId_idx" ON "CompanyMemberRole"("assignedByUserId");

-- CreateIndex
CREATE INDEX "SystemUserPermission_permissionId_idx" ON "SystemUserPermission"("permissionId");

-- CreateIndex
CREATE INDEX "SystemUserPermission_expiresAt_idx" ON "SystemUserPermission"("expiresAt");

-- CreateIndex
CREATE INDEX "CompanyMemberPermission_companyId_idx" ON "CompanyMemberPermission"("companyId");

-- CreateIndex
CREATE INDEX "CompanyMemberPermission_permissionId_idx" ON "CompanyMemberPermission"("permissionId");

-- CreateIndex
CREATE INDEX "CompanyMemberPermission_assignedByUserId_idx" ON "CompanyMemberPermission"("assignedByUserId");

-- CreateIndex
CREATE INDEX "CompanyMemberPermission_expiresAt_idx" ON "CompanyMemberPermission"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_createdAt_idx" ON "AuditLog"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Industry_code_key" ON "Industry"("code");

-- CreateIndex
CREATE UNIQUE INDEX "JobCategory_code_key" ON "JobCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCategory_code_key" ON "SkillCategory"("code");

-- CreateIndex
CREATE INDEX "SkillCategory_parentId_idx" ON "SkillCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_code_key" ON "Skill"("code");

-- CreateIndex
CREATE INDEX "Skill_categoryId_isActive_idx" ON "Skill"("categoryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageCertificateType_code_key" ON "LanguageCertificateType"("code");

-- CreateIndex
CREATE INDEX "LanguageCertificateType_languageId_isActive_idx" ON "LanguageCertificateType"("languageId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Province_code_key" ON "Province"("code");

-- CreateIndex
CREATE INDEX "Province_isActive_name_idx" ON "Province"("isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Ward_code_key" ON "Ward"("code");

-- CreateIndex
CREATE INDEX "Ward_provinceId_isActive_name_idx" ON "Ward"("provinceId", "isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Ward_provinceId_id_key" ON "Ward"("provinceId", "id");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_ward_same_province_fkey" FOREIGN KEY ("provinceId", "wardId") REFERENCES "Ward"("provinceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEducation" ADD CONSTRAINT "CandidateEducation_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateExperience" ADD CONSTRAINT "CandidateExperience_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateExperienceSkill" ADD CONSTRAINT "CandidateExperienceSkill_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "CandidateExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateExperienceSkill" ADD CONSTRAINT "CandidateExperienceSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateLanguage" ADD CONSTRAINT "CandidateLanguage_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateLanguage" ADD CONSTRAINT "CandidateLanguage_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateLanguageCertificate" ADD CONSTRAINT "CandidateLanguageCertificate_candidateLanguageId_fkey" FOREIGN KEY ("candidateLanguageId") REFERENCES "CandidateLanguage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateLanguageCertificate" ADD CONSTRAINT "CandidateLanguageCertificate_certificateTypeId_fkey" FOREIGN KEY ("certificateTypeId") REFERENCES "LanguageCertificateType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCareerPreference" ADD CONSTRAINT "CandidateCareerPreference_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateDesiredPosition" ADD CONSTRAINT "CandidateDesiredPosition_careerPreferenceId_fkey" FOREIGN KEY ("careerPreferenceId") REFERENCES "CandidateCareerPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreferredCategory" ADD CONSTRAINT "CandidatePreferredCategory_careerPreferenceId_fkey" FOREIGN KEY ("careerPreferenceId") REFERENCES "CandidateCareerPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreferredCategory" ADD CONSTRAINT "CandidatePreferredCategory_jobCategoryId_fkey" FOREIGN KEY ("jobCategoryId") REFERENCES "JobCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreferredLocation" ADD CONSTRAINT "CandidatePreferredLocation_careerPreferenceId_fkey" FOREIGN KEY ("careerPreferenceId") REFERENCES "CandidateCareerPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreferredLocation" ADD CONSTRAINT "CandidatePreferredLocation_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreferredEmploymentType" ADD CONSTRAINT "CandidatePreferredEmploymentType_careerPreferenceId_fkey" FOREIGN KEY ("careerPreferenceId") REFERENCES "CandidateCareerPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreferredWorkplaceType" ADD CONSTRAINT "CandidatePreferredWorkplaceType_careerPreferenceId_fkey" FOREIGN KEY ("careerPreferenceId") REFERENCES "CandidateCareerPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePrivacySetting" ADD CONSTRAINT "CandidatePrivacySetting_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ward_same_province_fkey" FOREIGN KEY ("provinceId", "wardId") REFERENCES "Ward"("provinceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvitation" ADD CONSTRAINT "CompanyInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvitation" ADD CONSTRAINT "CompanyInvitation_inviter_same_company_fkey" FOREIGN KEY ("companyId", "invitedByMemberId") REFERENCES "CompanyMember"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_creator_same_company_fkey" FOREIGN KEY ("companyId", "createdByMemberId") REFERENCES "CompanyMember"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "JobCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_ward_same_province_fkey" FOREIGN KEY ("provinceId", "wardId") REFERENCES "Ward"("provinceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningQuestion" ADD CONSTRAINT "ScreeningQuestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_job_same_company_fkey" FOREIGN KEY ("companyId", "jobId") REFERENCES "Job"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_resume_same_candidate_fkey" FOREIGN KEY ("candidateProfileId", "resumeId") REFERENCES "Resume"("candidateProfileId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_version_same_resume_fkey" FOREIGN KEY ("resumeId", "resumeVersionId") REFERENCES "ResumeVersion"("resumeId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_application_same_job_fkey" FOREIGN KEY ("jobId", "applicationId") REFERENCES "Application"("jobId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_question_same_job_fkey" FOREIGN KEY ("jobId", "screeningQuestionId") REFERENCES "ScreeningQuestion"("jobId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAssignment" ADD CONSTRAINT "ApplicationAssignment_application_same_company_fkey" FOREIGN KEY ("companyId", "applicationId") REFERENCES "Application"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAssignment" ADD CONSTRAINT "ApplicationAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAssignment" ADD CONSTRAINT "ApplicationAssignment_member_same_company_fkey" FOREIGN KEY ("companyId", "companyMemberId") REFERENCES "CompanyMember"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAssignment" ADD CONSTRAINT "ApplicationAssignment_assigner_same_company_fkey" FOREIGN KEY ("companyId", "assignedByMemberId") REFERENCES "CompanyMember"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_application_same_company_fkey" FOREIGN KEY ("companyId", "applicationId") REFERENCES "Application"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_creator_same_company_fkey" FOREIGN KEY ("companyId", "createdByMemberId") REFERENCES "CompanyMember"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewParticipant" ADD CONSTRAINT "InterviewParticipant_interview_same_company_fkey" FOREIGN KEY ("companyId", "interviewId") REFERENCES "Interview"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewParticipant" ADD CONSTRAINT "InterviewParticipant_member_same_company_fkey" FOREIGN KEY ("companyId", "companyMemberId") REFERENCES "CompanyMember"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemUserRole" ADD CONSTRAINT "SystemUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemUserRole" ADD CONSTRAINT "SystemUserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemUserRole" ADD CONSTRAINT "SystemUserRole_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMemberRole" ADD CONSTRAINT "CompanyMemberRole_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMemberRole" ADD CONSTRAINT "CompanyMemberRole_member_same_company_fkey" FOREIGN KEY ("companyId", "companyMemberId") REFERENCES "CompanyMember"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMemberRole" ADD CONSTRAINT "CompanyMemberRole_role_same_company_fkey" FOREIGN KEY ("companyId", "roleId") REFERENCES "Role"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMemberRole" ADD CONSTRAINT "CompanyMemberRole_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemUserPermission" ADD CONSTRAINT "SystemUserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemUserPermission" ADD CONSTRAINT "SystemUserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemUserPermission" ADD CONSTRAINT "SystemUserPermission_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMemberPermission" ADD CONSTRAINT "CompanyMemberPermission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMemberPermission" ADD CONSTRAINT "CompanyMemberPermission_member_same_company_fkey" FOREIGN KEY ("companyId", "companyMemberId") REFERENCES "CompanyMember"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMemberPermission" ADD CONSTRAINT "CompanyMemberPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMemberPermission" ADD CONSTRAINT "CompanyMemberPermission_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillCategory" ADD CONSTRAINT "SkillCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageCertificateType" ADD CONSTRAINT "LanguageCertificateType_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ward" ADD CONSTRAINT "Ward_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
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
