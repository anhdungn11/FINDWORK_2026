import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { AuthRepository } from "../src/modules/auth/auth.repository";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { AccountTypeGuard } from "../src/modules/auth/guards/account-type.guard";
import { TokenService } from "../src/modules/auth/services/token.service";
import { AuthorizationRepository } from "../src/modules/authorization/authorization.repository";
import { AuthorizationService } from "../src/modules/authorization/authorization.service";
import { CompanyPermissionGuard } from "../src/modules/authorization/guards/company-permission.guard";
import { PermissionGuard } from "../src/modules/authorization/guards/permission.guard";
import { PermissionResolverService } from "../src/modules/authorization/services/permission-resolver.service";
import { CompanyApplicationsController } from "../src/modules/applications/applications.controller";
import { ApplicationsService } from "../src/modules/applications/applications.service";
import { CandidateController } from "../src/modules/candidate/candidate.controller";
import { CandidateService } from "../src/modules/candidate/candidate.service";
import { CandidateOnboardingDraftService } from "../src/modules/candidate/candidate-onboarding-draft.service";
import { CandidateOnboardingImportService } from "../src/modules/candidate/candidate-onboarding-import.service";
import { CompanyController } from "../src/modules/company/company.controller";
import { CompanyProfileLocationsController } from "../src/modules/company/company-profile-locations.controller";
import { CompanyProfileLocationsService } from "../src/modules/company/company-profile-locations.service";
import { CompanyInvitationAcceptanceController } from "../src/modules/company/company-invitations.controller";
import { CompanyInvitationsService } from "../src/modules/company/company-invitations.service";
import { CompanyRepository } from "../src/modules/company/company.repository";
import { DEFAULT_COMPANY_ROLES } from "../src/modules/company/company-roles";
import { CompanyService } from "../src/modules/company/company.service";
import { CompanyMediaService } from "../src/modules/company/company-media.service";
import { CompanyJobsController, PublicJobsController } from "../src/modules/jobs/jobs.controller";
import { JobsService } from "../src/modules/jobs/jobs.service";

const companyId = "11111111-1111-4111-8111-111111111111";
const otherCompanyId = "22222222-2222-4222-8222-222222222222";
const jobId = "33333333-3333-4333-8333-333333333333";
const applicationId = "44444444-4444-4444-8444-444444444444";
const categoryId = "55555555-5555-4555-8555-555555555555";
const ownerPermissions = new Set<string>(DEFAULT_COMPANY_ROLES.find((role) => role.name === "OWNER")!.permissions);

