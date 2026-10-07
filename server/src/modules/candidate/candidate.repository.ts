import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type {
  CandidateAvailabilityType,
  CandidateCareerLevel,
  CandidateCareerStatus,
  CandidateEmploymentType,
  CandidateGender,
  CandidateLanguageProficiency,
  CandidateLocationPreferenceMode,
  CandidateSalaryExpectationType,
  CandidateSalaryPeriod,
  CandidateSkillLevel,
  CandidateWorkplaceType,
  CandidateJsonValue,
  ExperienceSkillInput,
} from "./types/candidate.types";

export interface CandidateProfileWriteInput {
  fullName?: string;
  phone?: string | null;
  dateOfBirth?: Date | null;
  gender?: CandidateGender | null;
  countryCode?: string | null;
  provinceId?: string | null;
  wardId?: string | null;
  addressLine?: string | null;
  bio?: string | null;
  avatarAssetKey?: string | null;
  careerStatus?: CandidateCareerStatus | null;
}

interface EducationWriteInput {
  school?: string;
  degree?: string;
  major?: string;
  location?: string | null;
  startMonth?: number;
  startYear?: number;
  endMonth?: number | null;
  endYear?: number | null;
  isStudying?: boolean;
  gpa?: number | null;
  gpaScale?: number | null;
  achievements?: string | null;
  description?: string | null;
}

interface ExperienceWriteInput {
  companyName?: string;
  position?: string;
  employmentType?: CandidateEmploymentType;
  workplaceType?: CandidateWorkplaceType;
  location?: string | null;
  startMonth?: number;
  startYear?: number;
  endMonth?: number | null;
  endYear?: number | null;
  isCurrent?: boolean;
  description?: string | null;
  achievements?: string | null;
}

interface CandidateSkillWriteInput {
  skillId?: string | null;
  customSkillName?: string | null;
  level?: CandidateSkillLevel;
  yearsOfExperience?: number | null;
  isHighlighted?: boolean;
}

interface CandidateLanguageWriteInput {
  languageId?: string | null;
  customLanguageName?: string | null;
  overallLevel?: CandidateLanguageProficiency;
  listeningLevel?: CandidateLanguageProficiency;
  speakingLevel?: CandidateLanguageProficiency;
  readingLevel?: CandidateLanguageProficiency;
  writingLevel?: CandidateLanguageProficiency;
}

interface CandidateCertificateWriteInput {
  certificateTypeId?: string | null;
  customCertificateName?: string | null;
  level?: string | null;
  overallScore?: string | null;
  scores?: { [key: string]: CandidateJsonValue } | null;
  issuedDate?: Date | null;
  expiryDate?: Date | null;
  issuer?: string | null;
  credentialId?: string | null;
  verificationUrl?: string | null;
}

interface CareerPreferenceWriteInput {
  locationMode: CandidateLocationPreferenceMode;
  salaryType: CandidateSalaryExpectationType;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  salaryPeriod: CandidateSalaryPeriod;
  desiredCareerLevel: CandidateCareerLevel | null;
  availabilityType: CandidateAvailabilityType | null;
  availableFrom: Date | null;
  willingToRelocate: boolean;
  desiredPositions: string[];
  preferredCategoryIds: string[];
  preferredProvinceIds: string[];
  preferredEmploymentTypes: CandidateEmploymentType[];
  preferredWorkplaceTypes: CandidateWorkplaceType[];
}

interface PrivacyWriteInput {
  searchableProfile?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  allowResumeDownload?: boolean;
  allowJobMatching?: boolean;
}

