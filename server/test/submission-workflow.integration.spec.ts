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
import { Prisma } from "../src/generated/prisma/client";
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
      CANDIDATE: { "profile.view": "OWN", "profile.update": "OWN", "resume.view": "OWN", "resume.create": "OWN", "resume.update": "OWN", "saved_job.manage": "OWN", "application.create": "OWN", "application.view": "OWN" },
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
    await db.savedJob.count({ where: { id: run } }); // Verify the additive migration before fixtures.
    await db.$queryRaw`SELECT 'MULTI_SELECT'::"ScreeningQuestionType"`; // Verify the enum migration.
    fixturePreflightPassed = true;
    process.stdout.write(`Submission integration run ID: ${run}\n`);
  });

  afterAll(async () => {
    if (!fixturePreflightPassed) { await app?.close(); return; }
    try {
      await db.$transaction(async (tx) => {
        const ownedCompanies = await tx.company.findMany({
          where: { slug: { startsWith: `submission-${run}-` } },
          select: { id: true, createdByUserId: true },
        });
        for (const company of ownedCompanies) if (!companies.includes(company.id)) companies.push(company.id);
        const jobs = await tx.job.findMany({ where: { companyId: { in: companies } }, select: { id: true } });
        const jobIds = jobs.map((job) => job.id);
        for (const jobId of jobIds) await tx.$queryRaw`SELECT "id" FROM "Job" WHERE "id" = ${jobId}::uuid FOR UPDATE`;
        const members = await tx.companyMember.findMany({
          where: { companyId: { in: companies } }, select: { id: true, userId: true },
        });
        const memberIds = members.map((member) => member.id);
        const applications = await tx.application.findMany({
          where: { OR: [{ companyId: { in: companies } }, { candidateProfile: { userId: { in: users } } }] },
          select: { id: true, companyId: true, candidateProfile: { select: { userId: true } } },
        });
        const applicationIds = applications.map((application) => application.id);
        const assignments = await tx.applicationAssignment.findMany({
          where: { applicationId: { in: applicationIds } },
          select: { applicationId: true, companyId: true, companyMemberId: true, assignedByMemberId: true },
        });
        const saved = await tx.savedJob.findMany({
          where: { OR: [{ jobId: { in: jobIds } }, { candidateProfile: { userId: { in: users } } }] },
          select: { jobId: true, candidateProfile: { select: { userId: true } } },
        });
        const category = categoryId ? { id: categoryId } : await tx.jobCategory.findUnique({
          where: { code: `submission-${run}` }, select: { id: true },
        });
        const unrelated = ownedCompanies.some((company) => !users.includes(company.createdByUserId)) ||
          members.some((member) => !users.includes(member.userId)) ||
          applications.some((application) => !companies.includes(application.companyId) ||
            !users.includes(application.candidateProfile.userId)) ||
          saved.some((entry) => !jobIds.includes(entry.jobId) || !users.includes(entry.candidateProfile.userId)) ||
          await tx.company.count({ where: { createdByUserId: { in: users }, id: { notIn: companies } } }) > 0 ||
          await tx.companyMember.count({ where: { userId: { in: users }, companyId: { notIn: companies } } }) > 0 ||
          await tx.companyInvitation.count({ where: { companyId: { in: companies } } }) > 0 ||
          await tx.companyLocation.count({ where: { companyId: { in: companies } } }) > 0 ||
          await tx.companyMemberPermission.count({ where: { companyId: { in: companies } } }) > 0 ||
          await tx.companyMemberRole.count({ where: { companyId: { in: companies }, assignedByUserId: { notIn: users } } }) > 0 ||
          await tx.systemUserPermission.count({ where: { userId: { in: users } } }) > 0 ||
          await tx.auditLog.count({ where: { companyId: { in: companies },
            OR: [{ actorUserId: null }, { actorUserId: { notIn: users } }] } }) > 0 ||
          await tx.applicationStatusHistory.count({ where: { applicationId: { in: applicationIds },
            OR: [{ changedByUserId: null }, { changedByUserId: { notIn: users } }] } }) > 0 ||
          assignments.some((assignment) => !applicationIds.includes(assignment.applicationId) ||
            !companies.includes(assignment.companyId) || !memberIds.includes(assignment.companyMemberId) ||
            !memberIds.includes(assignment.assignedByMemberId)) ||
          await tx.interview.count({ where: { applicationId: { in: applicationIds } } }) > 0 ||
          await tx.jobLocation.count({ where: { jobId: { in: jobIds } } }) > 0 ||
          await tx.jobSkill.count({ where: { jobId: { in: jobIds } } }) > 0 ||
          (category ? await tx.job.count({ where: { categoryId: category.id, companyId: { notIn: companies } } }) > 0 : false);
        if (unrelated) throw new Error("Submission integration cleanup refused: unrelated records reference this run.");

        await tx.applicationStatusHistory.deleteMany({ where: { applicationId: { in: applicationIds } } });
        await tx.applicationAssignment.deleteMany({ where: { applicationId: { in: applicationIds } } });
        await tx.applicationAnswer.deleteMany({ where: { applicationId: { in: applicationIds } } });
        await tx.application.deleteMany({ where: { id: { in: applicationIds } } });
        await tx.savedJob.deleteMany({ where: { candidateProfile: { userId: { in: users } } } });
        await tx.resumeVersion.deleteMany({ where: { resume: { candidateProfile: { userId: { in: users } } } } });
        await tx.resume.deleteMany({ where: { candidateProfile: { userId: { in: users } } } });
        await tx.screeningQuestion.deleteMany({ where: { job: { companyId: { in: companies } } } });
        await tx.job.deleteMany({ where: { companyId: { in: companies } } });
        await tx.auditLog.deleteMany({ where: { companyId: { in: companies } } });
        await tx.companyMemberRole.deleteMany({ where: { companyId: { in: companies } } });
        await tx.rolePermission.deleteMany({ where: { role: { companyId: { in: companies } } } });
        await tx.role.deleteMany({ where: { companyId: { in: companies } } });
        await tx.companyMember.deleteMany({ where: { companyId: { in: companies } } });
        await tx.company.deleteMany({ where: { id: { in: companies } } });
        await tx.candidateOnboardingDraft.deleteMany({ where: { userId: { in: users } } });
        await tx.candidateCareerPreference.deleteMany({ where: { candidateProfile: { userId: { in: users } } } });
        await tx.candidatePrivacySetting.deleteMany({ where: { candidateProfile: { userId: { in: users } } } });
        await tx.candidateProfile.deleteMany({ where: { userId: { in: users } } });
        await tx.systemUserRole.deleteMany({ where: { userId: { in: users } } });
        await tx.authSession.deleteMany({ where: { userId: { in: users } } });
        await tx.user.deleteMany({ where: { id: { in: users } } });
        if (category) await tx.jobCategory.delete({ where: { id: category.id } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
    } finally {
      await app.close();
    }
  });

  async function actor(label: string, expired = false) {
    const id = randomUUID();
    const email = `submission-${run}-${label}-${id.slice(0, 8)}@findwork.test`;
    await db.user.create({ data: { id, email, emailNormalized: email, passwordHash: "integration-test-only", status: "ACTIVE" } });
    users.push(id);
    const sessionId = randomUUID();
    const now = Date.now();
    await db.authSession.create({ data: {
      id: sessionId, userId: id, refreshTokenHash: randomUUID(),
      ...(expired ? { createdAt: new Date(now - 120_000) } : {}),
      expiresAt: new Date(now + (expired ? -60_000 : 3_600_000)),
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
    const questionRoute = `${jobs}/${jobId}/screening-questions`;
    const questionDraft = { version: draft.body.version, questions: [
      { type: "TEXT", label: "Years of experience?", isRequired: true, displayOrder: 0 },
      { type: "TEXTAREA", label: "Describe a relevant project.", isRequired: false, displayOrder: 1 },
      { type: "SELECT", label: "Work model?", isRequired: true, displayOrder: 2, options: ["Remote", "Office"] },
      { type: "MULTI_SELECT", label: "Core skills?", isRequired: true, displayOrder: 3, options: ["Node", "SQL"] },
      { type: "YES_NO", label: "Available soon?", isRequired: true, displayOrder: 4 },
    ] };
    await request(app.getHttpServer()).put(questionRoute)
      .set(bearer(candidate.token)).send(questionDraft).expect(403);
    await request(app.getHttpServer()).put(api(`/companies/${otherCompanyId}/jobs/${jobId}/screening-questions`))
      .set(bearer(otherOwner.token)).send(questionDraft).expect(404);
    const configured = await request(app.getHttpServer()).put(questionRoute)
      .set(bearer(owner.token)).send(questionDraft).expect(200);
    expect(configured.body.questions).toHaveLength(5);
    await request(app.getHttpServer()).get(questionRoute).set(bearer(owner.token)).expect(200)
      .expect((r) => expect(r.body.questions).toHaveLength(5));
    const questionIds = Object.fromEntries(configured.body.questions.map((question: { type: string; id: string }) => [question.type, question.id]));
    const published = await request(app.getHttpServer()).post(`${jobs}/${jobId}/publish`)
      .set(bearer(owner.token)).send({ version: configured.body.version }).expect(200);
    expect(published.body.status).toBe("PUBLISHED");
    expect(await db.job.findUniqueOrThrow({ where: { id: jobId },
      select: { companyId: true, status: true } })).toEqual({ companyId, status: "PUBLISHED" });
    await request(app.getHttpServer()).post(`${jobs}/${jobId}/pause`)
      .set(bearer(owner.token)).send({ version: draft.body.version }).expect(409);
    await request(app.getHttpServer()).get(api("/jobs?page=1&pageSize=1&q=Submission%20engineer"))
      .expect(200).expect((r) => {
        expect(r.body.pagination.pageSize).toBe(1);
        expect(r.body.data.some((x: { id: string }) => x.id === jobId)).toBe(true);
      });
    await request(app.getHttpServer()).get(api(`/jobs/${jobId}`)).expect(200)
      .expect((r) => expect(r.body.screeningQuestions.map((question: { id: string }) => question.id))
        .toContain(questionIds.MULTI_SELECT));
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
    const savedJob = await request(app.getHttpServer()).post(api("/candidate/saved-jobs"))
      .set(bearer(candidate.token)).send({ jobId }).expect(201);
    expect(savedJob.body).toMatchObject({ jobId, isAvailable: true, job: { id: jobId } });
    await request(app.getHttpServer()).get(api(`/candidate/saved-jobs/${jobId}/status`))
      .set(bearer(candidate.token)).expect(200).expect((r) => expect(r.body.saved).toBe(true));
    await request(app.getHttpServer()).get(api("/candidate/saved-jobs?page=1&pageSize=10"))
      .set(bearer(candidate.token)).expect(200)
      .expect((r) => expect(r.body.data.map((x: { jobId: string }) => x.jobId)).toContain(jobId));
    await request(app.getHttpServer()).post(api("/candidate/saved-jobs"))
      .set(bearer(candidate.token)).send({ jobId }).expect(409);
    await request(app.getHttpServer()).get(api(`/candidate/saved-jobs/${jobId}/status`))
      .set(bearer(otherCandidate.token)).expect(200).expect((r) => expect(r.body.saved).toBe(false));
    await request(app.getHttpServer()).delete(api(`/candidate/saved-jobs/${jobId}`))
      .set(bearer(otherCandidate.token)).expect(404);
    await request(app.getHttpServer()).post(api("/candidate/saved-jobs"))
      .set(bearer(candidate.token)).send({ jobId: "not-a-uuid" }).expect(400);
    await request(app.getHttpServer()).get(api("/candidate/saved-jobs")).expect(401);
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
    const applicationDetails = { contact: { fullName: "Application Candidate", email: "application@example.test", phone: "+84901234567" },
      currentLocation: "Ho Chi Minh City", availability: "within-2-weeks", preferredContactMethod: "phone" };
    await request(app.getHttpServer()).post(api(`/jobs/${jobId}/applications`))
      .set(bearer(otherCandidate.token)).send({ resumeId, resumeVersionId: versionId, details: applicationDetails }).expect(400);
    const nextResume = await request(app.getHttpServer()).patch(api(`/candidate/resumes/${resumeId}`))
      .set(bearer(candidate.token)).send({ name: "Updated CV", builderContent: { summary: "Senior engineer" }, expectedVersionNumber: 1 }).expect(200);
    expect(nextResume.body.versions[0].versionNumber).toBe(2);
    expect(nextResume.body.versions[0].builderSettings).toEqual({ accent: "blue" });
    await request(app.getHttpServer()).patch(api(`/candidate/resumes/${resumeId}`))
      .set(bearer(candidate.token)).send({ name: "Stale CV", builderContent: {}, expectedVersionNumber: 1 }).expect(409);

    const screeningAnswers = [
      { questionId: questionIds.TEXT, answer: "Five years" },
      { questionId: questionIds.TEXTAREA, answer: "Built a recruiting service." },
      { questionId: questionIds.SELECT, answer: "Remote" },
      { questionId: questionIds.MULTI_SELECT, answer: ["Node", "SQL"] },
      { questionId: questionIds.YES_NO, answer: false },
    ];
    const submission = { resumeId, resumeVersionId: nextResume.body.versions[0].id, details: applicationDetails, answers: screeningAnswers };
    await request(app.getHttpServer()).post(api(`/jobs/${jobId}/applications`))
      .set(bearer(candidate.token)).send({ ...submission, answers: screeningAnswers.slice(1) }).expect(400);
    await request(app.getHttpServer()).post(api(`/jobs/${jobId}/applications`))
      .set(bearer(candidate.token)).send({ ...submission, answers: screeningAnswers.map((answer) =>
        answer.questionId === questionIds.SELECT ? { ...answer, answer: "Unlisted" } : answer) }).expect(400);
    await request(app.getHttpServer()).post(api(`/jobs/${jobId}/applications`))
      .set(bearer(candidate.token)).send({ ...submission, answers: [...screeningAnswers, { questionId: randomUUID(), answer: "foreign" }] }).expect(400);
    expect(await db.application.count({ where: { jobId, candidateProfile: { userId: candidate.id } } })).toBe(0);
    const submitted = await request(app.getHttpServer()).post(api(`/jobs/${jobId}/applications`))
      .set(bearer(candidate.token)).send(submission).expect(201);
    const applicationId = submitted.body.id as string;
    expect(await db.user.findUniqueOrThrow({ where: { id: candidate.id },
      select: { status: true } })).toEqual({ status: "ACTIVE" });
    expect(submitted.body).toMatchObject({ fullNameSnapshot: "Application Candidate", emailSnapshot: "application@example.test",
      phoneSnapshot: "+84901234567", currentLocationSnapshot: "Ho Chi Minh City",
      availability: "WITHIN_2_WEEKS", preferredContactMethod: "PHONE" });
    expect(await db.applicationAnswer.count({ where: { applicationId } })).toBe(5);
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
        expect(r.body.answers).toHaveLength(5);
      });
    const historyBeforeDuplicate = await db.applicationStatusHistory.count({ where: { applicationId } });
    await request(app.getHttpServer()).post(api(`/jobs/${jobId}/applications`))
      .set(bearer(candidate.token)).send(submission).expect(409);
    expect(await db.applicationStatusHistory.count({ where: { applicationId } })).toBe(historyBeforeDuplicate);
    await request(app.getHttpServer()).get(api(`/candidate/applications/${applicationId}`))
      .set(bearer(otherCandidate.token)).expect(404);
    const applications = `${jobs}/${jobId}/applications`;
    await request(app.getHttpServer()).get(applications).set(bearer(recruiter.token))
      .expect(200).expect((r) => expect(r.body.data.some((x: { id: string }) => x.id === applicationId)).toBe(true));
    await request(app.getHttpServer()).get(`${applications}/${applicationId}`)
      .set(bearer(recruiter.token)).expect(200)
      .expect((r) => expect(r.body.answers.find((answer: { screeningQuestionId: string }) =>
        answer.screeningQuestionId === questionIds.MULTI_SELECT))
        .toMatchObject({ answerValue: ["Node", "SQL"], questionSnapshot: { label: "Core skills?" } }));
    await request(app.getHttpServer()).get(api(`/companies/${otherCompanyId}/jobs/${jobId}/applications/${applicationId}`))
      .set(bearer(otherOwner.token)).expect(404);
    const otherCompanyMember = await db.companyMember.findFirstOrThrow({
      where: { companyId: otherCompanyId, userId: otherOwner.id }, select: { id: true },
    });
    await request(app.getHttpServer()).patch(`${applications}/${applicationId}/assignment`)
      .set(bearer(recruiter.token)).send({ assignmentType: "PRIMARY_RECRUITER", companyMemberId: otherCompanyMember.id }).expect(404);
    await request(app.getHttpServer()).patch(`${applications}/${applicationId}/assignment`)
      .set(bearer(recruiter.token)).send({ assignmentType: "PRIMARY_RECRUITER", companyMemberId: recruiterMember.id }).expect(200);
    await request(app.getHttpServer()).get(`${applications}/${applicationId}`)
      .set(bearer(recruiter.token)).expect(200)
      .expect((r) => expect(r.body.assignments).toEqual([expect.objectContaining({
        assignmentType: "PRIMARY_RECRUITER", companyMemberId: recruiterMember.id,
      })]));
    const reviewed = await request(app.getHttpServer()).patch(`${applications}/${applicationId}/status`)
      .set(bearer(recruiter.token)).send({ version: 1, status: "REVIEWING" }).expect(200);
    expect(reviewed.body.status).toBe("REVIEWING");
    expect(await db.application.findUniqueOrThrow({ where: { id: applicationId },
      select: { companyId: true, jobId: true, status: true } })).toEqual({
      companyId, jobId, status: "REVIEWING",
    });
    expect((await db.applicationStatusHistory.findMany({ where: { applicationId },
      select: { toStatus: true } })).map((row) => row.toStatus).sort())
      .toEqual(["REVIEWING", "SUBMITTED"]);
    await request(app.getHttpServer()).patch(`${applications}/${applicationId}/status`)
      .set(bearer(recruiter.token)).send({ version: 1, status: "SHORTLISTED" }).expect(409);
    const offered = await request(app.getHttpServer()).patch(`${applications}/${applicationId}/status`)
      .set(bearer(recruiter.token)).send({ version: reviewed.body.version, status: "OFFERED", note: "HR approved" }).expect(200);
    expect(offered.body.status).toBe("OFFERED");
    await request(app.getHttpServer()).get(`${applications}/${applicationId}`)
      .set(bearer(recruiter.token)).expect(200)
      .expect((r) => expect(r.body.statusHistory.at(-1)).toMatchObject({ toStatus: "OFFERED", note: "HR approved" }));
    await request(app.getHttpServer()).get(api(`/candidate/applications/${applicationId}`))
      .set(bearer(candidate.token)).expect(200).expect((r) => {
        expect(r.body.status).toBe("OFFERED");
        expect(r.body.statusHistory.at(-1)).toMatchObject({ toStatus: "OFFERED" });
        expect(r.body.statusHistory.at(-1)).not.toHaveProperty("note");
      });
    await request(app.getHttpServer()).get(api("/candidate/applications"))
      .set(bearer(candidate.token)).expect(200)
      .expect((r) => expect(r.body.data.find((x: { id: string }) => x.id === applicationId).status).toBe("OFFERED"));
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
    await request(app.getHttpServer()).post(api("/candidate/saved-jobs"))
      .set(bearer(otherCandidate.token)).send({ jobId }).expect(404);
    await request(app.getHttpServer()).get(api("/candidate/saved-jobs"))
      .set(bearer(candidate.token)).expect(200)
      .expect((r) => expect(r.body.data.find((x: { jobId: string }) => x.jobId === jobId))
        .toMatchObject({ isAvailable: false, job: null }));
    const replaced = await request(app.getHttpServer()).put(questionRoute)
      .set(bearer(owner.token)).send({ version: paused.body.version, questions: [] }).expect(200);
    expect(replaced.body.questions).toEqual([]);
    const reopened = await request(app.getHttpServer()).post(`${jobs}/${jobId}/publish`)
      .set(bearer(owner.token)).send({ version: replaced.body.version }).expect(200);
    await request(app.getHttpServer()).get(api(`/jobs/${jobId}`)).expect(200)
      .expect((r) => expect(r.body.screeningQuestions).toEqual([]));
    await request(app.getHttpServer()).get(`${applications}/${applicationId}`)
      .set(bearer(recruiter.token)).expect(200)
      .expect((r) => expect(r.body.answers.find((answer: { screeningQuestionId: string }) =>
        answer.screeningQuestionId === questionIds.MULTI_SELECT))
        .toMatchObject({ answerValue: ["Node", "SQL"], questionSnapshot: { label: "Core skills?" } }));
    const plainResume = await request(app.getHttpServer()).post(api("/candidate/resumes"))
      .set(bearer(otherCandidate.token)).send({ name: "Plain CV", builderContent: { summary: "Analyst" } }).expect(201);
    const plainApplication = await request(app.getHttpServer()).post(api(`/jobs/${jobId}/applications`))
      .set(bearer(otherCandidate.token)).send({ resumeId: plainResume.body.id, resumeVersionId: plainResume.body.versions[0].id, details: applicationDetails }).expect(201);
    expect(await db.applicationAnswer.count({ where: { applicationId: plainApplication.body.id } })).toBe(0);
    const moderated = await request(app.getHttpServer()).post(api(`/admin/jobs/${jobId}/close`))
      .set(bearer(moderator.token)).expect(200);
    expect(moderated.body).toMatchObject({ id: jobId, status: "CLOSED", version: reopened.body.version + 1 });
    const moderationAudit = { actorUserId: moderator.id, companyId, action: "admin.job.close", targetType: "Job", targetId: jobId };
    expect(await db.auditLog.count({ where: moderationAudit })).toBe(1);
    await request(app.getHttpServer()).post(api(`/admin/jobs/${jobId}/close`))
      .set(bearer(moderator.token)).expect(409);
    expect(await db.auditLog.count({ where: moderationAudit })).toBe(1);
    await request(app.getHttpServer()).get(api(`/jobs/${jobId}`)).expect(404);
    await request(app.getHttpServer()).post(api("/candidate/saved-jobs"))
      .set(bearer(otherCandidate.token)).send({ jobId }).expect(404);
    await request(app.getHttpServer()).delete(api(`/candidate/saved-jobs/${jobId}`))
      .set(bearer(candidate.token)).expect(204);
    await request(app.getHttpServer()).get(api(`/candidate/saved-jobs/${jobId}/status`))
      .set(bearer(candidate.token)).expect(200).expect((r) => expect(r.body.saved).toBe(false));
  });
});
