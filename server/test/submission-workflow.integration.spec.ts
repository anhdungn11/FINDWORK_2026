import "reflect-metadata";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/exceptions/api-exception.filter";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { TokenService } from "../src/modules/auth/services/token.service";
import { assertSafeIntegrationDatabase } from "./integration-safety";

/** Acceptance workflow. Writes only after the strict findwork_test identity check. Never run without authorization. */
describe("submission recruitment workflow E2E", () => {
  jest.setTimeout(120_000);
  let app: INestApplication;
  let db: PrismaService;
  let tokens: TokenService;
  const run = randomUUID();
  const users: string[] = [];
  const companies: string[] = [];
  let categoryId: string | undefined;
  let fixturePreflightPassed = false;

  const api = (path: string) => `/api/v1${path}`;
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    const config = app.get(ConfigService);
    app.use(cookieParser());
    app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    db = app.get(PrismaService);
    await assertSafeIntegrationDatabase(db, config);
    tokens = app.get(TokenService);
    const required = ["CANDIDATE", "SUPPORT_ADMIN", "MODERATION_ADMIN"];
    const roles = await db.role.findMany({ where: { systemCode: { in: required }, kind: "SYSTEM", isActive: true },
      select: { systemCode: true, permissions: { select: { dataScope: true, permission: { select: { code: true, isDeprecated: true } } } } } });
    if (roles.length !== required.length) throw new Error("Seeded candidate, support and moderation admin roles are required in findwork_test.");
    const requiredGrants: Record<string, Record<string, string>> = {
      CANDIDATE: { "profile.view": "OWN", "profile.update": "OWN", "resume.view": "OWN", "resume.create": "OWN", "resume.update": "OWN", "application.create": "OWN", "application.view": "OWN" },
      SUPPORT_ADMIN: { "user.view": "SYSTEM", "company.view": "SYSTEM", "job.view": "SYSTEM" },
      MODERATION_ADMIN: { "job.moderate": "SYSTEM" },
    };
    for (const role of roles) {
      const grants = new Set(role.permissions.filter((grant) => !grant.permission.isDeprecated)
        .map((grant) => `${grant.permission.code}:${grant.dataScope}`));
      if (Object.entries(requiredGrants[role.systemCode ?? ""] ?? {}).some(([code, scope]) => !grants.has(`${code}:${scope}`))) {
        throw new Error(`Required scoped grants are missing for ${role.systemCode} in findwork_test.`);
      }
    }
    const codes = ["company.update", "company.view", "application.view", "application.review"];
    if (await db.permission.count({ where: { code: { in: codes }, isDeprecated: false } }) !== codes.length) {
      throw new Error("Company permission registry is incomplete in findwork_test.");
    }
    fixturePreflightPassed = true;
  });

  afterAll(async () => {
    if (!fixturePreflightPassed) { await app?.close(); return; }
    const ownedCompanies = await db.company.findMany({
      where: { slug: { startsWith: `submission-${run}-` } }, select: { id: true },
    });
    for (const company of ownedCompanies) if (!companies.includes(company.id)) companies.push(company.id);
    // Delete only IDs created by this suite, in FK order. No broad reset or seed.
    await db.applicationStatusHistory.deleteMany({ where: { application: { companyId: { in: companies } } } });
    await db.application.deleteMany({ where: { companyId: { in: companies } } });
    await db.resumeVersion.deleteMany({ where: { resume: { candidateProfile: { userId: { in: users } } } } });
    await db.resume.deleteMany({ where: { candidateProfile: { userId: { in: users } } } });
    await db.job.deleteMany({ where: { companyId: { in: companies } } });
    await db.auditLog.deleteMany({ where: { companyId: { in: companies } } });
    await db.companyMemberRole.deleteMany({ where: { companyId: { in: companies } } });
    await db.rolePermission.deleteMany({ where: { role: { companyId: { in: companies } } } });
    await db.role.deleteMany({ where: { companyId: { in: companies } } });
    await db.companyMember.deleteMany({ where: { companyId: { in: companies } } });
    await db.company.deleteMany({ where: { id: { in: companies } } });
    await db.candidateOnboardingDraft.deleteMany({ where: { userId: { in: users } } });
    await db.candidateCareerPreference.deleteMany({ where: { candidateProfile: { userId: { in: users } } } });
    await db.candidatePrivacySetting.deleteMany({ where: { candidateProfile: { userId: { in: users } } } });
    await db.candidateProfile.deleteMany({ where: { userId: { in: users } } });
    await db.systemUserRole.deleteMany({ where: { userId: { in: users } } });
    await db.authSession.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    const category = categoryId ? { id: categoryId } : await db.jobCategory.findUnique({
      where: { code: `submission-${run}` }, select: { id: true },
    });
    if (category) await db.jobCategory.delete({ where: { id: category.id } });
    await app.close();
  });

  async function actor(label: string, expired = false) {
    const id = randomUUID();
    const email = `submission-${run}-${label}-${id.slice(0, 8)}@findwork.test`;
    await db.user.create({ data: { id, email, emailNormalized: email, passwordHash: "integration-test-only", status: "ACTIVE" } });
    users.push(id);
    const sessionId = randomUUID();
    await db.authSession.create({ data: {
      id: sessionId, userId: id, refreshTokenHash: randomUUID(),
      expiresAt: new Date(Date.now() + (expired ? -60_000 : 3_600_000)),
    } });
    return { id, email, token: await tokens.signAccessToken(id, sessionId) };
  }

  async function company(token: string, suffix: string) {
    const response = await request(app.getHttpServer()).post(api("/companies"))
      .set(bearer(token)).send({ name: `Submission ${suffix}`, slug: `submission-${run}-${suffix}` }).expect(201);
    companies.push(response.body.id as string);
    return response.body.id as string;
  }

  function onboardingDraft(email: string) {
    return {
      personal: { fullName: "Submission Candidate", email, phone: "", dateOfBirth: "", gender: "", countryCode: "VN", provinceCode: "", wardCode: "", addressLine: "", bio: "", avatarUrl: "" },
      education: [], experience: [], skills: [], languages: [],
      preferences: { desiredPositions: [], preferredCategoryCodes: [], locationPreference: { mode: "selected", provinceCodes: [] }, employmentTypes: [], workplaceTypes: [], salaryExpectation: { type: "range", min: null, max: null, currency: "VND", period: "month" }, desiredCareerLevel: "", availability: { type: "", availableFrom: "" }, willingToRelocate: false },
      resume: { resumeName: "", resumeUrl: "", fileName: "", fileSize: null, mimeType: "", hasExistingResume: false, createLater: true },
      privacy: { searchableProfile: false, showEmail: false, showPhone: false, allowResumeDownload: false, allowJobMatching: true },
    };
  }

  it("runs the complete flow and rejects tenant, identity, state and admin violations", async () => {
    const owner = await actor("owner");
    const otherOwner = await actor("other-owner");
    const candidate = await actor("candidate");
    const otherCandidate = await actor("other-candidate");
    const recruiter = await actor("recruiter");
    const admin = await actor("admin");
    const moderator = await actor("moderator");
    const expired = await actor("expired", true);
    const support = await db.role.findUniqueOrThrow({ where: { systemCode: "SUPPORT_ADMIN" }, select: { id: true } });
    await db.systemUserRole.create({ data: { userId: admin.id, roleId: support.id } });
    const moderation = await db.role.findUniqueOrThrow({ where: { systemCode: "MODERATION_ADMIN" }, select: { id: true } });
    await db.systemUserRole.create({ data: { userId: moderator.id, roleId: moderation.id } });
    const category = await db.jobCategory.create({ data: { code: `submission-${run}`, name: "Submission E2E", isActive: true } });
    categoryId = category.id;
    const companyId = await company(owner.token, "primary");
    const otherCompanyId = await company(otherOwner.token, "other");
    const recruiterRole = await db.role.findFirstOrThrow({ where: { companyId, name: "RECRUITER" }, select: { id: true } });
    const recruiterMember = await db.companyMember.create({ data: { companyId, userId: recruiter.id, status: "ACTIVE" }, select: { id: true } });
    await db.companyMemberRole.create({ data: {
      companyId, companyMemberId: recruiterMember.id, roleId: recruiterRole.id, assignedByUserId: owner.id,
    } });

    await request(app.getHttpServer()).get(api("/companies/me")).set(bearer(owner.token))
      .expect(200).expect((r) => expect(r.body.data.map((x: { id: string }) => x.id)).toContain(companyId));
    await request(app.getHttpServer()).get(api(`/companies/${otherCompanyId}/jobs`)).set(bearer(owner.token)).expect(403);
    await request(app.getHttpServer()).get(api("/admin/dashboard")).set(bearer(owner.token)).expect(403);
    await request(app.getHttpServer()).get(api("/admin/dashboard")).expect(401);
    await request(app.getHttpServer()).get(api("/admin/dashboard")).set(bearer(expired.token)).expect(401);

    const jobs = api(`/companies/${companyId}/jobs`);
    const draft = await request(app.getHttpServer()).post(jobs).set(bearer(owner.token)).send({
      categoryId, title: "Submission engineer", description: "Build reliable services for the submission workflow.",
      employmentType: "FULL_TIME", workplaceType: "REMOTE", salaryMin: 10000000,
    }).expect(201);
    const jobId = draft.body.id as string;
    expect(draft.body.status).toBe("DRAFT");
    await request(app.getHttpServer()).patch(`${jobs}/${jobId}`)
      .set(bearer(candidate.token)).send({ version: 1, title: "Unauthorized edit" }).expect(403);
    await request(app.getHttpServer()).patch(api(`/companies/${otherCompanyId}/jobs/${jobId}`))
      .set(bearer(otherOwner.token)).send({ version: 1, title: "Stolen job" }).expect(404);
    await request(app.getHttpServer()).post(api(`/companies/${otherCompanyId}/jobs/${jobId}/publish`))
      .set(bearer(otherOwner.token)).send({ version: 1 }).expect(404);
    const published = await request(app.getHttpServer()).post(`${jobs}/${jobId}/publish`)
      .set(bearer(owner.token)).send({ version: draft.body.version }).expect(200);
    expect(published.body.status).toBe("PUBLISHED");
    await request(app.getHttpServer()).post(`${jobs}/${jobId}/pause`)
      .set(bearer(owner.token)).send({ version: draft.body.version }).expect(409);
    await request(app.getHttpServer()).get(api("/jobs?page=1&pageSize=1&q=Submission%20engineer"))
      .expect(200).expect((r) => {
        expect(r.body.pagination.pageSize).toBe(1);
        expect(r.body.data.some((x: { id: string }) => x.id === jobId)).toBe(true);
      });
    await request(app.getHttpServer()).get(api(`/jobs/${jobId}`)).expect(200);
    await request(app.getHttpServer()).get(api(`/companies/${companyId}`)).expect(200)
      .expect((r) => {
        expect(r.body.jobsCount).toBe(1);
        expect(r.body.createdByUserId).toBeUndefined();
        expect(r.body.taxCode).toBeUndefined();
      });
    await request(app.getHttpServer()).get(api(`/jobs?companyId=${companyId}&pageSize=10`)).expect(200)
      .expect((r) => expect(r.body.data.map((x: { id: string }) => x.id)).toContain(jobId));

    await request(app.getHttpServer()).post(api("/candidate/resumes"))
      .set(bearer(candidate.token)).send({ name: "Premature CV", builderContent: {} })
      .expect(403);
    const savedDraft = await request(app.getHttpServer()).put(api("/candidate/onboarding-draft"))
      .set(bearer(candidate.token)).send({ version: 0, stepIndex: 6, data: onboardingDraft(candidate.email) }).expect(200);
    expect(savedDraft.body.version).toBe(1);
    await request(app.getHttpServer()).post(api("/candidate/profile/import-onboarding"))
      .set(bearer(candidate.token)).send({ version: 1, confirmPrivacy: false }).expect(400);
    const imported = await request(app.getHttpServer()).post(api("/candidate/profile/import-onboarding"))
      .set(bearer(candidate.token)).send({ version: 1, confirmPrivacy: true }).expect(201);
    expect(imported.body.privacySetting).toMatchObject({
      searchableProfile: false, showEmail: false, showPhone: false, allowResumeDownload: false,
    });
    await request(app.getHttpServer()).get(api("/candidate/onboarding-draft"))
      .set(bearer(candidate.token)).expect(200)
      .expect((r) => expect(r.body.version).toBe(1));
    await request(app.getHttpServer()).get(api("/candidate/profile"))
      .set(bearer(candidate.token)).expect(200);
    await request(app.getHttpServer()).post(api("/candidate/profile"))
      .set(bearer(otherCandidate.token)).send({ fullName: "Other Candidate" }).expect(201);
    const resume = await request(app.getHttpServer()).post(api("/candidate/resumes"))
      .set(bearer(candidate.token)).send({
        name: "Submission CV", builderContent: { summary: "Engineer" },
        templateCode: "classic", builderSettings: { accent: "blue" },
      }).expect(201);
    expect(resume.body.versions[0].builderSettings).toEqual({ accent: "blue" });
    const resumeId = resume.body.id as string;
    const versionId = resume.body.versions[0].id as string;
    await request(app.getHttpServer()).get(api(`/candidate/resumes/${resumeId}`))
      .set(bearer(otherCandidate.token)).expect(404);
    await request(app.getHttpServer()).post(api(`/jobs/${jobId}/applications`))
      .set(bearer(otherCandidate.token)).send({ resumeId, resumeVersionId: versionId }).expect(400);
    const nextResume = await request(app.getHttpServer()).patch(api(`/candidate/resumes/${resumeId}`))
      .set(bearer(candidate.token)).send({ name: "Updated CV", builderContent: { summary: "Senior engineer" }, expectedVersionNumber: 1 }).expect(200);
    expect(nextResume.body.versions[0].versionNumber).toBe(2);
    expect(nextResume.body.versions[0].builderSettings).toEqual({ accent: "blue" });
    await request(app.getHttpServer()).patch(api(`/candidate/resumes/${resumeId}`))
      .set(bearer(candidate.token)).send({ name: "Stale CV", builderContent: {}, expectedVersionNumber: 1 }).expect(409);

    const submitted = await request(app.getHttpServer()).post(api(`/jobs/${jobId}/applications`))
      .set(bearer(candidate.token)).send({ resumeId, resumeVersionId: nextResume.body.versions[0].id }).expect(201);
    const applicationId = submitted.body.id as string;
    await request(app.getHttpServer()).patch(api(`/candidate/resumes/${resumeId}`))
      .set(bearer(candidate.token)).send({ name: "Latest CV", builderContent: { summary: "Principal engineer" }, expectedVersionNumber: 2 }).expect(200);
    const renewedSessionId = randomUUID();
    await db.authSession.create({ data: {
      id: renewedSessionId, userId: candidate.id, refreshTokenHash: randomUUID(),
      expiresAt: new Date(Date.now() + 3_600_000),
    } });
    const renewedToken = await tokens.signAccessToken(candidate.id, renewedSessionId);
    await request(app.getHttpServer()).get(api(`/candidate/resumes/${resumeId}`))
      .set(bearer(renewedToken)).expect(200)
      .expect((r) => expect(r.body.versions[0].versionNumber).toBe(3));
    await request(app.getHttpServer()).get(api(`/candidate/applications/${applicationId}`))
      .set(bearer(renewedToken)).expect(200).expect((r) => {
        expect(r.body.resumeVersion.versionNumber).toBe(2);
        expect(r.body.resumeVersion.builderContent.summary).toBe("Senior engineer");
      });
    const historyBeforeDuplicate = await db.applicationStatusHistory.count({ where: { applicationId } });
    await request(app.getHttpServer()).post(api(`/jobs/${jobId}/applications`))
      .set(bearer(candidate.token)).send({ resumeId, resumeVersionId: versionId }).expect(409);
    expect(await db.applicationStatusHistory.count({ where: { applicationId } })).toBe(historyBeforeDuplicate);
    await request(app.getHttpServer()).get(api(`/candidate/applications/${applicationId}`))
      .set(bearer(otherCandidate.token)).expect(404);
    const applications = `${jobs}/${jobId}/applications`;
    await request(app.getHttpServer()).get(applications).set(bearer(recruiter.token))
      .expect(200).expect((r) => expect(r.body.data.some((x: { id: string }) => x.id === applicationId)).toBe(true));
    await request(app.getHttpServer()).get(`${applications}/${applicationId}`)
      .set(bearer(recruiter.token)).expect(200);
    await request(app.getHttpServer()).get(api(`/companies/${otherCompanyId}/jobs/${jobId}/applications/${applicationId}`))
      .set(bearer(otherOwner.token)).expect(404);
    const reviewed = await request(app.getHttpServer()).patch(`${applications}/${applicationId}/status`)
      .set(bearer(recruiter.token)).send({ version: 1, status: "REVIEWING" }).expect(200);
    expect(reviewed.body.status).toBe("REVIEWING");
    await request(app.getHttpServer()).patch(`${applications}/${applicationId}/status`)
      .set(bearer(recruiter.token)).send({ version: 1, status: "SHORTLISTED" }).expect(409);
    await request(app.getHttpServer()).get(api("/candidate/applications"))
      .set(bearer(candidate.token)).expect(200)
      .expect((r) => expect(r.body.data.find((x: { id: string }) => x.id === applicationId).status).toBe("REVIEWING"));
    await request(app.getHttpServer()).get(api("/admin/dashboard")).set(bearer(admin.token))
      .expect(200).expect((r) => expect(r.body.applications).toBeGreaterThanOrEqual(1));
    await request(app.getHttpServer()).get(api("/admin/users")) .set(bearer(admin.token)).expect(200);
    await request(app.getHttpServer()).get(api("/admin/companies")) .set(bearer(admin.token)).expect(200);
    await request(app.getHttpServer()).get(api("/admin/jobs")) .set(bearer(admin.token)).expect(200);
    await request(app.getHttpServer()).post(api(`/admin/jobs/${jobId}/close`))
      .set(bearer(admin.token)).expect(403);
    const paused = await request(app.getHttpServer()).post(`${jobs}/${jobId}/pause`)
      .set(bearer(owner.token)).send({ version: published.body.version }).expect(200);
    await request(app.getHttpServer()).get(api(`/jobs/${jobId}`)).expect(404);
    const reopened = await request(app.getHttpServer()).post(`${jobs}/${jobId}/publish`)
      .set(bearer(owner.token)).send({ version: paused.body.version }).expect(200);
    await request(app.getHttpServer()).get(api(`/jobs/${jobId}`)).expect(200);
    const moderated = await request(app.getHttpServer()).post(api(`/admin/jobs/${jobId}/close`))
      .set(bearer(moderator.token)).expect(200);
    expect(moderated.body).toMatchObject({ id: jobId, status: "CLOSED", version: reopened.body.version + 1 });
    const moderationAudit = { actorUserId: moderator.id, companyId, action: "admin.job.close", targetType: "Job", targetId: jobId };
    expect(await db.auditLog.count({ where: moderationAudit })).toBe(1);
    await request(app.getHttpServer()).post(api(`/admin/jobs/${jobId}/close`))
      .set(bearer(moderator.token)).expect(409);
    expect(await db.auditLog.count({ where: moderationAudit })).toBe(1);
    await request(app.getHttpServer()).get(api(`/jobs/${jobId}`)).expect(404);
  });
});
