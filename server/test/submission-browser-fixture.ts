/** Explicit, test-only browser fixture. Never invoked by Jest or application startup. */
import "reflect-metadata";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { Test } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import cookieParser from "cookie-parser";
import request from "supertest";
import { ApiExceptionFilter } from "../src/common/exceptions/api-exception.filter";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { assertSafeIntegrationDatabase } from "./integration-safety";

class FixtureError extends Error {}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function requireRunId(): string {
  const value = option("--run-id");
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new FixtureError("--run-id must be a UUID v4.");
  }
  return value.toLowerCase();
}

function safeEnv(): void {
  const envFile = option("--env-file");
  if (!envFile) throw new FixtureError("An explicit --env-file is required.");
  const loaded = loadEnv({ path: resolve(envFile), override: true, quiet: true });
  if (loaded.error) throw new FixtureError("The test environment file could not be read.");
  const fileEnv = loaded.parsed ?? {};
  const raw = fileEnv.DATABASE_URL;
  let url: URL;
  try { url = new URL(raw ?? ""); }
  catch { throw new FixtureError("Invalid test database URL."); }
  if (fileEnv.NODE_ENV !== "test" || !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.hostname !== "127.0.0.1" || url.port !== "5432" ||
      decodeURIComponent(url.pathname) !== "/findwork_test" || url.searchParams.get("schema") !== "public") {
    throw new FixtureError("Browser fixtures require findwork_test on 127.0.0.1:5432/public and NODE_ENV=test.");
  }
  if ((fileEnv.EMAIL_DELIVERY_MODE && fileEnv.EMAIL_DELIVERY_MODE !== "disabled") ||
      fileEnv.EMAIL_WORKER_ENABLED === "true" || fileEnv.EMAIL_INVITATION_DELIVERY_ENABLED === "true") {
    throw new FixtureError("Browser fixtures require email delivery and workers disabled.");
  }
  process.env.EMAIL_DELIVERY_MODE = "disabled";
  process.env.EMAIL_WORKER_ENABLED = "false";
  process.env.EMAIL_INVITATION_DELIVERY_ENABLED = "false";
}

function password(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 12 || value.length > 128) {
    throw new FixtureError(`${name} must be provided through the process environment (12-128 characters).`);
  }
  return value;
}

function check(response: { status: number; body: Record<string, unknown> }, expected: number, operation: string): void {
  if (response.status !== expected) {
    const code = typeof response.body.code === "string" ? response.body.code : "UNKNOWN";
    throw new FixtureError(`${operation} returned HTTP ${response.status} (${code}); run scoped cleanup before retrying.`);
  }
}

