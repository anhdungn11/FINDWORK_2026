import {
  BadRequestException, ConflictException, Injectable, InternalServerErrorException,
  NotFoundException, ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CANDIDATE_IMPORT_PRIVACY_DEFAULTS, parseCandidateOnboardingDraft, type ParsedCandidateDraft } from "./candidate-onboarding-import.parser";
import type { ImportCandidateOnboardingDto } from "./dto/import-onboarding.dto";

type Tx = Prisma.TransactionClient;
type Catalog = "jobCategory" | "skill" | "language" | "languageCertificateType" | "province" | "ward";

@Injectable()
export class CandidateOnboardingImportService {
  constructor(private readonly prisma: PrismaService) {}

  async import(userId: string, dto: ImportCandidateOnboardingDto) {
    if (!Number.isInteger(dto.version) || dto.version < 1 || dto.confirmPrivacy !== true ||
      (dto.confirmPrivacyDifferences !== undefined && typeof dto.confirmPrivacyDifferences !== "boolean") ||
      (dto.confirmOmitUnsupportedAssets !== undefined && typeof dto.confirmOmitUnsupportedAssets !== "boolean")) {
      throw new BadRequestException({ code: "CANDIDATE_IMPORT_REQUEST_INVALID", message: "A valid draft version and privacy confirmation are required." });
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (await tx.candidateProfile.findUnique({ where: { userId }, select: { id: true } })) {
          throw new ConflictException({ code: "CANDIDATE_PROFILE_ALREADY_EXISTS", message: "Candidate profile already exists." });
        }
        const draft = await tx.candidateOnboardingDraft.findUnique({ where: { userId }, select: { version: true, content: true } });
        if (!draft) throw new NotFoundException({ code: "CANDIDATE_ONBOARDING_DRAFT_NOT_FOUND", message: "Onboarding draft does not exist." });
        if (draft.version !== dto.version) throw new ConflictException({ code: "CANDIDATE_ONBOARDING_VERSION_CONFLICT", message: "Onboarding draft version changed." });

        const parsed = parseCandidateOnboardingDraft(draft.content);
        if (parsed.privacyDifferences.length > 0 && dto.confirmPrivacyDifferences !== true) {
          throw new BadRequestException({
            code: "CANDIDATE_IMPORT_PRIVACY_DIFFERENCES",
            message: "Confirm the listed changes from draft privacy choices to initial profile settings.",
            details: { privacyDifferences: parsed.privacyDifferences, initialPrivacy: CANDIDATE_IMPORT_PRIVACY_DEFAULTS },
          });
        }
        if (parsed.unsupportedAssets.length > 0 && dto.confirmOmitUnsupportedAssets !== true) {
          throw new BadRequestException({
            code: "CANDIDATE_IMPORT_UNSUPPORTED_ASSETS",
            message: "Confirm omission of unsupported onboarding assets before importing.",
            details: { unsupportedAssets: parsed.unsupportedAssets },
          });
        }
        const user = await tx.user.findUnique({ where: { id: userId }, select: { emailNormalized: true } });
        if (!user) throw new NotFoundException({ code: "CANDIDATE_ACCOUNT_NOT_FOUND", message: "Account does not exist." });
        if (parsed.personal.email && parsed.personal.email.toLowerCase() !== user.emailNormalized) {
          throw new BadRequestException({ code: "CANDIDATE_ONBOARDING_EMAIL_MISMATCH", message: "Draft email does not match the authenticated account." });
        }
        const role = await tx.role.findUnique({
          where: { systemCode: "CANDIDATE" },
          select: { id: true, kind: true, isActive: true, permissions: { where: { permission: { code: { in: ["profile.view", "profile.update"] }, isDeprecated: false } }, select: { dataScope: true, permission: { select: { code: true } } } } },
        });
        const scopes = new Map(role?.permissions.map((item) => [item.permission.code, item.dataScope]));
        if (!role || role.kind !== "SYSTEM" || !role.isActive || scopes.get("profile.view") !== "OWN" || scopes.get("profile.update") !== "OWN") {
          throw new InternalServerErrorException({ code: "CANDIDATE_ROLE_NOT_CONFIGURED", message: "Candidate role is not configured correctly." });
        }

        const provinceId = await this.resolve(tx, "province", parsed.personal.provinceCode, async (code) => tx.province.findFirst({ where: { code, isActive: true }, select: { id: true } }));
        const wardId = await this.resolve(tx, "ward", parsed.personal.wardCode, async (code) => tx.ward.findFirst({ where: { code, provinceId: provinceId!, isActive: true, province: { isActive: true } }, select: { id: true } }));
        const categoryIds = await Promise.all(parsed.preferences.preferredCategoryCodes.map((code) => this.resolve(tx, "jobCategory", code, async (value) => tx.jobCategory.findFirst({ where: { code: value, isActive: true }, select: { id: true } }))));
        const preferredProvinceIds = await Promise.all(parsed.preferences.provinceCodes.map((code) => this.resolve(tx, "province", code, async (value) => tx.province.findFirst({ where: { code: value, isActive: true }, select: { id: true } }))));
        const skillIds = await Promise.all(parsed.skills.map((skill) => this.resolve(tx, "skill", skill.skillCode, async (code) => tx.skill.findFirst({ where: { code, isActive: true, category: { isActive: true, OR: [{ parentId: null }, { parent: { isActive: true } }] } }, select: { id: true } }))));
        const languageIds = await Promise.all(parsed.languages.map((language) => this.resolve(tx, "language", language.languageCode, async (code) => tx.language.findFirst({ where: { code, isActive: true }, select: { id: true } }))));
        const certificateIds: Array<Array<string | null>> = [];
        for (const [index, language] of parsed.languages.entries()) {
          const ids: Array<string | null> = [];
          for (const certificate of language.certificates) {
            if (certificate.certificateTypeCode && !languageIds[index]) this.invalidReference("languageCertificateType");
            const type = certificate.certificateTypeCode ? await tx.languageCertificateType.findFirst({
              where: { code: certificate.certificateTypeCode, languageId: languageIds[index]!, isActive: true, language: { isActive: true } },
              select: { id: true, supportsLevel: true, supportsOverallScore: true, levelOptions: true, scoreFields: true },
            }) : null;
            if (certificate.certificateTypeCode && !type) {
              await this.missing(tx, "languageCertificateType");
            }
            if (type) this.validateCertificate(type, certificate);
            ids.push(type?.id ?? null);
          }
          certificateIds.push(ids);
        }

        const profile = await tx.candidateProfile.create({ data: {
          userId, fullName: parsed.personal.fullName, phone: parsed.personal.phone,
          dateOfBirth: parsed.personal.dateOfBirth, gender: parsed.personal.gender,
          countryCode: parsed.personal.countryCode, provinceId, wardId,
          addressLine: parsed.personal.addressLine, bio: parsed.personal.bio,
        }, select: { id: true } });
        await tx.candidatePrivacySetting.create({ data: { candidateProfileId: profile.id, ...CANDIDATE_IMPORT_PRIVACY_DEFAULTS } });
        await tx.systemUserRole.upsert({ where: { userId_roleId: { userId, roleId: role.id } }, update: {}, create: { userId, roleId: role.id, assignedByUserId: null } });
        for (const education of parsed.education) await tx.candidateEducation.create({ data: { candidateProfileId: profile.id, ...education } });
        for (const experience of parsed.experience) {
          const { skillsUsed, ...data } = experience;
          await tx.candidateExperience.create({ data: {
            candidateProfileId: profile.id, ...data,
            skills: { create: skillsUsed.map((skillName) => ({ skillName })) },
          } });
        }
        for (const [index, skill] of parsed.skills.entries()) {
          const { skillCode: _code, ...data } = skill;
          await tx.candidateSkill.create({ data: { candidateProfileId: profile.id, skillId: skillIds[index], ...data } });
        }
        for (const [index, language] of parsed.languages.entries()) {
          const { languageCode: _code, certificates, ...data } = language;
          const created = await tx.candidateLanguage.create({ data: { candidateProfileId: profile.id, languageId: languageIds[index], ...data }, select: { id: true } });
          for (const [ci, certificate] of certificates.entries()) {
            const { certificateTypeCode: _certificateCode, scores, ...certificateData } = certificate;
            await tx.candidateLanguageCertificate.create({ data: {
              candidateLanguageId: created.id, certificateTypeId: certificateIds[index]?.[ci] ?? null,
              ...certificateData, ...(scores ? { scores } : {}),
            } });
          }
        }
        await this.createPreferences(tx, profile.id, parsed.preferences, categoryIds, preferredProvinceIds);
        return tx.candidateProfile.findUniqueOrThrow({ where: { id: profile.id }, include: { province: true, ward: true, privacySetting: true, education: true, experience: { include: { skills: true } }, skills: true, languages: { include: { certificates: true } }, careerPreference: { include: { desiredPositions: true, preferredCategories: true, preferredLocations: true, preferredEmploymentTypes: true, preferredWorkplaceTypes: true } } } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
    } catch (error: unknown) {
      if (this.prismaCode(error, "P2002") || this.prismaCode(error, "P2034")) {
        throw new ConflictException({ code: "CANDIDATE_IMPORT_CONFLICT", message: "Candidate profile or draft changed during import. Reload and retry." });
      }
      throw error;
    }
  }

  private async createPreferences(tx: Tx, profileId: string, pref: ParsedCandidateDraft["preferences"], categoryIds: Array<string | null>, provinceIds: Array<string | null>) {
    await tx.candidateCareerPreference.create({ data: {
      candidateProfileId: profileId, locationMode: pref.locationMode, salaryType: pref.salaryType,
      salaryMin: pref.salaryMin, salaryMax: pref.salaryMax, currency: pref.currency,
      salaryPeriod: pref.salaryPeriod, desiredCareerLevel: pref.desiredCareerLevel,
      availabilityType: pref.availabilityType, availableFrom: pref.availableFrom,
      willingToRelocate: pref.willingToRelocate,
      desiredPositions: { create: pref.desiredPositions.map((title, displayOrder) => ({ title, displayOrder })) },
      preferredCategories: { create: categoryIds.map((jobCategoryId) => ({ jobCategoryId: jobCategoryId! })) },
      preferredLocations: { create: provinceIds.map((provinceId) => ({ provinceId: provinceId! })) },
      preferredEmploymentTypes: { create: pref.employmentTypes.map((employmentType) => ({ employmentType })) },
      preferredWorkplaceTypes: { create: pref.workplaceTypes.map((workplaceType) => ({ workplaceType })) },
    } });
  }

  private async resolve(tx: Tx, catalog: Catalog, code: string | null, find: (code: string) => Promise<{ id: string } | null>): Promise<string | null> {
    if (!code) return null;
    const found = await find(code);
    if (!found) await this.missing(tx, catalog);
    return found!.id;
  }
  private async missing(tx: Tx, catalog: Catalog): Promise<never> {
    const count = catalog === "jobCategory" ? await tx.jobCategory.count()
      : catalog === "skill" ? await tx.skill.count()
      : catalog === "language" ? await tx.language.count()
      : catalog === "languageCertificateType" ? await tx.languageCertificateType.count()
      : catalog === "province" ? await tx.province.count()
      : await tx.ward.count();
    if (!count) throw new ServiceUnavailableException({ code: "CANDIDATE_REFERENCE_CATALOG_UNAVAILABLE", catalog, message: `${catalog} catalog is not loaded.`, details: { catalog } });
    this.invalidReference(catalog);
  }
  private invalidReference(catalog: Catalog): never {
    throw new BadRequestException({ code: "CANDIDATE_REFERENCE_INVALID", catalog, message: `Invalid or inactive ${catalog} reference in onboarding draft.`, details: { catalog } });
  }
  private validateCertificate(type: { supportsLevel: boolean; supportsOverallScore: boolean; levelOptions: string[]; scoreFields: Prisma.JsonValue }, certificate: ParsedCandidateDraft["languages"][number]["certificates"][number]) {
    if ((certificate.level && !type.supportsLevel) || (certificate.level && type.levelOptions.length > 0 && !type.levelOptions.includes(certificate.level)) || (certificate.overallScore && !type.supportsOverallScore)) this.invalidReference("languageCertificateType");
    if (!Array.isArray(type.scoreFields) || type.scoreFields.some((field) => {
      if (!field || typeof field !== "object" || Array.isArray(field) || typeof field.code !== "string" || !field.code) return true;
      return ["min", "max", "step"].some((key) => field[key] !== undefined && (typeof field[key] !== "number" || !Number.isFinite(field[key]))) ||
        (typeof field.min === "number" && typeof field.max === "number" && field.min > field.max) ||
        (typeof field.step === "number" && field.step <= 0);
    })) {
      throw new ServiceUnavailableException({ code: "CANDIDATE_REFERENCE_CATALOG_INVALID", catalog: "languageCertificateType", message: "Certificate type score configuration is invalid." });
    }
    const fields = type.scoreFields;
    const allowed = new Map(fields.filter((field): field is { code: string; min?: number; max?: number; step?: number } => !!field && typeof field === "object" && !Array.isArray(field) && typeof field.code === "string").map((field) => [field.code, field]));
    for (const [code, value] of Object.entries(certificate.scores ?? {})) {
      const field = allowed.get(code);
      if (!field || !Number.isFinite(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max) || (field.step !== undefined && field.step > 0 && field.min !== undefined && Math.abs((value - field.min) / field.step - Math.round((value - field.min) / field.step)) > 1e-9)) {
        throw new BadRequestException({ code: "CANDIDATE_CERTIFICATE_SCORE_INVALID", message: "Certificate score is incompatible with its reference type." });
      }
    }
  }
  private prismaCode(error: unknown, code: string): boolean {
    return !!error && typeof error === "object" && "code" in error && error.code === code;
  }
}