describe("candidate and employer workspace authorization", () => {
  let app: INestApplication;
  let companyRepository: CompanyRepository;

  const transaction = {
    companyMember: { findFirst: jest.fn().mockResolvedValue({ id: "owner-member" }) },
    jobCategory: { findFirst: jest.fn().mockResolvedValue({ id: categoryId }) },
    job: {
      create: jest.fn().mockResolvedValue({ id: jobId }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: jobId, companyId, status: "DRAFT" }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const db = {
    companyMember: { findMany: jest.fn(async ({ where }: { where: { userId: string } }) =>
      where.userId === "owner" ? [{
        company: { id: companyId, name: "Existing Company", slug: "existing-company", status: "ACTIVE", verificationStatus: "UNVERIFIED" },
        roles: [{ role: { name: "OWNER" } }],
      }] : []),
    },
    job: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    company: { create: jest.fn() },
    candidateProfile: { create: jest.fn() },
    $transaction: jest.fn(async (callback: ((tx: typeof transaction) => Promise<unknown>) | Promise<unknown>[]) =>
      Array.isArray(callback) ? Promise.all(callback) : callback(transaction)),
  };
  const grants = {
    findActiveCompanyMember: jest.fn(async (userId: string, targetCompanyId: string) =>
      (userId === "owner" || userId === "employer") && targetCompanyId === companyId ? { id: "owner-member" } : null),
    findCompanyPermissionGrantSnapshot: jest.fn(async (_memberId: string, _companyId: string, code: string) => ({
      code, isDeprecated: false, directOverride: null,
      roleScopes: ownerPermissions.has(code) ? ["COMPANY"] : [],
    })),
  };
  const profile = {
    getProfile: jest.fn().mockResolvedValue({ id: companyId }),
    updateProfile: jest.fn().mockResolvedValue({ id: companyId }),
  };
  const media = {
    get: jest.fn().mockResolvedValue({ bytes: Buffer.from("image"), type: "image/png" }),
    upload: jest.fn().mockResolvedValue({ kind: "logo", available: true }),
    remove: jest.fn().mockResolvedValue({ kind: "logo", available: false }),
  };
  const applications = {
    listCompany: jest.fn().mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 } }),
    review: jest.fn().mockResolvedValue({ id: applicationId, status: "REVIEWING" }),
  };
  const invitations = { accept: jest.fn().mockResolvedValue({ companyId, role: "VIEWER" }) };
  const candidate = {
    getBootstrap: jest.fn().mockResolvedValue({ profile: null, draft: null }),
    createProfile: jest.fn().mockResolvedValue({ id: "new-profile" }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        CompanyController, CompanyProfileLocationsController,
        CompanyJobsController, PublicJobsController, CompanyApplicationsController,
        CompanyInvitationAcceptanceController, CandidateController,
      ],
      providers: [
        CompanyRepository, CompanyService, JobsService,
        AccessTokenGuard, AccountTypeGuard, CompanyPermissionGuard, PermissionGuard,
        AuthorizationService, PermissionResolverService,
        { provide: PrismaService, useValue: db },
        { provide: AuthorizationRepository, useValue: grants },
        { provide: CompanyProfileLocationsService, useValue: profile },
        { provide: CompanyMediaService, useValue: media },
        { provide: ApplicationsService, useValue: applications },
        { provide: CompanyInvitationsService, useValue: invitations },
        { provide: CandidateService, useValue: candidate },
        { provide: CandidateOnboardingDraftService, useValue: {} },
        { provide: CandidateOnboardingImportService, useValue: {} },
        { provide: TokenService, useValue: {
          verifyAccessToken: async (token: string) => ({ sub: token, sid: `session-${token}` }),
        } },
        { provide: AuthRepository, useValue: {
          findAccessSession: async (sessionId: string) => {
            const userId = sessionId.replace(/^session-/, "");
            return { id: sessionId, userId, revokedAt: null,
              expiresAt: new Date(Date.now() + 60_000),
              user: { id: userId, email: `${userId}@example.test`, status: "ACTIVE", emailVerifiedAt: null,
                accountType: userId === "candidate" ? "CANDIDATE" : userId === "employer" ? "EMPLOYER" : null } };
          },
        } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix("api/v1");
    await app.init();
    companyRepository = moduleRef.get(CompanyRepository);
  });

  afterAll(async () => app?.close());
  beforeEach(() => jest.clearAllMocks());

  const bearer = (user: "candidate" | "employer" | "owner") => ({ Authorization: `Bearer ${user}` });

  it("allows public image reads but limits image changes to the owning company", async () => {
    await request(app.getHttpServer()).get(`/api/v1/companies/${companyId}/media/logo`).expect(200);
    await request(app.getHttpServer()).put(`/api/v1/companies/${companyId}/media/logo`)
      .set(bearer("candidate")).attach("file", Buffer.from("image"), "logo.png").expect(403);
    await request(app.getHttpServer()).put(`/api/v1/companies/${otherCompanyId}/media/logo`)
      .set(bearer("owner")).attach("file", Buffer.from("image"), "logo.png").expect(403);
    await request(app.getHttpServer()).put(`/api/v1/companies/${companyId}/media/logo`)
      .set(bearer("owner")).attach("file", Buffer.from("image"), "logo.png").expect(200);
    expect(media.upload).toHaveBeenCalledTimes(1);
    await request(app.getHttpServer()).delete(`/api/v1/companies/${companyId}/media/logo`)
      .set(bearer("candidate")).expect(403);
    await request(app.getHttpServer()).delete(`/api/v1/companies/${companyId}/media/logo`)
      .set(bearer("owner")).expect(200);
    expect(media.remove).toHaveBeenCalledTimes(1);
  });

  it("shows only active memberships and never provisions a workspace on GET", async () => {
    await request(app.getHttpServer()).get("/api/v1/companies/me").expect(401);
    expect((await request(app.getHttpServer()).get("/api/v1/companies/me")
      .set(bearer("candidate")).expect(200)).body).toEqual({ data: [] });
    const owner = await request(app.getHttpServer()).get("/api/v1/companies/me")
      .set(bearer("owner")).expect(200);
    expect(owner.body.data[0].memberRoleNames).toEqual(["OWNER"]);
    expect(db.companyMember.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: "candidate", status: "ACTIVE", removedAt: null, company: { status: "ACTIVE" } }),
    }));
    expect(db.company.create).not.toHaveBeenCalled();
    expect(db.candidateProfile.create).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("denies company profile, job creation and application review without membership", async () => {
    await request(app.getHttpServer()).get(`/api/v1/companies/${companyId}/profile`)
      .set(bearer("candidate")).expect(403);
    await request(app.getHttpServer()).patch(`/api/v1/companies/${companyId}/profile`)
      .set(bearer("candidate")).send({ description: "unauthorized" }).expect(403);
    await request(app.getHttpServer()).post(`/api/v1/companies/${companyId}/jobs`)
      .set(bearer("candidate")).send({ categoryId }).expect(403);
    await request(app.getHttpServer()).patch(`/api/v1/companies/${companyId}/jobs/${jobId}/applications/${applicationId}/status`)
      .set(bearer("candidate")).send({ version: 1, status: "REVIEWING" }).expect(403);
    expect(profile.getProfile).not.toHaveBeenCalled();
    expect(profile.updateProfile).not.toHaveBeenCalled();
    expect(applications.review).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("denies a typed CANDIDATE before any membership lookup", async () => {
    const response = await request(app.getHttpServer()).get(`/api/v1/companies/${companyId}/profile`)
      .set(bearer("candidate")).expect(403);
    expect(response.body.code).toBe("AUTH_ACCOUNT_TYPE_FORBIDDEN");
    expect(grants.findActiveCompanyMember).not.toHaveBeenCalled();
    expect(profile.getProfile).not.toHaveBeenCalled();
  });

  it("allows a typed EMPLOYER with company grants to read managed resources", async () => {
    await request(app.getHttpServer()).get(`/api/v1/companies/${companyId}/profile`)
      .set(bearer("employer")).expect(200);
    await request(app.getHttpServer()).get(`/api/v1/companies/${companyId}/jobs?page=1&pageSize=1`)
      .set(bearer("employer")).expect(200);
    expect(grants.findActiveCompanyMember).toHaveBeenCalledWith("employer", companyId);
    expect(db.candidateProfile.create).not.toHaveBeenCalled();
  });

  it("retains OWNER management access through company-scoped permissions", async () => {
    await request(app.getHttpServer()).get(`/api/v1/companies/${companyId}/profile`)
      .set(bearer("owner")).expect(200);
    await request(app.getHttpServer()).patch(`/api/v1/companies/${companyId}/profile`)
      .set(bearer("owner")).send({ description: "Updated" }).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/companies/${companyId}/jobs`)
      .set(bearer("owner")).send({ categoryId, title: "Job", description: "Description", employmentType: "FULL_TIME", workplaceType: "ONSITE" }).expect(201);
    await request(app.getHttpServer()).patch(`/api/v1/companies/${companyId}/jobs/${jobId}/applications/${applicationId}/status`)
      .set(bearer("owner")).send({ version: 1, status: "REVIEWING" }).expect(200);
    expect(grants.findCompanyPermissionGrantSnapshot).toHaveBeenCalledWith("owner-member", companyId, "company.update");
    expect(grants.findCompanyPermissionGrantSnapshot).toHaveBeenCalledWith("owner-member", companyId, "application.review");
    expect(transaction.job.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ companyId, createdByMemberId: "owner-member" }),
    }));
    expect(applications.review).toHaveBeenCalledWith(companyId, jobId, applicationId, "owner", expect.any(Object));
  });

  it("rejects OWNER access to another company's resources", async () => {
    await request(app.getHttpServer()).get(`/api/v1/companies/${otherCompanyId}/profile`)
      .set(bearer("owner")).expect(403);
    await request(app.getHttpServer()).post(`/api/v1/companies/${otherCompanyId}/jobs`)
      .set(bearer("owner")).send({ categoryId }).expect(403);
    await request(app.getHttpServer()).patch(`/api/v1/companies/${otherCompanyId}/jobs/${jobId}/applications/${applicationId}/status`)
      .set(bearer("owner")).send({ version: 1, status: "REVIEWING" }).expect(403);
    expect(grants.findCompanyPermissionGrantSnapshot).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(applications.review).not.toHaveBeenCalled();
  });

  it("serves public jobs without authentication or CandidateProfile creation", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/jobs?page=1&pageSize=1").expect(200);
    expect(response.body).toMatchObject({ data: [], pagination: { total: 0 } });
    await request(app.getHttpServer()).get("/api/v1/jobs?page=1&pageSize=1")
      .set(bearer("owner")).expect(200);
    expect(db.job.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "PUBLISHED", company: { status: "ACTIVE" } }),
    }));
    expect(db.candidateProfile.create).not.toHaveBeenCalled();
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ isolationLevel: "RepeatableRead" }));
  });

  it("keeps Candidate Workspace available to Candidate and legacy users only", async () => {
    await request(app.getHttpServer()).get("/api/v1/candidate/bootstrap")
      .set(bearer("employer")).expect(403);
    await request(app.getHttpServer()).post("/api/v1/candidate/profile")
      .set(bearer("employer")).send({ fullName: "Employer" }).expect(403);
    expect(candidate.getBootstrap).not.toHaveBeenCalled();
    expect(candidate.createProfile).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get("/api/v1/candidate/bootstrap")
      .set(bearer("candidate")).expect(200);
    await request(app.getHttpServer()).get("/api/v1/candidate/bootstrap")
      .set(bearer("owner")).expect(200);
    await request(app.getHttpServer()).post("/api/v1/candidate/profile")
      .set(bearer("candidate")).send({ fullName: "Candidate" }).expect(201);
    expect(candidate.createProfile).toHaveBeenCalledWith("candidate", { fullName: "Candidate" });
  });

  it("keeps employer workspace navigation read-only", async () => {
    await request(app.getHttpServer()).get("/api/v1/companies/me")
      .set(bearer("owner")).expect(200);
    await request(app.getHttpServer()).get(`/api/v1/companies/${companyId}/profile`)
      .set(bearer("owner")).expect(200);
    await request(app.getHttpServer()).get(`/api/v1/companies/${companyId}/jobs?page=1&pageSize=1`)
      .set(bearer("owner")).expect(200);
    await request(app.getHttpServer()).get(`/api/v1/companies/${companyId}/jobs/${jobId}/applications?page=1&pageSize=1`)
      .set(bearer("owner")).expect(200);
    expect(db.company.create).not.toHaveBeenCalled();
    expect(db.candidateProfile.create).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(profile.updateProfile).not.toHaveBeenCalled();
    expect(applications.review).not.toHaveBeenCalled();
  });

  it("starts company onboarding only through explicit authenticated POST", async () => {
    const create = jest.spyOn(companyRepository, "createCompanyWithOwner").mockResolvedValueOnce({ id: companyId } as never);
    await request(app.getHttpServer()).get("/api/v1/companies/me")
      .set(bearer("candidate")).expect(200);
    expect(create).not.toHaveBeenCalled();
    await request(app.getHttpServer()).post("/api/v1/companies")
      .send({ name: "New Company", slug: "new-company" }).expect(401);
    expect(create).not.toHaveBeenCalled();
    await request(app.getHttpServer()).post("/api/v1/companies")
      .set(bearer("candidate")).send({ name: "New Company", slug: "new-company" }).expect(403);
    expect(create).not.toHaveBeenCalled();
    await request(app.getHttpServer()).post("/api/v1/companies")
      .set(bearer("employer")).send({ name: "New Company", slug: "new-company" }).expect(201);
    expect(create).toHaveBeenCalledWith({ actorUserId: "employer", name: "New Company", slug: "new-company" });
    expect(db.company.create).not.toHaveBeenCalled();
    create.mockRestore();
  });

  it("requires Employer or legacy type for explicit invitation acceptance", async () => {
    await request(app.getHttpServer()).post("/api/v1/company-invitations/accept")
      .set(bearer("candidate")).send({ token: "test-token" }).expect(403);
    expect(invitations.accept).not.toHaveBeenCalled();
    await request(app.getHttpServer()).post("/api/v1/company-invitations/accept")
      .set(bearer("employer")).send({ token: "test-token" }).expect(201);
    expect(invitations.accept).toHaveBeenCalledWith("employer", { token: "test-token" });
  });
});
