import "reflect-metadata";
import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { CandidateOnboardingImportService } from "../src/modules/candidate/candidate-onboarding-import.service";
import { CANDIDATE_IMPORT_PRIVACY_DEFAULTS, parseCandidateOnboardingDraft } from "../src/modules/candidate/candidate-onboarding-import.parser";

const validRole = { id: "role", kind: "SYSTEM", isActive: true, permissions: [
  { dataScope: "OWN", permission: { code: "profile.view" } },
  { dataScope: "OWN", permission: { code: "profile.update" } },
] };

function draft() {
  return {
    personal: { fullName: "Test Candidate", email: "self@example.test", phone: "", dateOfBirth: "", gender: "", countryCode: "VN", provinceCode: "", wardCode: "", addressLine: "", bio: "", avatarUrl: "" },
    education: [], experience: [], skills: [], languages: [],
    preferences: { desiredPositions: [], preferredCategoryCodes: [], locationPreference: { mode: "selected", provinceCodes: [] }, employmentTypes: [], workplaceTypes: [], salaryExpectation: { type: "range", min: null, max: null, currency: "VND", period: "month" }, desiredCareerLevel: "", availability: { type: "", availableFrom: "" }, willingToRelocate: false },
    resume: { resumeName: "", resumeUrl: "", fileName: "", fileSize: null, mimeType: "", hasExistingResume: false, createLater: true },
    privacy: { searchableProfile: false, showEmail: false, showPhone: false, allowResumeDownload: false, allowJobMatching: true },
  };
}

function harness(content: unknown = draft()) {
  const tx = {
    candidateProfile: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "profile" }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "profile", userId: "self" }) },
    candidateOnboardingDraft: { findUnique: jest.fn().mockResolvedValue({ version: 3, content }), delete: jest.fn() },
    user: { findUnique: jest.fn().mockResolvedValue({ emailNormalized: "self@example.test" }) },
    role: { findUnique: jest.fn().mockResolvedValue(validRole) },
    candidatePrivacySetting: { create: jest.fn().mockResolvedValue({}) },
    systemUserRole: { upsert: jest.fn().mockResolvedValue({}) },
    candidateEducation: { create: jest.fn().mockResolvedValue({}) },
    candidateExperience: { create: jest.fn().mockResolvedValue({}) },
    candidateSkill: { create: jest.fn().mockResolvedValue({}) },
    candidateLanguage: { create: jest.fn().mockResolvedValue({ id: "candidate-language" }) },
    candidateLanguageCertificate: { create: jest.fn().mockResolvedValue({}) },
    resume: { create: jest.fn().mockResolvedValue({}) },
    candidateCareerPreference: { create: jest.fn().mockResolvedValue({}) },
    jobCategory: { findFirst: jest.fn().mockResolvedValue({ id: "category" }), count: jest.fn().mockResolvedValue(1) },
    skill: { findFirst: jest.fn().mockResolvedValue({ id: "skill" }), count: jest.fn().mockResolvedValue(1) },
    language: { findFirst: jest.fn().mockResolvedValue({ id: "language" }), count: jest.fn().mockResolvedValue(1) },
    languageCertificateType: { findFirst: jest.fn().mockResolvedValue({ id: "certificate", supportsLevel: true, supportsOverallScore: true, levelOptions: [], scoreFields: [] }), count: jest.fn().mockResolvedValue(1) },
    province: { findFirst: jest.fn().mockResolvedValue({ id: "province" }), count: jest.fn().mockResolvedValue(1) },
    ward: { findFirst: jest.fn().mockResolvedValue({ id: "ward" }), count: jest.fn().mockResolvedValue(1) },
  };
  const prisma = { $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>, _options?: unknown) => fn(tx)) };
  const service = new CandidateOnboardingImportService(prisma as never);
  return { tx, prisma, service };
}

