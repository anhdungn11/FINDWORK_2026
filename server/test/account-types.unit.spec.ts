import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { GUARDS_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import request from "supertest";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AuthRepository } from "../src/modules/auth/auth.repository";
import { AuthController } from "../src/modules/auth/auth.controller";
import { AuthService } from "../src/modules/auth/auth.service";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { AccountTypeGuard } from "../src/modules/auth/guards/account-type.guard";
import { AuthOriginGuard } from "../src/modules/auth/guards/auth-origin.guard";
import { AuthCookieService } from "../src/modules/auth/services/auth-cookie.service";
import { RegisterDto, TypedRegisterDto } from "../src/modules/auth/dto/register.dto";
import { CandidateApplicationsController } from "../src/modules/applications/applications.controller";
import { CandidateController } from "../src/modules/candidate/candidate.controller";
import { CandidateResumesController } from "../src/modules/candidate/candidate-resumes.controller";
import { CandidateSavedJobsController } from "../src/modules/candidate/candidate-saved-jobs.controller";
import { CompanyController } from "../src/modules/company/company.controller";
import { CompanyInvitationAcceptanceController } from "../src/modules/company/company-invitations.controller";

const registration = {
  email: "person@example.test", emailNormalized: "person@example.test",
  passwordHash: "hash", sessionId: "session", refreshTokenHash: "refresh",
  expiresAt: new Date("2030-01-01T00:00:00Z"),
};

describe("persisted account type contract", () => {
  it("derives platform role only from active SYSTEM assignments", async () => {
    const findMany = jest.fn().mockResolvedValue([{ role: { systemCode: "SUPER_ADMIN" } }]);
    const repository = new AuthRepository({ systemUserRole: { findMany } } as never);
    await expect(repository.findActivePlatformRole("user-id")).resolves.toBe("SUPER_ADMIN");
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      userId: "user-id", role: expect.objectContaining({ kind: "SYSTEM", isActive: true }),
    }) }));
    findMany.mockResolvedValue([]);
    await expect(repository.findActivePlatformRole("ordinary-id")).resolves.toBeUndefined();
  });
  it("requires an explicit supported type on both registration routes", async () => {
    for (const type of ["CANDIDATE", "EMPLOYER"]) {
      const dto = plainToInstance(RegisterDto, { email: "person@example.test", password: "StrongPassword123!", accountType: type });
      expect(await validate(dto)).toEqual([]);
    }
    for (const type of [undefined, null, "LEGACY_UNCLASSIFIED", "ADMIN", "candidate"]) {
      const dto = plainToInstance(RegisterDto, { email: "person@example.test", password: "StrongPassword123!", accountType: type });
      expect(await validate(dto)).not.toEqual([]);
    }
    expect(Reflect.getMetadata(PATH_METADATA, AuthController.prototype.registerTyped)).toBe("register/v2");
    for (const type of ["CANDIDATE", "EMPLOYER"]) {
      expect(await validate(plainToInstance(TypedRegisterDto, {
        email: "person@example.test", password: "StrongPassword123!", accountType: type,
      }))).toEqual([]);
    }
    for (const type of [undefined, null, "LEGACY_UNCLASSIFIED"]) {
      expect(await validate(plainToInstance(TypedRegisterDto, {
        email: "person@example.test", password: "StrongPassword123!", accountType: type,
      }))).not.toEqual([]);
    }
  });

  it.each(["CANDIDATE", "LEGACY_UNCLASSIFIED"] as const)(
    "gives %s registration candidate grants without creating a profile or company", async (accountType) => {
      const tx = {
        role: { findUnique: jest.fn().mockResolvedValue({ id: "candidate-role", kind: "SYSTEM", isActive: true }) },
        user: { create: jest.fn().mockResolvedValue({ id: "user", accountType }) },
        systemUserRole: { create: jest.fn() }, authSession: { create: jest.fn() },
        candidateProfile: { create: jest.fn() }, company: { create: jest.fn() },
      };
      const repository = new AuthRepository({ $transaction: async (run: (client: typeof tx) => Promise<unknown>) => run(tx) } as never);
      await repository.createRegisteredUserWithSession({ ...registration, accountType });
      expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ accountType }) }));
      expect(tx.systemUserRole.create).toHaveBeenCalledWith({ data: {
        userId: "user", roleId: "candidate-role", assignedByUserId: null,
      } });
      expect(tx.candidateProfile.create).not.toHaveBeenCalled();
      expect(tx.company.create).not.toHaveBeenCalled();
    },
  );

  it("registers EMPLOYER without candidate grants or implicit company/profile creation", async () => {
    const tx = {
      role: { findUnique: jest.fn() },
      user: { create: jest.fn().mockResolvedValue({ id: "user", accountType: "EMPLOYER" }) },
      systemUserRole: { create: jest.fn() }, authSession: { create: jest.fn() },
      candidateProfile: { create: jest.fn() }, company: { create: jest.fn() },
    };
    const repository = new AuthRepository({ $transaction: async (run: (client: typeof tx) => Promise<unknown>) => run(tx) } as never);
    await repository.createRegisteredUserWithSession({ ...registration, accountType: "EMPLOYER" });
    expect(tx.role.findUnique).not.toHaveBeenCalled();
    expect(tx.systemUserRole.create).not.toHaveBeenCalled();
    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ accountType: "EMPLOYER" }) }));
    expect(tx.candidateProfile.create).not.toHaveBeenCalled();
    expect(tx.company.create).not.toHaveBeenCalled();
  });

  it("returns persisted type on registration, login and refresh, mapping old NULL users to legacy", async () => {
    const existing = { id: "user", email: "person@example.test", status: "ACTIVE", emailVerifiedAt: null,
      passwordHash: "hash", accountType: "EMPLOYER" as "EMPLOYER" | null };
    const repository = {
      findActivePlatformRole: jest.fn().mockResolvedValue(undefined),
      createRegisteredUserWithSession: jest.fn().mockResolvedValue(existing),
      findUserByNormalizedEmail: jest.fn().mockResolvedValue(existing),
      createSession: jest.fn(),
      findSessionWithUser: jest.fn().mockResolvedValue({ id: "session", userId: "user",
        revokedAt: null, expiresAt: new Date(Date.now() + 60_000), refreshTokenHash: "hash", user: existing }),
      rotateRefreshToken: jest.fn().mockResolvedValue(true),
    };
    const tokens = {
      createRefreshToken: jest.fn().mockReturnValue({ token: "refresh", secret: "secret" }),
      hashRefreshSecret: jest.fn().mockReturnValue("hash"),
      signAccessToken: jest.fn().mockResolvedValue("access"),
      getAccessTtlSeconds: jest.fn().mockReturnValue(900),
      parseRefreshToken: jest.fn().mockReturnValue({ sessionId: "session", secret: "secret" }),
      matchesRefreshSecret: jest.fn().mockReturnValue(true),
    };
    const service = new AuthService(repository as never,
      { hash: async () => "hash", verify: async () => true } as never,
      tokens as never, { getOrThrow: () => 30 } as never);
    const typed = await service.register({ email: existing.email, password: "StrongPassword123!", accountType: "EMPLOYER" }, {});
    expect(repository.createRegisteredUserWithSession).toHaveBeenCalledWith(expect.objectContaining({ accountType: "EMPLOYER" }));
    expect(typed.user.accountType).toBe("EMPLOYER");
    expect((await service.login({ email: existing.email, password: "StrongPassword123!" }, {})).user.accountType).toBe("EMPLOYER");
    expect((await service.refresh("refresh")).user.accountType).toBe("EMPLOYER");

    existing.accountType = null;
    expect((await service.login({ email: existing.email, password: "StrongPassword123!" }, {})).user.accountType)
      .toBe("LEGACY_UNCLASSIFIED");
    expect((await service.refresh("refresh")).user.accountType).toBe("LEGACY_UNCLASSIFIED");
    await expect(service.register({ email: existing.email, password: "StrongPassword123!" } as RegisterDto, {}))
      .rejects.toMatchObject({ response: expect.objectContaining({ code: "AUTH_ACCOUNT_TYPE_REQUIRED" }) });
    expect(repository.createRegisteredUserWithSession).toHaveBeenCalledTimes(1);
  });

  it("takes account type from the persisted session user, not the JWT", async () => {
    const request = { headers: { authorization: "Bearer token" } } as Record<string, unknown>;
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as never;
    const guard = new AccessTokenGuard({ verifyAccessToken: async () => ({ sub: "user", sid: "session", accountType: "CANDIDATE" }) } as never,
      { findAccessSession: async () => ({ id: "session", userId: "user", revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: { id: "user", email: "person@example.test", status: "ACTIVE", emailVerifiedAt: null, accountType: "EMPLOYER" } }) } as never);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request.auth as { user: { accountType: string } }).user.accountType).toBe("EMPLOYER");
  });

  it("applies candidate type checks to profile, CV, saved jobs and applications", () => {
    for (const controller of [CandidateController, CandidateResumesController, CandidateSavedJobsController, CandidateApplicationsController]) {
      expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toContain(AccountTypeGuard);
    }
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyController.prototype.create)).toEqual([AccessTokenGuard, AccountTypeGuard]);
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyInvitationAcceptanceController)).toEqual([AccessTokenGuard, AccountTypeGuard]);
  });
});

