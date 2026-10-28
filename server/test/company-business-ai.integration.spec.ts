import "reflect-metadata";
import { type INestApplication, ServiceUnavailableException, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/exceptions/api-exception.filter";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { AiProviderService } from "../src/modules/ai/ai-provider.service";
import { TokenService } from "../src/modules/auth/services/token.service";
import { assertSafeIntegrationDatabase } from "./integration-safety";

const prefix = `cp13d-${randomUUID().slice(0, 8)}`;
const draft = { title: "Software Engineer", summary: "Build reliable systems.",
  responsibilities: ["Design services", "Review code"], requirements: ["TypeScript", "Testing"],
  niceToHave: [], benefits: [], suggestedSkills: ["TypeScript"] };
const improved = { improvedDescription: "Build reliable systems with a collaborative team.",
  improvedRequirements: "Experience building TypeScript services.", critique: [],
  readabilityScore: 85, inclusivityScore: 90 };
const screening = { jobTitle: "Software Engineer", questions: [
  { question: "How many years have you used TypeScript?", type: "NUMBER", isRequired: true,
    idealAnswer: "3", competencyTarget: "TypeScript experience" }] };
const interview = { jobTitle: "Software Engineer", stage: "TECHNICAL", categories: [
  { categoryName: "Engineering", questions: [{ question: "Describe a difficult design tradeoff.",
    purpose: "Explore design judgment.", sampleEvaluationCriteria: "Explains tradeoffs and outcomes." }] }] };
const plan = { jobTitle: "Software Engineer", estimatedTimeToHire: "30 days", phases: [
  { phaseName: "Sourcing", timelineWeeks: "Weeks 1-2", keyActivities: ["Publish an approved job"],
    recommendedSourcingChannels: ["FINDWORK"], kpiMilestones: ["Review applicants"] }],
  riskMitigationTips: ["Review progress weekly"] };
const providerResult = (value: object) => ({ text: JSON.stringify(value), inputTokens: 80,
  outputTokens: 120, totalTokens: 200 });
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("CP13D company Business AI integration", () => {
  let app: INestApplication;
  let db: PrismaService;
  let tokenService: TokenService;
  const generate = jest.fn();
  const provider = { modelName: jest.fn(() => "mock-business-model"), isConfigured: jest.fn(() => true),
    pricing: jest.fn(() => ({ inputPrice: 0.15, outputPrice: 0.6 })), generate };
  const userIds: string[] = [];
  const companyIds: string[] = [];
  let admin: { id: string; token: string };
  let ownerA: { id: string; token: string };
  let ownerB: { id: string; token: string };
  let candidate: { id: string; token: string };
  let viewer: { id: string; token: string };
  let hiringManager: { id: string; token: string };
  let companyA: string;
  let companyB: string;
  let ready = false;

  async function user(label: string, accountType: "EMPLOYER" | "CANDIDATE") {
    const id = randomUUID();
    const sessionId = randomUUID();
    const email = `${prefix}-${label}@example.test`;
    await db.user.create({ data: { id, email, emailNormalized: email, accountType,
      passwordHash: "cp13d-disposable-test-only" } });
    await db.authSession.create({ data: { id: sessionId, userId: id,
      refreshTokenHash: `cp13d-${sessionId}`, expiresAt: new Date(Date.now() + 3_600_000) } });
    userIds.push(id);
    return { id, token: await tokenService.signAccessToken(id, sessionId) };
  }

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiProviderService).useValue(provider).compile();
    app = ref.createNestApplication();
    const config = app.get(ConfigService);
    app.use(cookieParser());
    app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    db = app.get(PrismaService);
    await assertSafeIntegrationDatabase(db, config);
    ready = true;
    tokenService = app.get(TokenService);
    [admin, ownerA, ownerB, candidate, viewer, hiringManager] = await Promise.all([
      user("admin", "EMPLOYER"), user("owner-a", "EMPLOYER"), user("owner-b", "EMPLOYER"),
      user("candidate", "CANDIDATE"), user("viewer", "EMPLOYER"), user("hiring", "EMPLOYER")]);
    const superRole = await db.role.findFirstOrThrow({ where: { kind: "SYSTEM", systemCode: "SUPER_ADMIN" } });
    await db.systemUserRole.create({ data: { userId: admin.id, roleId: superRole.id } });
    const a = await request(app.getHttpServer()).post("/api/v1/companies")
      .set(auth(ownerA.token)).send({ name: "CP13D Company A", slug: `${prefix}-a` }).expect(201);
    const b = await request(app.getHttpServer()).post("/api/v1/companies")
      .set(auth(ownerB.token)).send({ name: "CP13D Company B", slug: `${prefix}-b` }).expect(201);
    companyA = a.body.id; companyB = b.body.id;
    companyIds.push(companyA, companyB);
    for (const [person, roleName] of [[viewer, "VIEWER"], [hiringManager, "HIRING_MANAGER"]] as const) {
      const role = await db.role.findFirstOrThrow({ where: { companyId: companyA, name: roleName } });
      const member = await db.companyMember.create({ data: { companyId: companyA, userId: person.id, status: "ACTIVE" } });
      await db.companyMemberRole.create({ data: { companyId: companyA, companyMemberId: member.id,
        roleId: role.id, assignedByUserId: ownerA.id } });
    }
  });

  afterAll(async () => {
    if (!ready) { await app?.close(); return; }
    try {
      await db.companyAiGenerationLog.deleteMany({ where: { companyId: { in: companyIds } } });
      await db.auditLog.deleteMany({ where: { OR: [
        { companyId: { in: companyIds } }, { actorUserId: { in: userIds } }] } });
      await db.companyMemberRole.deleteMany({ where: { companyId: { in: companyIds } } });
      await db.rolePermission.deleteMany({ where: { role: { companyId: { in: companyIds } } } });
      await db.companyMember.deleteMany({ where: { companyId: { in: companyIds } } });
      await db.role.deleteMany({ where: { companyId: { in: companyIds } } });
      await db.company.deleteMany({ where: { id: { in: companyIds } } });
      await db.systemUserRole.deleteMany({ where: { userId: { in: userIds } } });
      await db.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    } finally { await app.close(); }
  });

  it("requires Super Admin grant, membership, RBAC, active company and company isolation", async () => {
    const path = `/api/v1/companies/${companyA}/ai`;
    await request(app.getHttpServer()).get(`${path}/status`).set(auth(ownerA.token)).expect(403);
    await request(app.getHttpServer()).get(`${path}/status`).expect(401);
    await request(app.getHttpServer()).get(`${path}/status`).set(auth(candidate.token)).expect(403);
    await request(app.getHttpServer()).get(`/api/v1/companies/${companyB}/ai/quota`)
      .set(auth(ownerA.token)).expect(403);
    const adminPath = `/api/v1/admin/companies/${companyA}/capabilities/ai.business.access`;
    await request(app.getHttpServer()).patch(adminPath).set(auth(ownerA.token))
      .send({ isGranted: true, reason: "Owner cannot self grant AI" }).expect(403);
    await request(app.getHttpServer()).patch(adminPath).set(auth(admin.token))
      .send({ isGranted: true, reason: "CP13D disposable test grant" }).expect(200);
    const status = await request(app.getHttpServer()).get(`${path}/status`)
      .set(auth(ownerA.token)).expect(200);
    expect(status.body).toMatchObject({ status: "available", features: { jobDrafting: true } });
    provider.isConfigured.mockReturnValueOnce(false);
    const unconfigured = await request(app.getHttpServer()).get(`${path}/status`)
      .set(auth(ownerA.token)).expect(200);
    expect(unconfigured.body).toMatchObject({ status: "unconfigured", features: { jobDrafting: false } });
    const quota = await request(app.getHttpServer()).get(`${path}/quota`)
      .set(auth(ownerA.token)).expect(200);
    expect(quota.body).toMatchObject({ companyId: companyA, monthlyCreditsTotal: 100,
      monthlyCreditsRemaining: 100, dailyRequestsUsed: 0, dailyRequestsLimit: 20 });
    await request(app.getHttpServer()).get(`/api/v1/companies/${companyB}/ai/status`)
      .set(auth(ownerB.token)).expect(403);
    await request(app.getHttpServer()).post(`${path}/draft-job`).set(auth(viewer.token))
      .send({ title: "Software Engineer" }).expect(403);
    await request(app.getHttpServer()).get(`${path}/quota`).set(auth(viewer.token)).expect(200);
  });

  it("returns real-provider-shaped results for all five frontend POST contracts", async () => {
    const base = `/api/v1/companies/${companyA}/ai`;
    const cases: Array<[string, object, object]> = [
      ["draft-job", { title: "Software Engineer" }, draft],
      ["improve-job", { title: "Software Engineer",
        description: "We need a software engineer to design reliable TypeScript services." }, improved],
      ["screening-questions", { jobTitle: "Software Engineer", keySkills: ["TypeScript"] }, screening],
      ["interview-questions", { jobTitle: "Software Engineer", level: "SENIOR", stage: "TECHNICAL" }, interview],
      ["recruitment-plan", { jobTitle: "Software Engineer", targetHires: 2, targetTimelineDays: 30 }, plan],
    ];
    for (const [route, body, output] of cases) {
      generate.mockResolvedValueOnce(providerResult(output));
      const response = await request(app.getHttpServer()).post(`${base}/${route}`)
        .set(auth(ownerA.token)).send(body).expect(200);
      expect(response.body).toMatchObject(output);
    }
    generate.mockResolvedValueOnce(providerResult(draft));
    await request(app.getHttpServer()).post(`${base}/draft-job`)
      .set(auth(hiringManager.token)).send({ title: "Software Engineer" }).expect(200);
    const quota = await request(app.getHttpServer()).get(`${base}/quota`).set(auth(ownerA.token)).expect(200);
    expect(quota.body.monthlyCreditsRemaining).toBe(94);
    expect(await db.companyAiGenerationLog.count({ where: { companyId: companyA, status: "SUCCEEDED" } })).toBe(6);
    expect(await db.companyAiGenerationLog.count({ where: { companyId: companyB } })).toBe(0);
    expect(await db.job.count({ where: { companyId: companyA } })).toBe(0);
    expect(await db.application.count({ where: { companyId: companyA } })).toBe(0);
  });

  it("rejects malformed input and isolates optional job IDs", async () => {
    const base = `/api/v1/companies/${companyA}/ai`;
    await request(app.getHttpServer()).post(`${base}/draft-job`)
      .set(auth(ownerA.token)).send({ title: "x", candidateCv: "private" }).expect(400);
    await request(app.getHttpServer()).post(`${base}/improve-job`)
      .set(auth(ownerA.token)).send({ jobId: randomUUID(), title: "Software Engineer",
        description: "A valid description that is long enough for the required DTO." }).expect(404);
  });

  it("enforces monthly and daily quota atomically under concurrent requests", async () => {
    await db.companyAiQuota.update({ where: { companyId: companyA }, data: {
      monthlyLimit: 1, dailyLimit: 1, monthlyUsed: 0, dailyUsed: 0 } });
    generate.mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return providerResult(draft);
    });
    const path = `/api/v1/companies/${companyA}/ai/draft-job`;
    const responses = await Promise.all([1, 2].map(() => request(app.getHttpServer()).post(path)
      .set(auth(ownerA.token)).send({ title: "Software Engineer" })));
    expect(responses.map((response) => response.status).sort()).toEqual([200, 429]);
    expect(await db.companyAiGenerationLog.count({ where: { companyId: companyA, status: "SUCCEEDED" } })).toBe(7);
    const quota = await request(app.getHttpServer()).get(`/api/v1/companies/${companyA}/ai/quota`)
      .set(auth(ownerA.token)).expect(200);
    expect(quota.body.monthlyCreditsRemaining).toBe(0);
  });

  it("refunds failed provider calls and refuses malformed provider output", async () => {
    await db.companyAiQuota.update({ where: { companyId: companyA }, data: {
      monthlyLimit: 10, dailyLimit: 10, monthlyUsed: 0, dailyUsed: 0 } });
    const path = `/api/v1/companies/${companyA}/ai/draft-job`;
    generate.mockRejectedValueOnce(new ServiceUnavailableException({ code: "AI_PROVIDER_TIMEOUT" }));
    const timeout = await request(app.getHttpServer()).post(path)
      .set(auth(ownerA.token)).send({ title: "Software Engineer" }).expect(503);
    expect(timeout.body.code).toBe("AI_PROVIDER_TIMEOUT");
    generate.mockResolvedValueOnce({ text: "not json", inputTokens: 20, outputTokens: 40, totalTokens: 60 });
    const malformed = await request(app.getHttpServer()).post(path)
      .set(auth(ownerA.token)).send({ title: "Software Engineer" }).expect(503);
    expect(malformed.body.code).toBe("AI_PROVIDER_RESPONSE_INVALID");
    const quota = await request(app.getHttpServer()).get(`/api/v1/companies/${companyA}/ai/quota`)
      .set(auth(ownerA.token)).expect(200);
    expect(quota.body.dailyRequestsUsed).toBe(0);
    expect(await db.companyAiGenerationLog.count({ where: { companyId: companyA, status: "FAILED" } })).toBe(2);
  });

  it("revokes the next request, keeps candidate AI separate, and audits Super Admin changes", async () => {
    const adminPath = `/api/v1/admin/companies/${companyA}/capabilities/ai.business.access`;
    await request(app.getHttpServer()).patch(adminPath).set(auth(admin.token))
      .send({ isGranted: false, reason: "CP13D disposable test revoke" }).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/companies/${companyA}/ai/draft-job`)
      .set(auth(ownerA.token)).send({ title: "Software Engineer" }).expect(403);
    await request(app.getHttpServer()).get("/api/v1/ai/conversations")
      .set(auth(candidate.token)).expect(200);
    const audits = await db.auditLog.findMany({ where: { companyId: companyA,
      targetType: "CompanyPlatformCapability", actorUserId: admin.id },
      orderBy: { createdAt: "asc" } });
    expect(audits.map((row) => row.action)).toEqual([
      "admin.company.capability.grant", "admin.company.capability.revoke"]);
    expect(audits.every((row) => Boolean((row.afterData as { reason?: string })?.reason))).toBe(true);
  });
});