describe("Candidate onboarding import", () => {
  it("rejects missing draft before any write", async () => {
    const { service, tx } = harness();
    tx.candidateOnboardingDraft.findUnique.mockResolvedValue(null as never);
    await expect(service.import("self", { version: 3, confirmPrivacy: true })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.candidateProfile.create).not.toHaveBeenCalled();
  });

  it("rejects stale version and existing profile", async () => {
    const stale = harness();
    await expect(stale.service.import("self", { version: 2, confirmPrivacy: true })).rejects.toBeInstanceOf(ConflictException);
    const existing = harness();
    existing.tx.candidateProfile.findUnique.mockResolvedValue({ id: "existing" } as never);
    await expect(existing.service.import("self", { version: 3, confirmPrivacy: true })).rejects.toBeInstanceOf(ConflictException);
    expect(existing.tx.candidateOnboardingDraft.findUnique).not.toHaveBeenCalled();
  });

  it("requires confirmPrivacy and valid nested content", async () => {
    const { service, tx } = harness();
    await expect(service.import("self", { version: 3, confirmPrivacy: false as never })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.candidateOnboardingDraft.findUnique).not.toHaveBeenCalled();
    const invalid = harness({ ...draft(), education: [{ id: "e1", school: "" }] });
    await expect(invalid.service.import("self", { version: 3, confirmPrivacy: true })).rejects.toBeInstanceOf(BadRequestException);
    expect(invalid.tx.candidateProfile.create).not.toHaveBeenCalled();
  });

  it("imports changed draft privacy while saving every backend default", async () => {
    const content = draft();
    content.privacy = { searchableProfile: true, showEmail: true, showPhone: true, allowResumeDownload: true, allowJobMatching: false };
    expect(parseCandidateOnboardingDraft(content).privacyDifferences).toEqual([
      "searchableProfile", "showEmail", "showPhone", "allowResumeDownload", "allowJobMatching",
    ]);
    const { service, tx } = harness(content);
    await expect(service.import("self", { version: 3, confirmPrivacy: true })).resolves.toMatchObject({ id: "profile" });
    expect(tx.candidatePrivacySetting.create).toHaveBeenCalledWith({ data: { candidateProfileId: "profile", ...CANDIDATE_IMPORT_PRIVACY_DEFAULTS } });
    await expect(tx.candidateOnboardingDraft.findUnique.mock.results[0]?.value).resolves.toMatchObject({ content });
    expect(tx.candidateOnboardingDraft.delete).not.toHaveBeenCalled();
  });

  it.each([
    ["avatar", (value: ReturnType<typeof draft>) => { value.personal.avatarUrl = "data:image/png;base64,SENSITIVE"; }, ["avatar"]],
    ["resume", (value: ReturnType<typeof draft>) => { value.resume.fileName = "private.pdf"; value.resume.fileSize = 100 as never; }, ["resume"]],
    ["both", (value: ReturnType<typeof draft>) => { value.personal.avatarUrl = "blob:sensitive"; value.resume.resumeUrl = "https://private.example.test/cv"; }, ["avatar", "resume"]],
  ])("rejects unsupported %s without confirmation and reports only asset groups", async (_label, mutate, expected) => {
    const content = draft(); mutate(content);
    const { service, tx } = harness(content);
    const error = await service.import("self", { version: 3, confirmPrivacy: true }).then(() => null, (failure: unknown) => failure as BadRequestException);
    expect(error).toBeInstanceOf(BadRequestException);
    const response = error!.getResponse();
    expect(response).toEqual({
      code: "CANDIDATE_IMPORT_UNSUPPORTED_ASSETS",
      message: "Confirm omission of unsupported onboarding assets before importing.",
      details: { unsupportedAssets: expected },
    });
    expect(JSON.stringify(response)).not.toMatch(/SENSITIVE|private\.pdf|blob:|https:/);
    expect(tx.candidateProfile.create).not.toHaveBeenCalled();
    expect(tx.candidatePrivacySetting.create).not.toHaveBeenCalled();
    expect(tx.candidateOnboardingDraft.delete).not.toHaveBeenCalled();
  });

  it("imports supported data after explicit asset omission and retains the original draft", async () => {
    const content = draft();
    content.personal.avatarUrl = "data:image/png;base64,SENSITIVE";
    content.resume.fileName = "private.pdf";
    content.resume.hasExistingResume = true;
    content.privacy.showEmail = true;
    const { service, tx } = harness(content);
    await expect(service.import("self", { version: 3, confirmPrivacy: true, confirmOmitUnsupportedAssets: true })).resolves.toMatchObject({ id: "profile" });
    expect(tx.candidateProfile.create).toHaveBeenCalledWith({ data: expect.objectContaining({ fullName: "Test Candidate" }), select: { id: true } });
    expect(tx.candidateProfile.create.mock.calls[0]?.[0].data).not.toHaveProperty("avatarAssetKey");
    expect(tx.resume.create).not.toHaveBeenCalled();
    expect(tx.candidatePrivacySetting.create).toHaveBeenCalledWith({ data: { candidateProfileId: "profile", ...CANDIDATE_IMPORT_PRIVACY_DEFAULTS } });
    expect(tx.candidateOnboardingDraft.delete).not.toHaveBeenCalled();
    expect(content.personal.avatarUrl).toBe("data:image/png;base64,SENSITIVE");
    expect(content.resume.fileName).toBe("private.pdf");
  });

  it("treats an explicit false omission flag as no asset confirmation", async () => {
    const content = draft();
    content.personal.avatarUrl = "blob:sensitive";
    const { service, tx } = harness(content);
    await expect(service.import("self", { version: 3, confirmPrivacy: true, confirmOmitUnsupportedAssets: false })).rejects.toMatchObject({ status: 400 });
    expect(tx.candidateProfile.create).not.toHaveBeenCalled();
    expect(tx.candidateOnboardingDraft.delete).not.toHaveBeenCalled();
  });

  it("does not require asset omission when there are no unsupported assets", async () => {
    const { service } = harness();
    await expect(service.import("self", { version: 3, confirmPrivacy: true, confirmOmitUnsupportedAssets: false })).resolves.toMatchObject({ id: "profile" });
    expect(parseCandidateOnboardingDraft(draft()).unsupportedAssets).toEqual([]);
    expect(parseCandidateOnboardingDraft(draft()).privacyDifferences).toEqual([]);
  });

  it("still rejects unmappable non-asset data and account email mismatch with omission confirmed", async () => {
    for (const content of [
      { ...draft(), personal: { ...draft().personal, fullName: "", avatarUrl: "blob:sensitive" } },
      { ...draft(), personal: { ...draft().personal, email: "other@example.test" } },
    ]) {
      const { service, tx } = harness(content);
      await expect(service.import("self", { version: 3, confirmPrivacy: true, confirmOmitUnsupportedAssets: true })).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.candidateProfile.create).not.toHaveBeenCalled();
      expect(tx.candidateOnboardingDraft.delete).not.toHaveBeenCalled();
    }
  });

  it("maps active reference codes, nested rows and privacy defaults without deleting draft", async () => {
    const content: ReturnType<typeof draft> & { skills: unknown[]; languages: unknown[] } = draft();
    content.personal.provinceCode = "P01";
    content.personal.wardCode = "W01";
    (content.preferences.preferredCategoryCodes as string[]) = ["JOB"];
    (content.preferences.locationPreference.provinceCodes as string[]) = ["P01"];
    (content.preferences.desiredPositions as string[]) = ["Engineer"];
    content.skills = [{ id: "s1", skillCode: "SKILL", customSkillName: "", level: "advanced", yearsOfExperience: "2", isHighlighted: true }] as never;
    content.languages = [{ id: "l1", languageCode: "en", customLanguageName: "", overallLevel: "fluent", listeningLevel: "fluent", speakingLevel: "fluent", readingLevel: "fluent", writingLevel: "fluent", certificates: [] }] as never;
    const { service, tx, prisma } = harness(content);
    await expect(service.import("self", { version: 3, confirmPrivacy: true })).resolves.toMatchObject({ id: "profile", userId: "self" });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction.mock.calls[0]?.[1]).toEqual({ isolationLevel: "Serializable", timeout: 30_000 });
    expect(tx.candidateProfile.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "self", provinceId: "province", wardId: "ward" }), select: { id: true } });
    expect(tx.candidateSkill.create).toHaveBeenCalledWith({ data: expect.objectContaining({ skillId: "skill", level: "ADVANCED" }) });
    expect(tx.candidateLanguage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ languageId: "language", overallLevel: "FLUENT" }), select: { id: true } });
    expect(tx.candidatePrivacySetting.create).toHaveBeenCalledWith({ data: { candidateProfileId: "profile", ...CANDIDATE_IMPORT_PRIVACY_DEFAULTS } });
    expect(tx.candidateOnboardingDraft.delete).not.toHaveBeenCalled();
    expect(tx.candidateCareerPreference.create).toHaveBeenCalledWith({ data: expect.objectContaining({ preferredCategories: { create: [{ jobCategoryId: "category" }] }, preferredLocations: { create: [{ provinceId: "province" }] } }) });
  });

  it("distinguishes an invalid reference from an unloaded catalog", async () => {
    const content = draft(); content.personal.provinceCode = "P01";
    const invalid = harness(content); invalid.tx.province.findFirst.mockResolvedValue(null as never);
    await expect(invalid.service.import("self", { version: 3, confirmPrivacy: true })).rejects.toBeInstanceOf(BadRequestException);
    const missing = harness(content); missing.tx.province.findFirst.mockResolvedValue(null as never); missing.tx.province.count.mockResolvedValue(0);
    await expect(missing.service.import("self", { version: 3, confirmPrivacy: true })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(missing.tx.candidateProfile.create).not.toHaveBeenCalled();
  });

  it("maps education, experience, custom skills, certificates and career preferences", async () => {
    const content = draft();
    content.education = [{ id: "e1", school: "University", degree: "Bachelor", major: "CS", location: "Hanoi", startMonth: "1", startYear: "2020", endMonth: "12", endYear: "2024", isStudying: false, gpa: "3.5", gpaScale: "4", achievements: "", description: "" }] as never;
    content.experience = [{ id: "x1", company: "Company", position: "Engineer", employmentType: "full-time", workplaceType: "remote", location: "", startMonth: "1", startYear: "2025", endMonth: "", endYear: "", isCurrent: true, description: "", achievements: "", skillsUsed: ["TypeScript"] }] as never;
    content.skills = [{ id: "s1", skillCode: "", customSkillName: "Custom Skill", level: "beginner", yearsOfExperience: "1.5", isHighlighted: false }] as never;
    content.languages = [{ id: "l1", languageCode: "en", customLanguageName: "", overallLevel: "fluent", listeningLevel: "fluent", speakingLevel: "fluent", readingLevel: "fluent", writingLevel: "fluent", certificates: [{ id: "c1", certificateTypeCode: "IELTS", customCertificateName: "", level: "", overallScore: "7.5", scores: [{ id: "sc1", componentCode: "listening", value: "7.5" }], issuedDate: "2025-01-01", expiryDate: "2027-01-01", issuer: "Issuer", credentialId: "", verificationUrl: "" }] }] as never;
    (content.preferences.employmentTypes as string[]) = ["full-time"];
    (content.preferences.workplaceTypes as string[]) = ["remote"];
    content.preferences.salaryExpectation.min = 10000000 as never;
    content.preferences.salaryExpectation.max = 20000000 as never;
    const { service, tx } = harness(content);
    tx.languageCertificateType.findFirst.mockResolvedValue({ id: "certificate", supportsLevel: false, supportsOverallScore: true, levelOptions: [], scoreFields: [{ code: "listening", min: 0, max: 9, step: 0.5 }] });
    await service.import("self", { version: 3, confirmPrivacy: true });
    expect(tx.candidateEducation.create).toHaveBeenCalledWith({ data: expect.objectContaining({ school: "University", startMonth: 1, endYear: 2024, gpa: 3.5 }) });
    expect(tx.candidateExperience.create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyName: "Company", employmentType: "FULL_TIME", workplaceType: "REMOTE", skills: { create: [{ skillName: "TypeScript" }] } }) });
    expect(tx.candidateSkill.create).toHaveBeenCalledWith({ data: expect.objectContaining({ skillId: null, customSkillName: "Custom Skill", yearsOfExperience: 1.5 }) });
    expect(tx.candidateLanguageCertificate.create).toHaveBeenCalledWith({ data: expect.objectContaining({ certificateTypeId: "certificate", overallScore: "7.5", scores: { listening: 7.5 } }) });
    expect(tx.candidateCareerPreference.create).toHaveBeenCalledWith({ data: expect.objectContaining({ salaryMin: 10000000, salaryMax: 20000000, preferredEmploymentTypes: { create: [{ employmentType: "FULL_TIME" }] }, preferredWorkplaceTypes: { create: [{ workplaceType: "REMOTE" }] } }) });
  });

  it("rejects a certificate whose score does not match catalog constraints", async () => {
    const content = draft();
    content.languages = [{ id: "l1", languageCode: "en", customLanguageName: "", overallLevel: "fluent", listeningLevel: "fluent", speakingLevel: "fluent", readingLevel: "fluent", writingLevel: "fluent", certificates: [{ id: "c1", certificateTypeCode: "IELTS", customCertificateName: "", level: "", overallScore: "", scores: [{ id: "s1", componentCode: "listening", value: "10" }], issuedDate: "", expiryDate: "", issuer: "", credentialId: "", verificationUrl: "" }] }] as never;
    const { service, tx } = harness(content);
    tx.languageCertificateType.findFirst.mockResolvedValue({ id: "certificate", supportsLevel: false, supportsOverallScore: true, levelOptions: [], scoreFields: [{ code: "listening", min: 0, max: 9 }] });
    await expect(service.import("self", { version: 3, confirmPrivacy: true })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.candidateProfile.create).not.toHaveBeenCalled();
  });

  it("propagates a nested write failure through the transaction and maps concurrent uniqueness conflicts", async () => {
    const content = draft();
    content.education = [{ id: "e", school: "School", degree: "Bachelor", major: "CS", location: "", startMonth: "1", startYear: "2020", endMonth: "", endYear: "", isStudying: true, gpa: "", gpaScale: "", achievements: "", description: "" }] as never;
    const rollback = harness(content);
    rollback.tx.candidateEducation.create.mockRejectedValue(new Error("nested write failed"));
    await expect(rollback.service.import("self", { version: 3, confirmPrivacy: true })).rejects.toThrow("nested write failed");
    expect(rollback.tx.candidateProfile.findUniqueOrThrow).not.toHaveBeenCalled();
    const race = harness(); race.tx.candidateProfile.create.mockRejectedValue({ code: "P2002" });
    await expect(race.service.import("self", { version: 3, confirmPrivacy: true })).rejects.toBeInstanceOf(ConflictException);
  });

  it("uses only principal userId and refuses a foreign draft or missing Candidate role", async () => {
    const { service, tx } = harness();
    await service.import("self", { version: 3, confirmPrivacy: true });
    expect(tx.candidateOnboardingDraft.findUnique).toHaveBeenCalledWith({ where: { userId: "self" }, select: { version: true, content: true } });
    expect(tx.candidateProfile.findUnique).toHaveBeenCalledWith({ where: { userId: "self" }, select: { id: true } });
    const role = harness(); role.tx.role.findUnique.mockResolvedValue(null as never);
    await expect(role.service.import("self", { version: 3, confirmPrivacy: true })).rejects.toMatchObject({ status: 500 });
    expect(role.tx.candidateProfile.create).not.toHaveBeenCalled();
  });

  it("parses required rows and rejects incomplete wizard data regardless of stepIndex", () => {
    expect(parseCandidateOnboardingDraft(draft()).personal.fullName).toBe("Test Candidate");
    expect(() => parseCandidateOnboardingDraft({ ...draft(), personal: { ...draft().personal, fullName: "" } })).toThrow(BadRequestException);
    expect(() => parseCandidateOnboardingDraft({ ...draft(), extra: true })).toThrow(BadRequestException);
  });
});