describe("registration HTTP compatibility", () => {
  let app: INestApplication;
  const register = jest.fn(async (dto: RegisterDto) => ({
    accessToken: "access", accessTokenExpiresInSeconds: 900,
    refreshToken: "refresh", refreshExpiresAt: new Date(Date.now() + 60_000),
    user: { id: "user", email: dto.email, status: "ACTIVE", emailVerified: false,
      accountType: dto.accountType },
  }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { register } },
        { provide: AuthCookieService, useValue: { setRefreshCookie: jest.fn() } },
      ],
    }).overrideGuard(AccessTokenGuard).useValue({ canActivate: () => true })
      .overrideGuard(AuthOriginGuard).useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => app?.close());
  beforeEach(() => jest.clearAllMocks());

  it("requires type on both routes while accepting typed registrations", async () => {
    const body = { email: "person@example.test", password: "StrongPassword123!" };
    await request(app.getHttpServer()).post("/api/v1/auth/register/v2").send(body).expect(400);
    await request(app.getHttpServer()).post("/api/v1/auth/register").send(body).expect(400);
    expect(register).not.toHaveBeenCalled();
    const typed = await request(app.getHttpServer()).post("/api/v1/auth/register/v2")
      .send({ ...body, accountType: "EMPLOYER" }).expect(201);
    expect(typed.body.user.accountType).toBe("EMPLOYER");
    const original = await request(app.getHttpServer()).post("/api/v1/auth/register")
      .send({ ...body, accountType: "CANDIDATE" }).expect(201);
    expect(original.body.user.accountType).toBe("CANDIDATE");
  });
});