async function setup(app: INestApplication, db: PrismaService, runId: string): Promise<void> {
  const candidatePassword = password("BROWSER_FIXTURE_CANDIDATE_PASSWORD");
  const recruiterPassword = password("BROWSER_FIXTURE_RECRUITER_PASSWORD");
  const candidateEmail = `browser-${runId}-candidate@findwork.test`;
  const recruiterEmail = `browser-${runId}-recruiter@findwork.test`;
  const slug = `browser-${runId}`;
  if (await db.user.count({ where: { emailNormalized: { in: [candidateEmail, recruiterEmail] } } }) ||
      await db.company.count({ where: { slug } }) || await db.jobCategory.count({ where: { code: slug } })) {
    throw new FixtureError("This run ID already owns records; inspect or clean it before setup.");
  }
  const needed = ["company.view", "company.update", "application.view", "application.review"];
  if (await db.permission.count({ where: { code: { in: needed }, isDeprecated: false } }) !== needed.length ||
      !await db.role.findUnique({ where: { systemCode: "CANDIDATE" }, select: { id: true } })) {
    throw new FixtureError("Required permission registry or CANDIDATE role is missing.");
  }

  const prefix = (process.env.API_PREFIX ?? "api/v1").replace(/^\/+|\/+$/g, "");
  const api = (path: string) => `/${prefix}${path}`;
  const http = app.getHttpServer();
  const category = await db.jobCategory.create({ data: { code: slug, name: "Browser E2E fixture", isActive: true } });
  const candidateAuth = await request(http).post(api("/auth/register/v2"))
    .send({ email: candidateEmail, password: candidatePassword, accountType: "CANDIDATE" });
  check(candidateAuth, 201, "Register candidate");
  const recruiterAuth = await request(http).post(api("/auth/register/v2"))
    .send({ email: recruiterEmail, password: recruiterPassword, accountType: "EMPLOYER" });
  check(recruiterAuth, 201, "Register recruiter");
  const candidateToken = candidateAuth.body.accessToken as string;
  const recruiterToken = recruiterAuth.body.accessToken as string;
  const candidateBearer = { Authorization: `Bearer ${candidateToken}` };
  const recruiterBearer = { Authorization: `Bearer ${recruiterToken}` };

  const profile = await request(http).post(api("/candidate/profile"))
    .set(candidateBearer).send({ fullName: "Browser Fixture Candidate" });
  check(profile, 201, "Create candidate profile");
  const resume = await request(http).post(api("/candidate/resumes"))
    .set(candidateBearer).send({ name: "Browser fixture CV", builderContent: { summary: "Browser integration candidate" } });
  check(resume, 201, "Create builder resume");
  const company = await request(http).post(api("/companies"))
    .set(recruiterBearer).send({ name: "Browser E2E Company", slug });
  check(company, 201, "Create company");
  const companyId = company.body.id as string;
  const draft = await request(http).post(api(`/companies/${companyId}/jobs`))
    .set(recruiterBearer).send({ categoryId: category.id, title: "Browser E2E Engineer",
      description: "A temporary published job for the controlled browser submission workflow.",
      employmentType: "FULL_TIME", workplaceType: "REMOTE" });
  check(draft, 201, "Create draft job");
  const jobId = draft.body.id as string;
  const configured = await request(http).put(api(`/companies/${companyId}/jobs/${jobId}/screening-questions`))
    .set(recruiterBearer).send({ version: draft.body.version, questions: [
      { type: "TEXT", label: "Years of experience?", isRequired: true, displayOrder: 0 },
      { type: "TEXTAREA", label: "Describe a relevant project.", isRequired: false, displayOrder: 1 },
      { type: "SELECT", label: "Preferred work mode?", isRequired: true, displayOrder: 2, options: ["Remote", "Office"] },
      { type: "MULTI_SELECT", label: "Core skills?", isRequired: true, displayOrder: 3, options: ["Node", "SQL"] },
      { type: "YES_NO", label: "Available soon?", isRequired: true, displayOrder: 4 },
    ] });
  check(configured, 200, "Configure screening questions");
  const published = await request(http).post(api(`/companies/${companyId}/jobs/${jobId}/publish`))
    .set(recruiterBearer).send({ version: configured.body.version });
  check(published, 200, "Publish job");
  const publicJob = await request(http).get(api(`/jobs/${jobId}`));
  check(publicJob, 200, "Read public job");
  if (publicJob.body.screeningQuestions?.length !== 5 || published.body.status !== "PUBLISHED" ||
      resume.body.status !== "READY") throw new FixtureError("Fixture verification failed; run scoped cleanup.");
  console.log(JSON.stringify({ runId, candidateEmail, recruiterEmail, companyId, jobId,
    resumeId: resume.body.id, resumeVersionId: resume.body.versions[0].id,
    questionIds: configured.body.questions.map((question: { id: string; type: string }) => ({ id: question.id, type: question.type })) }, null, 2));
}

