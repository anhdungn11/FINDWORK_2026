import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  CandidateRepository,
  type CandidateProfileWriteInput,
} from "./candidate.repository";
import type { PutCandidateCareerPreferenceDto } from "./dto/career-preference.dto";
import type {
  CreateCandidateEducationDto,
  UpdateCandidateEducationDto,
} from "./dto/education.dto";
import type {
  CandidateExperienceSkillDto,
  CreateCandidateExperienceDto,
  UpdateCandidateExperienceDto,
} from "./dto/experience.dto";
import type {
  CreateCandidateLanguageCertificateDto,
  UpdateCandidateLanguageCertificateDto,
} from "./dto/language-certificate.dto";
import type {
  CreateCandidateLanguageDto,
  UpdateCandidateLanguageDto,
} from "./dto/language.dto";
import type { UpdateCandidatePrivacyDto } from "./dto/privacy.dto";
import type {
  CreateCandidateProfileDto,
  UpdateCandidateProfileDto,
} from "./dto/profile.dto";
import type {
  CreateCandidateSkillDto,
  UpdateCandidateSkillDto,
} from "./dto/skill.dto";
import type { ExperienceSkillInput } from "./types/candidate.types";

@Injectable()
export class CandidateService {
  constructor(private readonly candidateRepository: CandidateRepository) {}

  async createProfile(userId: string, dto: CreateCandidateProfileDto) {
    if (await this.candidateRepository.findProfileByUserId(userId)) {
      throw new ConflictException({
        code: "CANDIDATE_PROFILE_ALREADY_EXISTS",
        message: "Candidate profile already exists.",
      });
    }

    const role = await this.candidateRepository.findCandidateRole();
    const roleScopes = new Map(
      role?.permissions.map((grant) => [
        grant.permission.code,
        grant.dataScope,
      ]) ?? [],
    );

    if (
      !role ||
      role.kind !== "SYSTEM" ||
      !role.isActive ||
      roleScopes.get("profile.view") !== "OWN" ||
      roleScopes.get("profile.update") !== "OWN"
    ) {
      throw new InternalServerErrorException({
        code: "CANDIDATE_ROLE_NOT_CONFIGURED",
        message: "Candidate role is not configured correctly.",
      });
    }

    const location = await this.validateLocation(dto.provinceId ?? null, dto.wardId ?? null);
    const dateOfBirth = this.parseOptionalDate(dto.dateOfBirth ?? null);
    if (dateOfBirth && dateOfBirth.getTime() > Date.now()) {
      throw this.badRequest("CANDIDATE_DATE_OF_BIRTH_INVALID", "Date of birth cannot be in the future.");
    }

    try {
      return await this.candidateRepository.createProfileAndCandidateRole(
        userId,
        role.id,
        {
          fullName: this.requiredText(dto.fullName, "fullName"),
          phone: this.nullableText(dto.phone),
          dateOfBirth,
          gender: dto.gender ?? null,
          countryCode: this.normalizeCountryCode(dto.countryCode),
          provinceId: location.provinceId,
          wardId: location.wardId,
          addressLine: this.nullableText(dto.addressLine),
          bio: this.nullableText(dto.bio),
          avatarAssetKey: this.nullableText(dto.avatarAssetKey),
          careerStatus: dto.careerStatus ?? null,
        },
      );
    } catch (error: unknown) {
      if (this.isPrismaCode(error, "P2002")) {
        throw new ConflictException({
          code: "CANDIDATE_PROFILE_ALREADY_EXISTS",
          message: "Candidate profile already exists.",
        });
      }
      throw error;
    }
  }

  async getProfile(userId: string) {
    const profile = await this.candidateRepository.findProfileByUserId(userId);
    if (!profile) throw this.profileNotFound();
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateCandidateProfileDto) {
    const existing = await this.candidateRepository.findProfileByUserId(userId);
    if (!existing) throw this.profileNotFound();

    const provinceId =
      dto.provinceId !== undefined ? dto.provinceId : existing.provinceId;
    const wardId =
      dto.provinceId === null && dto.wardId === undefined
        ? null
        : dto.wardId !== undefined
          ? dto.wardId
          : existing.wardId;
    const location = await this.validateLocation(
      provinceId ?? null,
      wardId ?? null,
    );

    const data: CandidateProfileWriteInput = {};
    if (dto.fullName !== undefined) data.fullName = this.requiredText(dto.fullName, "fullName");
    if (dto.phone !== undefined) data.phone = this.nullableText(dto.phone);
    if (dto.dateOfBirth !== undefined) {
      const value = this.parseOptionalDate(dto.dateOfBirth);
      if (value && value.getTime() > Date.now()) {
        throw this.badRequest("CANDIDATE_DATE_OF_BIRTH_INVALID", "Date of birth cannot be in the future.");
      }
      data.dateOfBirth = value;
    }
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.countryCode !== undefined) data.countryCode = this.normalizeCountryCode(dto.countryCode);
    if (dto.provinceId !== undefined || dto.wardId !== undefined) {
      data.provinceId = location.provinceId;
      data.wardId = location.wardId;
    }
    if (dto.addressLine !== undefined) data.addressLine = this.nullableText(dto.addressLine);
    if (dto.bio !== undefined) data.bio = this.nullableText(dto.bio);
    if (dto.avatarAssetKey !== undefined) data.avatarAssetKey = this.nullableText(dto.avatarAssetKey);
    if (dto.careerStatus !== undefined) data.careerStatus = dto.careerStatus;