@Injectable()
export class CandidateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCandidateRole() {
    return this.prisma.role.findUnique({
      where: { systemCode: "CANDIDATE" },
      select: {
        id: true,
        kind: true,
        isActive: true,
        permissions: {
          where: {
            permission: {
              code: { in: ["profile.view", "profile.update"] },
              isDeprecated: false,
            },
          },
          select: {
            dataScope: true,
            permission: { select: { code: true } },
          },
        },
      },
    });
  }

  findProfileByUserId(userId: string) {
    return this.prisma.candidateProfile.findUnique({
      where: { userId },
      include: {
        province: {
          select: { id: true, code: true, name: true, divisionType: true },
        },
        ward: {
          select: { id: true, code: true, name: true, divisionType: true },
        },
        privacySetting: true,
      },
    });
  }

  async createProfileAndCandidateRole(
    userId: string,
    candidateRoleId: string,
    input: Required<Pick<CandidateProfileWriteInput, "fullName">> & CandidateProfileWriteInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.candidateProfile.create({
        data: {
          userId,
          ...input,
        },
        select: { id: true },
      });

      await tx.candidatePrivacySetting.create({
        data: { candidateProfileId: profile.id },
      });

      await tx.systemUserRole.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId: candidateRoleId,
          },
        },
        update: {},
        create: {
          userId,
          roleId: candidateRoleId,
          assignedByUserId: null,
        },
      });

      return tx.candidateProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: {
          province: {
            select: { id: true, code: true, name: true, divisionType: true },
          },
          ward: {
            select: { id: true, code: true, name: true, divisionType: true },
          },
          privacySetting: true,
        },
      });
    });
  }

  updateProfile(userId: string, input: CandidateProfileWriteInput) {
    return this.prisma.candidateProfile.update({
      where: { userId },
      data: input,
      include: {
        province: {
          select: { id: true, code: true, name: true, divisionType: true },
        },
        ward: {
          select: { id: true, code: true, name: true, divisionType: true },
        },
        privacySetting: true,
      },
    });
  }

  findActiveProvince(id: string) {
    return this.prisma.province.findFirst({
      where: { id, isActive: true },
      select: { id: true },
    });
  }

  findActiveWard(id: string, provinceId: string) {
    return this.prisma.ward.findFirst({
      where: { id, provinceId, isActive: true, province: { isActive: true } },
      select: { id: true },
    });
  }

  listEducation(userId: string) {
    return this.prisma.candidateEducation.findMany({
      where: { candidateProfile: { userId } },
      orderBy: [{ startYear: "desc" }, { startMonth: "desc" }, { createdAt: "desc" }],
    });
  }

  findEducationOwned(userId: string, id: string) {
    return this.prisma.candidateEducation.findFirst({
      where: { id, candidateProfile: { userId } },
    });
  }

  async createEducation(userId: string, input: Required<Pick<EducationWriteInput, "school" | "degree" | "major" | "startMonth" | "startYear">> & EducationWriteInput) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;
    return this.prisma.candidateEducation.create({
      data: { candidateProfileId: profile.id, ...input },
    });
  }

  updateEducation(id: string, input: EducationWriteInput) {
    return this.prisma.candidateEducation.update({ where: { id }, data: input });
  }

  deleteEducationOwned(userId: string, id: string) {
    return this.prisma.candidateEducation.deleteMany({
      where: { id, candidateProfile: { userId } },
    });
  }

  listExperience(userId: string) {
    return this.prisma.candidateExperience.findMany({
      where: { candidateProfile: { userId } },
      include: { skills: { orderBy: { skillName: "asc" } } },
      orderBy: [{ isCurrent: "desc" }, { startYear: "desc" }, { startMonth: "desc" }, { createdAt: "desc" }],
    });
  }

  findExperienceOwned(userId: string, id: string) {
    return this.prisma.candidateExperience.findFirst({
      where: { id, candidateProfile: { userId } },
      include: { skills: true },
    });
  }

  async createExperience(
    userId: string,
    input: Required<Pick<ExperienceWriteInput, "companyName" | "position" | "employmentType" | "workplaceType" | "startMonth" | "startYear">> & ExperienceWriteInput,
    skills: ExperienceSkillInput[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.candidateProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!profile) return null;

      return tx.candidateExperience.create({
        data: {
          candidateProfile: { connect: { id: profile.id } },
          ...input,
          ...(skills.length > 0
            ? {
                skills: {
                  create: skills.map((skill) => ({
                    skillId: skill.skillId,
                    skillName: skill.skillName,
                  })),
                },
              }
            : {}),
        },
        include: { skills: true },
      });
    });
  }

  async updateExperience(
    id: string,
    input: ExperienceWriteInput,
    skills?: ExperienceSkillInput[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.candidateExperience.update({ where: { id }, data: input });
      if (skills !== undefined) {
        await tx.candidateExperienceSkill.deleteMany({ where: { experienceId: id } });
        if (skills.length > 0) {
          await tx.candidateExperienceSkill.createMany({
            data: skills.map((skill) => ({
              experienceId: id,
              skillId: skill.skillId,
              skillName: skill.skillName,
            })),
          });
        }
      }
      return tx.candidateExperience.findUniqueOrThrow({
        where: { id },
        include: { skills: true },
      });
    });
  }

  deleteExperienceOwned(userId: string, id: string) {
    return this.prisma.candidateExperience.deleteMany({
      where: { id, candidateProfile: { userId } },
    });
  }

  findActiveSkills(ids: string[]) {
    return this.prisma.skill.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, name: true },
    });
  }

  listSkills(userId: string) {
    return this.prisma.candidateSkill.findMany({
      where: { candidateProfile: { userId } },
      include: { skill: { select: { id: true, code: true, name: true } } },
      orderBy: [{ isHighlighted: "desc" }, { createdAt: "asc" }],
    });
  }

  findSkillOwned(userId: string, id: string) {
    return this.prisma.candidateSkill.findFirst({
      where: { id, candidateProfile: { userId } },
    });
  }

  findSkillDuplicate(userId: string, skillId: string | null, customSkillName: string | null, excludeId?: string) {
    return this.prisma.candidateSkill.findFirst({
      where: {
        candidateProfile: { userId },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        ...(skillId
          ? { skillId }
          : {
              customSkillName: {
                equals: customSkillName ?? "",
                mode: "insensitive",
              },
            }),
      },
      select: { id: true },
    });
  }

  async createSkill(userId: string, input: Required<Pick<CandidateSkillWriteInput, "level">> & CandidateSkillWriteInput) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;
    return this.prisma.candidateSkill.create({
      data: { candidateProfileId: profile.id, ...input },
      include: { skill: { select: { id: true, code: true, name: true } } },
    });
  }

  updateSkill(id: string, input: CandidateSkillWriteInput) {
    return this.prisma.candidateSkill.update({
      where: { id },
      data: input,
      include: { skill: { select: { id: true, code: true, name: true } } },
    });
  }

  deleteSkillOwned(userId: string, id: string) {
    return this.prisma.candidateSkill.deleteMany({
      where: { id, candidateProfile: { userId } },
    });
  }

  listLanguages(userId: string) {
    return this.prisma.candidateLanguage.findMany({
      where: { candidateProfile: { userId } },
      include: {
        language: { select: { id: true, code: true, label: true, englishLabel: true } },
        certificates: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  findLanguageOwned(userId: string, id: string) {
    return this.prisma.candidateLanguage.findFirst({
      where: { id, candidateProfile: { userId } },
      include: { certificates: true },
    });
  }

  findActiveLanguage(id: string) {
    return this.prisma.language.findFirst({
      where: { id, isActive: true },
      select: { id: true, code: true, label: true },
    });
  }

  findLanguageDuplicate(userId: string, languageId: string | null, customLanguageName: string | null, excludeId?: string) {
    return this.prisma.candidateLanguage.findFirst({
      where: {
        candidateProfile: { userId },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        ...(languageId
          ? { languageId }
          : {
              customLanguageName: {
                equals: customLanguageName ?? "",
                mode: "insensitive",
              },
            }),
      },
      select: { id: true },
    });
  }

  async createLanguage(userId: string, input: Required<Pick<CandidateLanguageWriteInput, "overallLevel" | "listeningLevel" | "speakingLevel" | "readingLevel" | "writingLevel">> & CandidateLanguageWriteInput) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;
    return this.prisma.candidateLanguage.create({
      data: { candidateProfileId: profile.id, ...input },
      include: {
        language: { select: { id: true, code: true, label: true, englishLabel: true } },
        certificates: true,
      },
    });
  }

  updateLanguage(id: string, input: CandidateLanguageWriteInput) {
    return this.prisma.candidateLanguage.update({
      where: { id },
      data: input,
      include: {
        language: { select: { id: true, code: true, label: true, englishLabel: true } },
        certificates: true,
      },
    });
  }

  deleteLanguageOwned(userId: string, id: string) {
    return this.prisma.candidateLanguage.deleteMany({
      where: { id, candidateProfile: { userId } },
    });
  }

  findCertificateOwned(userId: string, languageId: string, certificateId: string) {
    return this.prisma.candidateLanguageCertificate.findFirst({
      where: {
        id: certificateId,
        candidateLanguageId: languageId,
        candidateLanguage: { candidateProfile: { userId } },
      },
    });
  }

  findActiveCertificateType(id: string) {
    return this.prisma.languageCertificateType.findFirst({
      where: { id, isActive: true, language: { isActive: true } },
      select: {
        id: true,
        languageId: true,
        supportsOverallScore: true,
        supportsLevel: true,
        levelOptions: true,
        scoreFields: true,
      },
    });
  }

  createCertificate(languageId: string, input: CandidateCertificateWriteInput) {
    const { scores, ...rest } = input;
    const data: Prisma.CandidateLanguageCertificateUncheckedCreateInput = {
      candidateLanguageId: languageId,
      ...rest,
      ...(scores === undefined
        ? {}
        : {
            scores:
              scores === null
                ? Prisma.DbNull
                : (scores as Prisma.InputJsonObject),
          }),
    };

    return this.prisma.candidateLanguageCertificate.create({ data });
  }

  updateCertificate(id: string, input: CandidateCertificateWriteInput) {
    const { scores, ...rest } = input;
    const data: Prisma.CandidateLanguageCertificateUncheckedUpdateInput = {
      ...rest,
      ...(scores === undefined
        ? {}
        : {
            scores:
              scores === null
                ? Prisma.DbNull
                : (scores as Prisma.InputJsonObject),
          }),
    };

    return this.prisma.candidateLanguageCertificate.update({
      where: { id },
      data,
    });
  }

  deleteCertificateOwned(userId: string, languageId: string, certificateId: string) {
    return this.prisma.candidateLanguageCertificate.deleteMany({
      where: {
        id: certificateId,
        candidateLanguageId: languageId,
        candidateLanguage: { candidateProfile: { userId } },
      },
    });
  }

  getCareerPreference(userId: string) {
    return this.prisma.candidateCareerPreference.findFirst({
      where: { candidateProfile: { userId } },
      include: {
        desiredPositions: { orderBy: { displayOrder: "asc" } },
        preferredCategories: {
          include: { jobCategory: { select: { id: true, code: true, name: true } } },
        },
        preferredLocations: {
          include: { province: { select: { id: true, code: true, name: true } } },
        },
        preferredEmploymentTypes: true,
        preferredWorkplaceTypes: true,
      },
    });
  }

  countActiveCategories(ids: string[]) {
    return this.prisma.jobCategory.count({ where: { id: { in: ids }, isActive: true } });
  }

  countActiveProvinces(ids: string[]) {
    return this.prisma.province.count({ where: { id: { in: ids }, isActive: true } });
  }

  async putCareerPreference(userId: string, input: CareerPreferenceWriteInput) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.candidateProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!profile) return null;

      const preference = await tx.candidateCareerPreference.upsert({
        where: { candidateProfileId: profile.id },
        update: {
          locationMode: input.locationMode,
          salaryType: input.salaryType,
          salaryMin: input.salaryMin,
          salaryMax: input.salaryMax,
          currency: input.currency,
          salaryPeriod: input.salaryPeriod,
          desiredCareerLevel: input.desiredCareerLevel,
          availabilityType: input.availabilityType,
          availableFrom: input.availableFrom,
          willingToRelocate: input.willingToRelocate,
        },
        create: {
          candidateProfileId: profile.id,
          locationMode: input.locationMode,
          salaryType: input.salaryType,
          salaryMin: input.salaryMin,
          salaryMax: input.salaryMax,
          currency: input.currency,
          salaryPeriod: input.salaryPeriod,
          desiredCareerLevel: input.desiredCareerLevel,
          availabilityType: input.availabilityType,
          availableFrom: input.availableFrom,
          willingToRelocate: input.willingToRelocate,
        },
        select: { id: true },
      });

      await tx.candidateDesiredPosition.deleteMany({
        where: { careerPreferenceId: preference.id },
      });
      await tx.candidatePreferredCategory.deleteMany({
        where: { careerPreferenceId: preference.id },
      });
      await tx.candidatePreferredLocation.deleteMany({
        where: { careerPreferenceId: preference.id },
      });
      await tx.candidatePreferredEmploymentType.deleteMany({
        where: { careerPreferenceId: preference.id },
      });
      await tx.candidatePreferredWorkplaceType.deleteMany({
        where: { careerPreferenceId: preference.id },
      });

      if (input.desiredPositions.length > 0) {
        await tx.candidateDesiredPosition.createMany({
          data: input.desiredPositions.map((title, displayOrder) => ({
            careerPreferenceId: preference.id,
            title,
            displayOrder,
          })),
        });
      }
      if (input.preferredCategoryIds.length > 0) {
        await tx.candidatePreferredCategory.createMany({
          data: input.preferredCategoryIds.map((jobCategoryId) => ({
            careerPreferenceId: preference.id,
            jobCategoryId,
          })),
        });
      }
      if (input.preferredProvinceIds.length > 0) {
        await tx.candidatePreferredLocation.createMany({
          data: input.preferredProvinceIds.map((provinceId) => ({
            careerPreferenceId: preference.id,
            provinceId,
          })),
        });
      }
      if (input.preferredEmploymentTypes.length > 0) {
        await tx.candidatePreferredEmploymentType.createMany({
          data: input.preferredEmploymentTypes.map((employmentType) => ({
            careerPreferenceId: preference.id,
            employmentType,
          })),
        });
      }
      if (input.preferredWorkplaceTypes.length > 0) {
        await tx.candidatePreferredWorkplaceType.createMany({
          data: input.preferredWorkplaceTypes.map((workplaceType) => ({
            careerPreferenceId: preference.id,
            workplaceType,
          })),
        });
      }

      return tx.candidateCareerPreference.findUniqueOrThrow({
        where: { id: preference.id },
        include: {
          desiredPositions: { orderBy: { displayOrder: "asc" } },
          preferredCategories: {
            include: { jobCategory: { select: { id: true, code: true, name: true } } },
          },
          preferredLocations: {
            include: { province: { select: { id: true, code: true, name: true } } },
          },
          preferredEmploymentTypes: true,
          preferredWorkplaceTypes: true,
        },
      });
    });
  }

  getPrivacy(userId: string) {
    return this.prisma.candidatePrivacySetting.findFirst({
      where: { candidateProfile: { userId } },
    });
  }

  async updatePrivacy(userId: string, input: PrivacyWriteInput) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;
    return this.prisma.candidatePrivacySetting.upsert({
      where: { candidateProfileId: profile.id },
      create: { candidateProfileId: profile.id, ...input },
      update: input,
    });
  }
}