async function cleanup(db: PrismaService, runId: string): Promise<void> {
  const slug = `browser-${runId}`;
  const emails = [`${slug}-candidate@findwork.test`, `${slug}-recruiter@findwork.test`];
  const removed = await db.$transaction(async (tx) => {
  const users = await tx.user.findMany({ where: { emailNormalized: { in: emails } }, select: { id: true, emailNormalized: true } });
  const userIds = users.map((user) => user.id);
  const recruiterId = users.find((user) => user.emailNormalized === emails[1])?.id;
  const company = await tx.company.findUnique({ where: { slug }, select: { id: true, createdByUserId: true } });
  const category = await tx.jobCategory.findUnique({ where: { code: slug }, select: { id: true } });
  if (company && company.createdByUserId !== recruiterId) throw new FixtureError("Company creator does not match this run's recruiter.");
  const companyId = company?.id;
  // Job submit/save take a conflicting lock on Job. Lock owned jobs before
  // checking references; later FK checks roll back cleanup if new children appear.
  const jobs = companyId ? await tx.job.findMany({ where: { companyId }, select: { id: true } }) : [];
  const jobIds = jobs.map((job) => job.id);
  for (const jobId of jobIds) await tx.$queryRaw`SELECT "id" FROM "Job" WHERE "id" = ${jobId}::uuid FOR UPDATE`;
  const profiles = await tx.candidateProfile.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
  for (const profile of profiles) await tx.$queryRaw`SELECT "id" FROM "CandidateProfile" WHERE "id" = ${profile.id}::uuid FOR UPDATE`;
  const members = companyId ? await tx.companyMember.findMany({ where: { companyId }, select: { userId: true } }) : [];
  if (members.some((member) => !userIds.includes(member.userId))) throw new FixtureError("Company has a member outside this fixture; cleanup refused.");
  if (userIds.length && await tx.company.count({ where: { createdByUserId: { in: userIds }, ...(companyId && { id: { not: companyId } }) } })) {
    throw new FixtureError("A fixture account created another company; cleanup refused.");
  }
  if (companyId && await tx.companyInvitation.count({ where: { companyId } })) {
    throw new FixtureError("Company has invitations; cleanup requires separate review.");
  }
  if (companyId && await tx.auditLog.count({
    where: { companyId, OR: [{ actorUserId: null }, { actorUserId: { notIn: userIds } }] },
  })) {
    throw new FixtureError("Company has audit activity by another account; cleanup refused.");
  }
  if (category && await tx.job.count({ where: { categoryId: category.id, ...(companyId && { companyId: { not: companyId } }) } })) {
    throw new FixtureError("Fixture category is used outside this company; cleanup refused.");
  }
  const applications = await tx.application.findMany({
    where: { OR: [{ jobId: { in: jobIds } }, { candidateProfile: { userId: { in: userIds } } }] },
    select: { id: true, jobId: true, candidateProfile: { select: { userId: true } } },
  });
  if (applications.some((row) => !jobIds.includes(row.jobId) || !userIds.includes(row.candidateProfile.userId))) {
    throw new FixtureError("An application connects fixture data to another account or job; cleanup refused.");
  }
  const saved = await tx.savedJob.findMany({
    where: { OR: [{ jobId: { in: jobIds } }, { candidateProfile: { userId: { in: userIds } } }] },
    select: { id: true, jobId: true, candidateProfile: { select: { userId: true } } },
  });
  if (saved.some((row) => !jobIds.includes(row.jobId) || !userIds.includes(row.candidateProfile.userId))) {
    throw new FixtureError("A saved job connects fixture data to another account or job; cleanup refused.");
  }
  const applicationIds = applications.map((row) => row.id);
  if (await tx.applicationAssignment.count({ where: { applicationId: { in: applicationIds } } }) ||
      await tx.interview.count({ where: { applicationId: { in: applicationIds } } })) {
    throw new FixtureError("Application has assignments or interviews; cleanup requires separate review.");
  }
    await tx.applicationStatusHistory.deleteMany({ where: { applicationId: { in: applicationIds } } });
    await tx.applicationAnswer.deleteMany({ where: { applicationId: { in: applicationIds } } });
    await tx.application.deleteMany({ where: { id: { in: applicationIds } } });
    await tx.savedJob.deleteMany({ where: { id: { in: saved.map((row) => row.id) } } });
    await tx.resumeVersion.deleteMany({ where: { resume: { candidateProfile: { userId: { in: userIds } } } } });
    await tx.resume.deleteMany({ where: { candidateProfile: { userId: { in: userIds } } } });
    await tx.screeningQuestion.deleteMany({ where: { jobId: { in: jobIds } } });
    await tx.jobLocation.deleteMany({ where: { jobId: { in: jobIds } } });
    await tx.jobSkill.deleteMany({ where: { jobId: { in: jobIds } } });
    await tx.job.deleteMany({ where: { id: { in: jobIds } } });
    if (companyId) {
      await tx.auditLog.deleteMany({ where: { companyId } });
      await tx.companyLocation.deleteMany({ where: { companyId } });
      await tx.companyMemberPermission.deleteMany({ where: { companyId } });
      await tx.companyMemberRole.deleteMany({ where: { companyId } });
      await tx.rolePermission.deleteMany({ where: { role: { companyId } } });
      await tx.role.deleteMany({ where: { companyId } });
      await tx.companyMember.deleteMany({ where: { companyId } });
      await tx.company.delete({ where: { id: companyId } });
    }
    await tx.candidateOnboardingDraft.deleteMany({ where: { userId: { in: userIds } } });
    await tx.candidateCareerPreference.deleteMany({ where: { candidateProfile: { userId: { in: userIds } } } });
    await tx.candidatePrivacySetting.deleteMany({ where: { candidateProfile: { userId: { in: userIds } } } });
    await tx.candidateProfile.deleteMany({ where: { userId: { in: userIds } } });
    await tx.systemUserRole.deleteMany({ where: { userId: { in: userIds } } });
    await tx.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
    if (category) await tx.jobCategory.delete({ where: { id: category.id } });
  return { users: userIds.length, company: !!company, jobs: jobIds.length,
    applications: applicationIds.length, savedJobs: saved.length, category: !!category };
  }, { timeout: 30_000 });
  console.log(JSON.stringify({ runId, removed }));
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command !== "setup" && command !== "cleanup") {
    throw new FixtureError("Usage: submission-browser-fixture.ts setup|cleanup --run-id <UUIDv4> --env-file <path> --approve-test-writes");
  }
  if (!process.argv.includes("--approve-test-writes")) throw new FixtureError("Explicit --approve-test-writes flag is required.");
  const runId = requireRunId();
  safeEnv();
  const { AppModule } = await import("../src/app.module");
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  try {
    const config = app.get(ConfigService);
    app.use(cookieParser());
    app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    const db = app.get(PrismaService);
    await assertSafeIntegrationDatabase(db, config);
    const [identity] = await db.$queryRaw<Array<{ schema: string }>>`SELECT current_schema() AS schema`;
    if (identity?.schema !== "public") throw new FixtureError("Connected schema is not public.");
    if (command === "setup") await setup(app, db, runId);
    else await cleanup(db, runId);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof FixtureError ? error.message : "Browser fixture command failed; inspect this run ID before retrying.");
  process.exitCode = 1;
});