    if (Object.keys(data).length === 0) {
      throw this.badRequest("CANDIDATE_UPDATE_EMPTY", "At least one field must be provided.");
    }

    return this.candidateRepository.updateProfile(userId, data);
  }

  async listEducation(userId: string) {
    await this.requireProfile(userId);
    return this.candidateRepository.listEducation(userId);
  }

  async createEducation(userId: string, dto: CreateCandidateEducationDto) {
    await this.requireProfile(userId);
    const normalized = this.normalizeEducation(dto);
    const created = await this.candidateRepository.createEducation(userId, normalized);
    if (!created) throw this.profileNotFound();
    return created;
  }

  async updateEducation(userId: string, id: string, dto: UpdateCandidateEducationDto) {
    this.assertNonEmptyUpdate(dto, "education");
    const existing = await this.candidateRepository.findEducationOwned(userId, id);
    if (!existing) throw this.notFound("CANDIDATE_EDUCATION_NOT_FOUND", "Education record was not found.");

    const merged = this.normalizeEducation({
      school: dto.school ?? existing.school,
      degree: dto.degree ?? existing.degree,
      major: dto.major ?? existing.major,
      location: dto.location !== undefined ? dto.location : existing.location,
      startMonth: dto.startMonth ?? existing.startMonth,
      startYear: dto.startYear ?? existing.startYear,
      endMonth: dto.endMonth !== undefined ? dto.endMonth : existing.endMonth,
      endYear: dto.endYear !== undefined ? dto.endYear : existing.endYear,
      isStudying: dto.isStudying ?? existing.isStudying,
      gpa: dto.gpa !== undefined ? dto.gpa : existing.gpa === null ? null : Number(existing.gpa),
      gpaScale: dto.gpaScale !== undefined ? dto.gpaScale : existing.gpaScale === null ? null : Number(existing.gpaScale),
      achievements: dto.achievements !== undefined ? dto.achievements : existing.achievements,
      description: dto.description !== undefined ? dto.description : existing.description,
    });

    return this.candidateRepository.updateEducation(id, merged);
  }

  async deleteEducation(userId: string, id: string) {
    const result = await this.candidateRepository.deleteEducationOwned(userId, id);
    if (result.count !== 1) throw this.notFound("CANDIDATE_EDUCATION_NOT_FOUND", "Education record was not found.");
    return { deleted: true };
  }

  async listExperience(userId: string) {
    await this.requireProfile(userId);
    return this.candidateRepository.listExperience(userId);
  }

  async createExperience(userId: string, dto: CreateCandidateExperienceDto) {
    await this.requireProfile(userId);
    const skills = await this.normalizeExperienceSkills(dto.skills ?? []);
    const normalized = this.normalizeExperience(dto);
    const created = await this.candidateRepository.createExperience(userId, normalized, skills);
    if (!created) throw this.profileNotFound();
    return created;
  }

  async updateExperience(userId: string, id: string, dto: UpdateCandidateExperienceDto) {
    this.assertNonEmptyUpdate(dto, "experience");
    const existing = await this.candidateRepository.findExperienceOwned(userId, id);
    if (!existing) throw this.notFound("CANDIDATE_EXPERIENCE_NOT_FOUND", "Experience record was not found.");

    const normalized = this.normalizeExperience({
      companyName: dto.companyName ?? existing.companyName,
      position: dto.position ?? existing.position,
      employmentType: dto.employmentType ?? existing.employmentType,
      workplaceType: dto.workplaceType ?? existing.workplaceType,
      location: dto.location !== undefined ? dto.location : existing.location,
      startMonth: dto.startMonth ?? existing.startMonth,
      startYear: dto.startYear ?? existing.startYear,
      endMonth: dto.endMonth !== undefined ? dto.endMonth : existing.endMonth,
      endYear: dto.endYear !== undefined ? dto.endYear : existing.endYear,
      isCurrent: dto.isCurrent ?? existing.isCurrent,
      description: dto.description !== undefined ? dto.description : existing.description,
      achievements: dto.achievements !== undefined ? dto.achievements : existing.achievements,
    });

    const skills = dto.skills === undefined ? undefined : await this.normalizeExperienceSkills(dto.skills);
    return this.candidateRepository.updateExperience(id, normalized, skills);
  }

  async deleteExperience(userId: string, id: string) {
    const result = await this.candidateRepository.deleteExperienceOwned(userId, id);
    if (result.count !== 1) throw this.notFound("CANDIDATE_EXPERIENCE_NOT_FOUND", "Experience record was not found.");
    return { deleted: true };
  }

  async listSkills(userId: string) {
    await this.requireProfile(userId);
    return this.candidateRepository.listSkills(userId);
  }

  async createSkill(userId: string, dto: CreateCandidateSkillDto) {
    await this.requireProfile(userId);
    const source = await this.normalizeSkillSource(dto.skillId ?? null, dto.customSkillName ?? null);
    await this.ensureSkillNotDuplicate(userId, source.skillId, source.customSkillName);
    const created = await this.candidateRepository.createSkill(userId, {
      ...source,
      level: dto.level,
      yearsOfExperience: dto.yearsOfExperience ?? null,
      isHighlighted: dto.isHighlighted ?? false,
    });
    if (!created) throw this.profileNotFound();
    return created;
  }

  async updateSkill(userId: string, id: string, dto: UpdateCandidateSkillDto) {
    this.assertNonEmptyUpdate(dto, "skill");
    const existing = await this.candidateRepository.findSkillOwned(userId, id);
    if (!existing) throw this.notFound("CANDIDATE_SKILL_NOT_FOUND", "Candidate skill was not found.");

    const rawSkillId = dto.skillId !== undefined ? dto.skillId : existing.skillId;
    const rawCustom = dto.customSkillName !== undefined ? dto.customSkillName : existing.customSkillName;
    const source = await this.normalizeSkillSource(rawSkillId, rawCustom);
    await this.ensureSkillNotDuplicate(userId, source.skillId, source.customSkillName, id);

    return this.candidateRepository.updateSkill(id, {
      ...source,
      ...(dto.level === undefined ? {} : { level: dto.level }),
      ...(dto.yearsOfExperience === undefined ? {} : { yearsOfExperience: dto.yearsOfExperience }),
      ...(dto.isHighlighted === undefined ? {} : { isHighlighted: dto.isHighlighted }),
    });
  }

  async deleteSkill(userId: string, id: string) {
    const result = await this.candidateRepository.deleteSkillOwned(userId, id);
    if (result.count !== 1) throw this.notFound("CANDIDATE_SKILL_NOT_FOUND", "Candidate skill was not found.");
    return { deleted: true };
  }

  async listLanguages(userId: string) {
    await this.requireProfile(userId);
    return this.candidateRepository.listLanguages(userId);
  }

  async createLanguage(userId: string, dto: CreateCandidateLanguageDto) {
    await this.requireProfile(userId);
    const source = await this.normalizeLanguageSource(dto.languageId ?? null, dto.customLanguageName ?? null);
    await this.ensureLanguageNotDuplicate(userId, source.languageId, source.customLanguageName);
    const created = await this.candidateRepository.createLanguage(userId, {
      ...source,
      overallLevel: dto.overallLevel,
      listeningLevel: dto.listeningLevel,
      speakingLevel: dto.speakingLevel,
      readingLevel: dto.readingLevel,
      writingLevel: dto.writingLevel,
    });
    if (!created) throw this.profileNotFound();
    return created;
  }

  async updateLanguage(userId: string, id: string, dto: UpdateCandidateLanguageDto) {
    this.assertNonEmptyUpdate(dto, "language");
    const existing = await this.candidateRepository.findLanguageOwned(userId, id);
    if (!existing) throw this.notFound("CANDIDATE_LANGUAGE_NOT_FOUND", "Candidate language was not found.");

    const source = await this.normalizeLanguageSource(
      dto.languageId !== undefined ? dto.languageId : existing.languageId,
      dto.customLanguageName !== undefined ? dto.customLanguageName : existing.customLanguageName,
    );

    const sourceChanged =
      source.languageId !== existing.languageId ||
      (source.customLanguageName ?? "").toLocaleLowerCase() !==
        (existing.customLanguageName ?? "").toLocaleLowerCase();

    if (sourceChanged && existing.certificates.length > 0) {
      throw new ConflictException({
        code: "CANDIDATE_LANGUAGE_HAS_CERTIFICATES",
        message:
          "Remove language certificates before changing the language source.",
      });
    }

    await this.ensureLanguageNotDuplicate(userId, source.languageId, source.customLanguageName, id);

    return this.candidateRepository.updateLanguage(id, {
      ...source,
      ...(dto.overallLevel === undefined ? {} : { overallLevel: dto.overallLevel }),
      ...(dto.listeningLevel === undefined ? {} : { listeningLevel: dto.listeningLevel }),
      ...(dto.speakingLevel === undefined ? {} : { speakingLevel: dto.speakingLevel }),
      ...(dto.readingLevel === undefined ? {} : { readingLevel: dto.readingLevel }),
      ...(dto.writingLevel === undefined ? {} : { writingLevel: dto.writingLevel }),
    });
  }

  async deleteLanguage(userId: string, id: string) {
    const result = await this.candidateRepository.deleteLanguageOwned(userId, id);
    if (result.count !== 1) throw this.notFound("CANDIDATE_LANGUAGE_NOT_FOUND", "Candidate language was not found.");
    return { deleted: true };
  }

  async createCertificate(userId: string, languageId: string, dto: CreateCandidateLanguageCertificateDto) {
    const language = await this.requireLanguage(userId, languageId);
    const normalized = await this.normalizeCertificate(language.languageId, dto);
    return this.candidateRepository.createCertificate(languageId, normalized);
  }

  async updateCertificate(userId: string, languageId: string, certificateId: string, dto: UpdateCandidateLanguageCertificateDto) {
    this.assertNonEmptyUpdate(dto, "language certificate");
    const language = await this.requireLanguage(userId, languageId);
    const existing = await this.candidateRepository.findCertificateOwned(userId, languageId, certificateId);
    if (!existing) throw this.notFound("CANDIDATE_CERTIFICATE_NOT_FOUND", "Language certificate was not found.");

    const normalized = await this.normalizeCertificate(language.languageId, {
      certificateTypeId: dto.certificateTypeId !== undefined ? dto.certificateTypeId : existing.certificateTypeId,
      customCertificateName: dto.customCertificateName !== undefined ? dto.customCertificateName : existing.customCertificateName,
      level: dto.level !== undefined ? dto.level : existing.level,
      overallScore: dto.overallScore !== undefined ? dto.overallScore : existing.overallScore,
      scores:
        dto.scores !== undefined
          ? dto.scores
          : this.asCandidateScores(existing.scores),
      issuedDate: dto.issuedDate !== undefined ? dto.issuedDate : this.formatDate(existing.issuedDate),
      expiryDate: dto.expiryDate !== undefined ? dto.expiryDate : this.formatDate(existing.expiryDate),
      issuer: dto.issuer !== undefined ? dto.issuer : existing.issuer,
      credentialId: dto.credentialId !== undefined ? dto.credentialId : existing.credentialId,
      verificationUrl: dto.verificationUrl !== undefined ? dto.verificationUrl : existing.verificationUrl,
    });
    if (dto.scores === undefined) delete (normalized as { scores?: unknown }).scores;
    return this.candidateRepository.updateCertificate(certificateId, normalized);
  }

  async deleteCertificate(userId: string, languageId: string, certificateId: string) {
    const result = await this.candidateRepository.deleteCertificateOwned(userId, languageId, certificateId);
    if (result.count !== 1) throw this.notFound("CANDIDATE_CERTIFICATE_NOT_FOUND", "Language certificate was not found.");
    return { deleted: true };
  }

  async getCareerPreference(userId: string) {
    await this.requireProfile(userId);
    const value = await this.candidateRepository.getCareerPreference(userId);
    if (!value) throw this.notFound("CANDIDATE_CAREER_PREFERENCE_NOT_FOUND", "Career preference was not found.");
    return value;
  }

  async putCareerPreference(userId: string, dto: PutCandidateCareerPreferenceDto) {
    await this.requireProfile(userId);

    const desiredPositions = this.uniqueStrings(dto.desiredPositions ?? [], "desiredPositions");
    const preferredCategoryIds = this.uniqueValues(dto.preferredCategoryIds ?? []);
    const requestedProvinceIds = dto.locationMode === "NATIONWIDE" ? [] : this.uniqueValues(dto.preferredProvinceIds ?? []);
    const preferredEmploymentTypes = this.uniqueValues(dto.preferredEmploymentTypes ?? []);
    const preferredWorkplaceTypes = this.uniqueValues(dto.preferredWorkplaceTypes ?? []);

    if (preferredCategoryIds.length > 0) {
      const count = await this.candidateRepository.countActiveCategories(preferredCategoryIds);
      if (count !== preferredCategoryIds.length) {
        throw this.badRequest("CANDIDATE_REFERENCE_INVALID", "One or more preferred job categories are invalid or inactive.");
      }
    }
    if (requestedProvinceIds.length > 0) {
      const count = await this.candidateRepository.countActiveProvinces(requestedProvinceIds);
      if (count !== requestedProvinceIds.length) {
        throw this.badRequest("CANDIDATE_REFERENCE_INVALID", "One or more preferred provinces are invalid or inactive.");
      }
    }

    const salaryMin = dto.salaryType === "RANGE" ? dto.salaryMin ?? null : null;
    const salaryMax = dto.salaryType === "RANGE" ? dto.salaryMax ?? null : null;
    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      throw this.badRequest("CANDIDATE_SALARY_RANGE_INVALID", "salaryMin cannot be greater than salaryMax.");
    }

    const availabilityType = dto.availabilityType ?? null;
    const availableFrom = availabilityType === "SPECIFIC_DATE"
      ? this.parseRequiredDate(dto.availableFrom, "availableFrom")
      : null;

    const result = await this.candidateRepository.putCareerPreference(userId, {
      locationMode: dto.locationMode,
      salaryType: dto.salaryType,
      salaryMin,
      salaryMax,
      currency: (dto.currency ?? "VND").trim().toUpperCase(),
      salaryPeriod: dto.salaryPeriod ?? "MONTH",
      desiredCareerLevel: dto.desiredCareerLevel ?? null,
      availabilityType,
      availableFrom,
      willingToRelocate: dto.willingToRelocate ?? false,
      desiredPositions,
      preferredCategoryIds,
      preferredProvinceIds: requestedProvinceIds,
      preferredEmploymentTypes,
      preferredWorkplaceTypes,
    });
    if (!result) throw this.profileNotFound();
    return result;
  }

  async getPrivacy(userId: string) {
    await this.requireProfile(userId);
    const privacy = await this.candidateRepository.getPrivacy(userId);
    if (!privacy) {
      return this.candidateRepository.updatePrivacy(userId, {});
    }
    return privacy;
  }

  async updatePrivacy(userId: string, dto: UpdateCandidatePrivacyDto) {
    await this.requireProfile(userId);
    const data = {
      ...(dto.searchableProfile === undefined ? {} : { searchableProfile: dto.searchableProfile }),
      ...(dto.showEmail === undefined ? {} : { showEmail: dto.showEmail }),
      ...(dto.showPhone === undefined ? {} : { showPhone: dto.showPhone }),
      ...(dto.allowResumeDownload === undefined ? {} : { allowResumeDownload: dto.allowResumeDownload }),
      ...(dto.allowJobMatching === undefined ? {} : { allowJobMatching: dto.allowJobMatching }),
    };
    if (Object.keys(data).length === 0) {
      throw this.badRequest("CANDIDATE_UPDATE_EMPTY", "At least one privacy field must be provided.");
    }
    const result = await this.candidateRepository.updatePrivacy(userId, data);
    if (!result) throw this.profileNotFound();
    return result;
  }

  private async requireProfile(userId: string) {
    const profile = await this.candidateRepository.findProfileByUserId(userId);
    if (!profile) throw this.profileNotFound();
    return profile;
  }

  private normalizeEducation(dto: CreateCandidateEducationDto) {
    const isStudying = dto.isStudying ?? false;
    const endMonth = isStudying ? null : dto.endMonth ?? null;
    const endYear = isStudying ? null : dto.endYear ?? null;
    this.validateMonthYearRange(dto.startMonth, dto.startYear, endMonth, endYear, "CANDIDATE_EDUCATION_DATE_INVALID");

    const gpa = dto.gpa ?? null;
    const gpaScale = dto.gpaScale ?? null;
    if ((gpa === null) !== (gpaScale === null)) {
      throw this.badRequest("CANDIDATE_GPA_INVALID", "GPA and GPA scale must be provided together.");
    }
    if (gpa !== null && gpaScale !== null && (gpaScale <= 0 || gpa > gpaScale)) {
      throw this.badRequest("CANDIDATE_GPA_INVALID", "GPA must be within its positive GPA scale.");
    }

    return {
      school: this.requiredText(dto.school, "school"),
      degree: this.requiredText(dto.degree, "degree"),
      major: this.requiredText(dto.major, "major"),
      location: this.nullableText(dto.location),
      startMonth: dto.startMonth,
      startYear: dto.startYear,
      endMonth,
      endYear,
      isStudying,
      gpa,
      gpaScale,
      achievements: this.nullableText(dto.achievements),
      description: this.nullableText(dto.description),
    };
  }

  private normalizeExperience(dto: Omit<CreateCandidateExperienceDto, "skills">) {
    const isCurrent = dto.isCurrent ?? false;
    const endMonth = isCurrent ? null : dto.endMonth ?? null;
    const endYear = isCurrent ? null : dto.endYear ?? null;
    this.validateMonthYearRange(dto.startMonth, dto.startYear, endMonth, endYear, "CANDIDATE_EXPERIENCE_DATE_INVALID");
    return {
      companyName: this.requiredText(dto.companyName, "companyName"),
      position: this.requiredText(dto.position, "position"),
      employmentType: dto.employmentType,
      workplaceType: dto.workplaceType,
      location: this.nullableText(dto.location),
      startMonth: dto.startMonth,
      startYear: dto.startYear,
      endMonth,
      endYear,
      isCurrent,
      description: this.nullableText(dto.description),
      achievements: this.nullableText(dto.achievements),
    };
  }

  private async normalizeExperienceSkills(items: CandidateExperienceSkillDto[]): Promise<ExperienceSkillInput[]> {
    const masterIds = this.uniqueValues(items.flatMap((item) => item.skillId ? [item.skillId] : []));
    const masters = await this.candidateRepository.findActiveSkills(masterIds);
    const masterMap = new Map<string, string>(
      masters.map((skill: { id: string; name: string }) => [
        skill.id,
        skill.name,
      ]),
    );
    if (masterMap.size !== masterIds.length) {
      throw this.badRequest("CANDIDATE_REFERENCE_INVALID", "One or more experience skills are invalid or inactive.");
    }

    const normalized: ExperienceSkillInput[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      const custom = this.nullableText(item.skillName);
      const hasMaster = Boolean(item.skillId);
      const hasCustom = Boolean(custom);
      if (hasMaster === hasCustom) {
        throw this.badRequest("CANDIDATE_SKILL_SOURCE_INVALID", "Each experience skill must use exactly one source: skillId or skillName.");
      }
      const skillName = item.skillId ? masterMap.get(item.skillId)! : custom!;
      const key = item.skillId ? `id:${item.skillId}` : `custom:${skillName.toLocaleLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push({ skillId: item.skillId ?? null, skillName });
    }
    return normalized;
  }

  private async normalizeSkillSource(skillId: string | null, customSkillName: string | null) {
    const custom = this.nullableText(customSkillName);
    if (Boolean(skillId) === Boolean(custom)) {
      throw this.badRequest("CANDIDATE_SKILL_SOURCE_INVALID", "Exactly one of skillId or customSkillName is required.");
    }
    if (skillId) {
      const masters = await this.candidateRepository.findActiveSkills([skillId]);
      if (masters.length !== 1) {
        throw this.badRequest("CANDIDATE_REFERENCE_INVALID", "Selected skill is invalid or inactive.");
      }
      return { skillId, customSkillName: null };
    }
    return { skillId: null, customSkillName: custom };
  }

  private async ensureSkillNotDuplicate(userId: string, skillId: string | null, customSkillName: string | null, excludeId?: string) {
    if (await this.candidateRepository.findSkillDuplicate(userId, skillId, customSkillName, excludeId)) {
      throw new ConflictException({
        code: "CANDIDATE_SKILL_ALREADY_EXISTS",
        message: "This skill is already present in the candidate profile.",
      });
    }
  }

  private async normalizeLanguageSource(languageId: string | null, customLanguageName: string | null) {
    const custom = this.nullableText(customLanguageName);
    if (Boolean(languageId) === Boolean(custom)) {
      throw this.badRequest("CANDIDATE_LANGUAGE_SOURCE_INVALID", "Exactly one of languageId or customLanguageName is required.");
    }
    if (languageId && !(await this.candidateRepository.findActiveLanguage(languageId))) {
      throw this.badRequest("CANDIDATE_REFERENCE_INVALID", "Selected language is invalid or inactive.");
    }
    return languageId
      ? { languageId, customLanguageName: null }
      : { languageId: null, customLanguageName: custom };
  }

  private async ensureLanguageNotDuplicate(userId: string, languageId: string | null, customLanguageName: string | null, excludeId?: string) {
    if (await this.candidateRepository.findLanguageDuplicate(userId, languageId, customLanguageName, excludeId)) {
      throw new ConflictException({
        code: "CANDIDATE_LANGUAGE_ALREADY_EXISTS",
        message: "This language is already present in the candidate profile.",
      });
    }
  }

  private async requireLanguage(userId: string, languageId: string) {
    const language = await this.candidateRepository.findLanguageOwned(userId, languageId);
    if (!language) throw this.notFound("CANDIDATE_LANGUAGE_NOT_FOUND", "Candidate language was not found.");
    return language;
  }

  private async normalizeCertificate(
    candidateMasterLanguageId: string | null,
    dto: CreateCandidateLanguageCertificateDto,
  ) {
    const customName = this.nullableText(dto.customCertificateName);
    if (Boolean(dto.certificateTypeId) === Boolean(customName)) {
      throw this.badRequest("CANDIDATE_CERTIFICATE_SOURCE_INVALID", "Exactly one of certificateTypeId or customCertificateName is required.");
    }

    if (dto.certificateTypeId) {
      if (!candidateMasterLanguageId) {
        throw this.badRequest(
          "CANDIDATE_CERTIFICATE_LANGUAGE_MISMATCH",
          "Master certificate types can only be used with a master language.",
        );
      }

      const type = await this.candidateRepository.findActiveCertificateType(
        dto.certificateTypeId,
      );
      if (!type || type.languageId !== candidateMasterLanguageId) {
        throw this.badRequest(
          "CANDIDATE_CERTIFICATE_LANGUAGE_MISMATCH",
          "Certificate type does not belong to the selected language or is inactive.",
        );
      }

      this.validateCertificatePayload(type, dto);
    }

    const issuedDate = this.parseOptionalDate(dto.issuedDate ?? null);
    const expiryDate = this.parseOptionalDate(dto.expiryDate ?? null);
    if (issuedDate && expiryDate && expiryDate < issuedDate) {
      throw this.badRequest("CANDIDATE_CERTIFICATE_DATE_INVALID", "Certificate expiry date cannot be before issued date.");
    }

    return {
      certificateTypeId: dto.certificateTypeId ?? null,
      customCertificateName: customName,
      level: this.nullableText(dto.level),
      overallScore: this.nullableText(dto.overallScore),
      ...(dto.scores === undefined ? {} : { scores: dto.scores }),
      issuedDate,
      expiryDate,
      issuer: this.nullableText(dto.issuer),
      credentialId: this.nullableText(dto.credentialId),
      verificationUrl: this.nullableText(dto.verificationUrl),
    };
  }

  private validateCertificatePayload(
    type: {
      supportsOverallScore: boolean;
      supportsLevel: boolean;
      levelOptions: string[];
      scoreFields: unknown;
    },
    dto: CreateCandidateLanguageCertificateDto,
  ): void {
    const level = this.nullableText(dto.level);
    const overallScore = this.nullableText(dto.overallScore);

    if (!type.supportsLevel && level) {
      throw this.badRequest(
        "CANDIDATE_CERTIFICATE_LEVEL_INVALID",
        "This certificate type does not support a level value.",
      );
    }

    if (
      level &&
      type.levelOptions.length > 0 &&
      !type.levelOptions.includes(level)
    ) {
      throw this.badRequest(
        "CANDIDATE_CERTIFICATE_LEVEL_INVALID",
        "Certificate level is not supported by the selected certificate type.",
      );
    }

    if (!type.supportsOverallScore && overallScore) {
      throw this.badRequest(
        "CANDIDATE_CERTIFICATE_SCORE_INVALID",
        "This certificate type does not support an overall score.",
      );
    }

    if (dto.scores === undefined || dto.scores === null) return;

    const fields = this.readCertificateScoreFields(type.scoreFields);
    const allowed = new Map(fields.map((field) => [field.code, field]));

    for (const [key, rawValue] of Object.entries(dto.scores)) {
      const field = allowed.get(key);
      if (!field) {
        throw this.badRequest(
          "CANDIDATE_CERTIFICATE_SCORE_INVALID",
          `Score field ${key} is not supported by the selected certificate type.`,
        );
      }

      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        throw this.badRequest(
          "CANDIDATE_CERTIFICATE_SCORE_INVALID",
          `Score field ${key} must be a finite number.`,
        );
      }

      if (field.min !== undefined && rawValue < field.min) {
        throw this.badRequest(
          "CANDIDATE_CERTIFICATE_SCORE_INVALID",
          `Score field ${key} is below its supported minimum.`,
        );
      }
      if (field.max !== undefined && rawValue > field.max) {
        throw this.badRequest(
          "CANDIDATE_CERTIFICATE_SCORE_INVALID",
          `Score field ${key} exceeds its supported maximum.`,
        );
      }
      if (
        field.step !== undefined &&
        field.step > 0 &&
        field.min !== undefined
      ) {
        const steps = (rawValue - field.min) / field.step;
        if (Math.abs(steps - Math.round(steps)) > 1e-9) {
          throw this.badRequest(
            "CANDIDATE_CERTIFICATE_SCORE_INVALID",
            `Score field ${key} does not match its supported step.`,
          );
        }
      }
    }
  }

  private asCandidateScores(
    value: unknown,
  ): CreateCandidateLanguageCertificateDto["scores"] | undefined {
    if (value === null) return null;
    if (typeof value !== "object" || Array.isArray(value)) return undefined;
    return value as NonNullable<
      CreateCandidateLanguageCertificateDto["scores"]
    >;
  }

  private readCertificateScoreFields(value: unknown): Array<{
    code: string;
    min?: number;
    max?: number;
    step?: number;
  }> {
    if (!Array.isArray(value)) return [];

    return value.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const record = item as Record<string, unknown>;
      if (typeof record.code !== "string" || !record.code) return [];
      return [
        {
          code: record.code,
          ...(typeof record.min === "number" ? { min: record.min } : {}),
          ...(typeof record.max === "number" ? { max: record.max } : {}),
          ...(typeof record.step === "number" ? { step: record.step } : {}),
        },
      ];
    });
  }

  private async validateLocation(provinceId: string | null, wardId: string | null) {
    if (!provinceId && wardId) {
      throw this.badRequest("CANDIDATE_LOCATION_INVALID", "wardId requires provinceId.");
    }
    if (provinceId && !(await this.candidateRepository.findActiveProvince(provinceId))) {
      throw this.badRequest("CANDIDATE_LOCATION_INVALID", "Province is invalid or inactive.");
    }
    if (wardId && provinceId && !(await this.candidateRepository.findActiveWard(wardId, provinceId))) {
      throw this.badRequest("CANDIDATE_LOCATION_INVALID", "Ward is invalid, inactive, or does not belong to the selected province.");
    }
    return { provinceId, wardId };
  }

  private validateMonthYearRange(startMonth: number, startYear: number, endMonth: number | null, endYear: number | null, code: string) {
    if ((endMonth === null) !== (endYear === null)) {
      throw this.badRequest(code, "End month and end year must be provided together.");
    }
    if (endYear !== null && endMonth !== null) {
      if (endYear < startYear || (endYear === startYear && endMonth < startMonth)) {
        throw this.badRequest(code, "End date cannot be before start date.");
      }
    }
  }

  private parseRequiredDate(value: string | null | undefined, field: string) {
    if (!value) throw this.badRequest("CANDIDATE_DATE_INVALID", `${field} is required.`);
    return new Date(`${value}T00:00:00.000Z`);
  }

  private parseOptionalDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    return new Date(`${value}T00:00:00.000Z`);
  }

  private formatDate(value: Date | null): string | null {
    return value ? value.toISOString().slice(0, 10) : null;
  }

  private normalizeCountryCode(value: string | null | undefined): string | null {
    const normalized = this.nullableText(value);
    return normalized ? normalized.toUpperCase() : null;
  }

  private requiredText(value: string, field: string): string {
    const normalized = value.trim();
    if (!normalized) throw this.badRequest("CANDIDATE_TEXT_INVALID", `${field} cannot be blank.`);
    return normalized;
  }

  private nullableText(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const normalized = value.trim();
    return normalized || null;
  }

  private uniqueValues<T extends string>(items: T[]): T[] {
    return [...new Set(items)];
  }

  private uniqueStrings(items: string[], field: string): string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      const normalized = this.requiredText(item, field);
      const key = normalized.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(normalized);
    }
    return result;
  }

  private assertNonEmptyUpdate(dto: object, resource: string): void {
    if (Object.keys(dto).length === 0) {
      throw this.badRequest(
        "CANDIDATE_UPDATE_EMPTY",
        `At least one ${resource} field must be provided.`,
      );
    }
  }

  private profileNotFound() {
    return this.notFound("CANDIDATE_PROFILE_NOT_FOUND", "Candidate profile was not found.");
  }

  private notFound(code: string, message: string) {
    return new NotFoundException({ code, message });
  }

  private badRequest(code: string, message: string) {
    return new BadRequestException({ code, message });
  }

  private isPrismaCode(error: unknown, code: string): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === code;
  }
}
