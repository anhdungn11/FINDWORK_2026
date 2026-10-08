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
import { CompanyProfileLocationsRepository } from "../src/modules/company/company-profile-locations.repository";
import type { Prisma } from "../src/generated/prisma/client";

const BASE = "/api/v1/companies";
const PREFIX = `phase43b-${randomUUID().slice(0, 8)}`;
const DOMAIN = "@phase43b.test";

type UserCredentials = { id: string; token: string };

describe("Phase 4.3B Company Profile and Locations integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;
  const userIds: string[] = [];
  const geoProvinceIds: string[] = [];
  const geoWardIds: string[] = [];
  let ownerA: UserCredentials;
  let ownerB: UserCredentials;
  let viewer: UserCredentials;
  let admin: UserCredentials;
  let companyA: string;
  let companyB: string;
  let companyC: string;

  const url = (companyId: string, suffix: string) => `${BASE}/${companyId}/${suffix}`;
  const bearer = (user: UserCredentials) => ({ Authorization: `Bearer ${user.token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    const config = app.get(ConfigService);
    const database = decodeURIComponent(new URL(config.getOrThrow<string>("DATABASE_URL")).pathname.slice(1));
    if (database !== "findwork_test") throw new Error(`REFUSING destructive 4.3B tests on ${database}`);
    app.use(cookieParser());
    app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    tokenService = app.get(TokenService);

    ownerA = await createUser("owner-a");
    ownerB = await createUser("owner-b");
    viewer = await createUser("viewer");
    admin = await createUser("admin");
    companyA = await createCompany(ownerA, "a");
    companyB = await createCompany(ownerB, "b");
    companyC = await createCompany(ownerA, "c");
    await assignCompanyRole(companyA, viewer.id, "VIEWER");
    await assignCompanyRole(companyA, admin.id, "ADMIN");
  });

  afterAll(async () => {
    try {
      if (!prisma) return;
      const companyIds = (await prisma.company.findMany({
        where: { slug: { startsWith: PREFIX } }, select: { id: true },
      })).map((item) => item.id);
      await prisma.auditLog.deleteMany({ where: { companyId: { in: companyIds } } });
      await prisma.companyMemberPermission.deleteMany({ where: { companyId: { in: companyIds } } });
      await prisma.companyMemberRole.deleteMany({ where: { companyId: { in: companyIds } } });
      await prisma.rolePermission.deleteMany({ where: { role: { companyId: { in: companyIds } } } });
      await prisma.role.deleteMany({ where: { companyId: { in: companyIds } } });
      await prisma.companyInvitation.deleteMany({ where: { companyId: { in: companyIds } } });
      await prisma.companyLocation.deleteMany({ where: { companyId: { in: companyIds } } });
      await prisma.companyMember.deleteMany({ where: { companyId: { in: companyIds } } });
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
      await prisma.ward.deleteMany({ where: { id: { in: geoWardIds } } });
      await prisma.province.deleteMany({ where: { id: { in: geoProvinceIds } } });
      await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    } finally {
      if (app) await app.close();
    }
  });

  async function createUser(label: string): Promise<UserCredentials> {
    const id = randomUUID();
    const sessionId = randomUUID();
    const email = `${PREFIX}-${label}-${id.slice(0, 8)}${DOMAIN}`;
    await prisma.user.create({ data: {
      id, email, emailNormalized: email.toLowerCase(), passwordHash: "phase43b-test-only",
    } });
    userIds.push(id);
    await prisma.authSession.create({ data: {
      id: sessionId, userId: id, refreshTokenHash: `phase43b-${sessionId}`,
      expiresAt: new Date(Date.now() + 3_600_000),
    } });
    const token = await tokenService.signAccessToken(id, sessionId);
    return { id, token };
  }

  async function createCompany(user: UserCredentials, suffix: string): Promise<string> {
    const response = await request(app.getHttpServer()).post(BASE)
      .set(bearer(user)).send({ name: `Test Company ${suffix}`, slug: `${PREFIX}-${suffix}` }).expect(201);
    return response.body.id as string;
  }

  async function assignCompanyRole(companyId: string, userId: string, roleName: string) {
    const member = await prisma.companyMember.create({ data: {
      companyId, userId, status: "ACTIVE", isOwner: false, removedAt: null,
    } });
    const role = await prisma.role.findFirstOrThrow({
      where: { companyId, name: roleName }, select: { id: true },
    });
    await prisma.companyMemberRole.create({ data: {
      companyId, companyMemberId: member.id, roleId: role.id, assignedByUserId: ownerA.id,
    } });
    return member;
  }

  it("requires authentication for profile and locations", async () => {
    await request(app.getHttpServer()).get(url(companyA, "profile")).expect(401);
    await request(app.getHttpServer()).get(url(companyA, "locations")).expect(401);
  });

  it("allows company.view for viewer, restricts update to owner/admin", async () => {
    await request(app.getHttpServer()).get(url(companyA, "profile")).set(bearer(viewer)).expect(200);
    await request(app.getHttpServer()).get(url(companyA, "locations")).set(bearer(viewer)).expect(200);
    await request(app.getHttpServer()).patch(url(companyA, "profile"))
      .set(bearer(viewer)).send({ name: "Not Allowed" }).expect(403);
    await request(app.getHttpServer()).patch(url(companyA, "profile"))
      .set(bearer(admin)).send({ website: "https://example.com" }).expect(200);
    const updated = await request(app.getHttpServer()).patch(url(companyA, "profile"))
      .set(bearer(ownerA)).send({ name: "Updated Company A", employeeSizeRange: "11-50" }).expect(200);
    expect(updated.body.name).toBe("Updated Company A");
    expect(updated.body.slug).toBe(`${PREFIX}-a`);
    expect(updated.body.status).toBe("ACTIVE");
    expect(await prisma.auditLog.count({ where: { companyId: companyA, action: "company.profile.update" } })).toBe(2);
  });

  it("never exposes or mutates cross-tenant data", async () => {
    await request(app.getHttpServer()).get(url(companyB, "profile")).set(bearer(ownerA)).expect(403);
    await request(app.getHttpServer()).patch(url(companyB, "profile"))
      .set(bearer(ownerA)).send({ name: "Cross Tenant" }).expect(403);
    await request(app.getHttpServer()).get(url(companyA, "profile")).set(bearer(ownerB)).expect(403);
  });

  it("rejects mass-assignment, invalid fields, empty updates and future founded years", async () => {
    const endpoint = url(companyA, "profile");
    for (const data of [
      { status: "VERIFIED" }, { verificationStatus: "VERIFIED" },
      { logoAssetKey: "unauthorized" }, { slug: "hijack" },
      { name: null }, { website: "javascript:alert(1)" },
      { foundedYear: new Date().getFullYear() + 1 }, {},
    ]) {
      const response = await request(app.getHttpServer()).patch(endpoint).set(bearer(ownerA)).send(data);
      expect({ data, status: response.status }).toEqual({ data, status: 400 });
    }
    expect((await prisma.company.findUniqueOrThrow({ where: { id: companyA } })).slug).toBe(`${PREFIX}-a`);
  });

  it("requires active industry and locks legal data on PENDING/VERIFIED companies", async () => {
    await request(app.getHttpServer()).patch(url(companyA, "profile"))
      .set(bearer(ownerA)).send({ industryId: randomUUID() }).expect(400);
    for (const status of ["PENDING", "VERIFIED"] as const) {
      await prisma.company.update({ where: { id: companyA }, data: { verificationStatus: status } });
      try {
        await request(app.getHttpServer()).patch(url(companyA, "profile"))
          .set(bearer(ownerA)).send({ legalName: "Changed Legal Name" }).expect(409);
        await request(app.getHttpServer()).patch(url(companyA, "profile"))
          .set(bearer(ownerA)).send({ taxCode: "123456789" }).expect(409);
      } finally {
        await prisma.company.update({ where: { id: companyA }, data: { verificationStatus: "UNVERIFIED" } });
      }
    }
  });

  it("rejects inactive members and company-wide operations with ASSIGNED scope", async () => {
    const member = await prisma.companyMember.findUniqueOrThrow({
      where: { companyId_userId: { companyId: companyA, userId: viewer.id } },
    });
    await prisma.companyMember.update({ where: { id: member.id }, data: { status: "INACTIVE" } });
    try {
      await request(app.getHttpServer()).get(url(companyA, "profile")).set(bearer(viewer)).expect(403);
    } finally {
      await prisma.companyMember.update({ where: { id: member.id }, data: { status: "ACTIVE" } });
    }
    const permission = await prisma.permission.findUniqueOrThrow({ where: { code: "company.view" } });
    await prisma.companyMemberPermission.create({ data: {
      companyId: companyA, companyMemberId: member.id, permissionId: permission.id,
      effect: "ALLOW", dataScope: "ASSIGNED", assignedByUserId: ownerA.id,
    } });
    try {
      await request(app.getHttpServer()).get(url(companyA, "profile")).set(bearer(viewer)).expect(403);
      await request(app.getHttpServer()).get(url(companyA, "locations")).set(bearer(viewer)).expect(403);
    } finally {
      await prisma.companyMemberPermission.delete({
        where: { companyMemberId_permissionId: { companyMemberId: member.id, permissionId: permission.id } },
      });
    }
  });

  it("validates active province/ward references and same-province constraint", async () => {
    const p1 = randomUUID();
    const p2 = randomUUID();
    const w1 = randomUUID();
    for (const { id, label } of [{ id: p1, label: "A" }, { id: p2, label: "B" }]) {
      await prisma.province.create({ data: {
        id, code: `P${id.slice(0, 8)}`, name: `43B Province ${label}`,
        divisionType: "Province", isActive: true,
      } });
      geoProvinceIds.push(id);
    }
    await prisma.ward.create({ data: {
      id: w1, code: `W${w1.slice(0, 8)}`, provinceId: p1,
      name: "43B Ward", divisionType: "Ward", codename: "phase43b-ward", isActive: true,
    } });
    geoWardIds.push(w1);

    const endpoint = url(companyB, "locations");
    const success = await request(app.getHttpServer()).post(endpoint)
      .set(bearer(ownerB)).send({ countryCode: "vn", provinceId: p1, wardId: w1, addressLine: "HQ" }).expect(201);
    expect(success.body.countryCode).toBe("VN");
    expect(success.body.isHeadquarters).toBe(true);
    await request(app.getHttpServer()).post(endpoint)
      .set(bearer(ownerB)).send({ provinceId: p2, wardId: w1 }).expect(400);
    await prisma.province.update({ where: { id: p2 }, data: { isActive: false } });
    await request(app.getHttpServer()).post(endpoint)
      .set(bearer(ownerB)).send({ provinceId: p2 }).expect(400);
    await prisma.ward.update({ where: { id: w1 }, data: { isActive: false } });
    await request(app.getHttpServer()).post(endpoint)
      .set(bearer(ownerB)).send({ provinceId: p1, wardId: w1 }).expect(400);
  });

  it("rejects cross-company location IDs and malformed addresses", async () => {
    await request(app.getHttpServer()).post(url(companyA, "locations"))
      .set(bearer(ownerA)).send({}).expect(400);
    await request(app.getHttpServer()).post(url(companyA, "locations"))
      .set(bearer(ownerA)).send({ provinceId: randomUUID(), countryCode: "VN" }).expect(400);
    await request(app.getHttpServer()).post(url(companyA, "locations"))
      .set(bearer(ownerA)).send({ wardId: randomUUID(), addressLine: "X" }).expect(400);
    await request(app.getHttpServer()).post(url(companyA, "locations"))
      .set(bearer(ownerA)).send({ countryCode: "US", provinceId: randomUUID() }).expect(400);
    await request(app.getHttpServer()).post(url(companyA, "locations"))
      .set(bearer(ownerA)).send({ addressLine: "Good", isHeadquarters: true }).expect(400);
  });

  it("creates one HQ, supports transfer, prevents unsafe deletion and allows last removal", async () => {
    const create = (addressLine: string) => request(app.getHttpServer()).post(url(companyA, "locations"))
      .set(bearer(ownerA)).send({ countryCode: "VN", addressLine });
    const first = await create("First HQ").expect(201);
    const second = await create("Second Office").expect(201);
    expect(first.body.isHeadquarters).toBe(true);
    expect(second.body.isHeadquarters).toBe(false);
    const target = url(companyA, `locations/${second.body.id}`);
    await request(app.getHttpServer()).put(`${target}/headquarters`).set(bearer(ownerA)).expect(200);
    await request(app.getHttpServer()).put(`${target}/headquarters`).set(bearer(ownerA)).expect(200);
    expect(await prisma.companyLocation.count({ where: { companyId: companyA, isHeadquarters: true } })).toBe(1);
    await request(app.getHttpServer()).delete(target).set(bearer(ownerA)).expect(409);
    await request(app.getHttpServer()).delete(url(companyA, `locations/${first.body.id}`))
      .set(bearer(ownerA)).expect(200);
    await request(app.getHttpServer()).delete(target).set(bearer(ownerA)).expect(200);
    expect(await prisma.companyLocation.count({ where: { companyId: companyA } })).toBe(0);
  });

  it("supports protected updates and rejects another company's location", async () => {
    const other = await request(app.getHttpServer()).post(url(companyB, "locations"))
      .set(bearer(ownerB)).send({ addressLine: "Company B Office" }).expect(201);
    await request(app.getHttpServer()).get(url(companyA, `locations/${other.body.id}`))
      .set(bearer(ownerA)).expect(404);
    await request(app.getHttpServer()).patch(url(companyA, `locations/${other.body.id}`))
      .set(bearer(ownerA)).send({ addressLine: "Hijack" }).expect(404);
    await request(app.getHttpServer()).delete(url(companyA, `locations/${other.body.id}`))
      .set(bearer(ownerA)).expect(404);
    const own = await request(app.getHttpServer()).post(url(companyA, "locations"))
      .set(bearer(ownerA)).send({ addressLine: "Old address" }).expect(201);
    const result = await request(app.getHttpServer()).patch(url(companyA, `locations/${own.body.id}`))
      .set(bearer(admin)).send({ addressLine: "New address" }).expect(200);
    expect(result.body.addressLine).toBe("New address");
    await request(app.getHttpServer()).patch(url(companyA, `locations/${own.body.id}`))
      .set(bearer(ownerA)).send({ isHeadquarters: false }).expect(400);
    await request(app.getHttpServer()).patch(url(companyA, `locations/${own.body.id}`))
      .set(bearer(ownerA)).send({}).expect(400);
  });

  it("blocks suspended and archived companies at the authorization boundary", async () => {
    for (const status of ["SUSPENDED", "ARCHIVED"] as const) {
      await prisma.company.update({ where: { id: companyA }, data: { status } });
      try {
        await request(app.getHttpServer()).get(url(companyA, "profile")).set(bearer(ownerA)).expect(403);
        await request(app.getHttpServer()).patch(url(companyA, "profile"))
          .set(bearer(ownerA)).send({ name: "Unwanted" }).expect(403);
        await request(app.getHttpServer()).get(url(companyA, "locations"))
          .set(bearer(admin)).expect(403);
      } finally {
        await prisma.company.update({ where: { id: companyA }, data: { status: "ACTIVE" } });
      }
    }
  });

  it("rejects repository writes from active viewer and direct-denied admin", async () => {
    const repo = app.get(CompanyProfileLocationsRepository);
    const before = await prisma.company.findUniqueOrThrow({
      where: { id: companyA }, select: { name: true },
    });
    await expect(repo.updateProfile(companyA, viewer.id, { name: "Viewer Bypass" }))
      .rejects.toThrow("A current company-wide update permission is required.");
    const member = await prisma.companyMember.findUniqueOrThrow({
      where: { companyId_userId: { companyId: companyA, userId: admin.id } },
    });
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { code: "company.update" },
    });
    await prisma.companyMemberPermission.create({ data: {
      companyId: companyA, companyMemberId: member.id, permissionId: permission.id,
      effect: "DENY", dataScope: null, assignedByUserId: ownerA.id,
    } });
    try {
      await expect(repo.updateProfile(companyA, admin.id, { name: "Denied Bypass" }))
        .rejects.toThrow("A current company-wide update permission is required.");
    } finally {
      await prisma.companyMemberPermission.delete({
        where: { companyMemberId_permissionId: {
          companyMemberId: member.id, permissionId: permission.id,
        } },
      });
    }
    expect((await prisma.company.findUniqueOrThrow({ where: { id: companyA } })).name)
      .toBe(before.name);
  });

  it("serializes two simultaneous initial location creations", async () => {
    const results = await Promise.all([
      request(app.getHttpServer()).post(url(companyC, "locations"))
        .set(bearer(ownerA)).send({ addressLine: "Initial A" }),
      request(app.getHttpServer()).post(url(companyC, "locations"))
        .set(bearer(ownerA)).send({ addressLine: "Initial B" }),
    ]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(await prisma.companyLocation.count({ where: { companyId: companyC } })).toBe(2);
    expect(await prisma.companyLocation.count({ where: { companyId: companyC, isHeadquarters: true } })).toBe(1);
  });

  it("serializes concurrent headquarters promotions", async () => {
    const first = await request(app.getHttpServer()).post(url(companyA, "locations"))
      .set(bearer(ownerA)).send({ addressLine: "Race A" }).expect(201);
    const second = await request(app.getHttpServer()).post(url(companyA, "locations"))
      .set(bearer(ownerA)).send({ addressLine: "Race B" }).expect(201);
    const responses = await Promise.all([
      request(app.getHttpServer()).put(url(companyA, `locations/${first.body.id}/headquarters`)).set(bearer(ownerA)),
      request(app.getHttpServer()).put(url(companyA, `locations/${second.body.id}/headquarters`)).set(bearer(ownerA)),
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(await prisma.companyLocation.count({ where: { companyId: companyA, isHeadquarters: true } })).toBe(1);
  });

  it("rolls back profile changes if the audit step fails", async () => {
    const original = await prisma.company.findUniqueOrThrow({
      where: { id: companyA }, select: { name: true },
    });
    const injectedError = "PHASE43B_TEST_AUDIT_FAILURE";
    const wrapped = {
      $transaction: <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>,
        options?: { maxWait?: number; timeout?: number }): Promise<T> =>
        prisma.$transaction((tx) => callback(new Proxy(tx, {
          get(target, property) {
            if (property === "auditLog") {
              return new Proxy(target.auditLog, { get(delegate, method) {
                if (method === "create") return async () => { throw new Error(injectedError); };
                return Reflect.get(delegate, method);
              } });
            }
            return Reflect.get(target, property);
          },
        })), options),
    } as unknown as PrismaService;
    const repo = new CompanyProfileLocationsRepository(wrapped);
    await expect(repo.updateProfile(companyA, ownerA.id, { name: "Must Roll Back" }))
      .rejects.toThrow(injectedError);
    expect((await prisma.company.findUniqueOrThrow({ where: { id: companyA } })).name).toBe(original.name);
  });
  it("rolls back location creation when the audit step fails", async () => {
    const before = await prisma.companyLocation.count({ where: { companyId: companyC } });
    const injectedError = "PHASE43B_TEST_LOCATION_AUDIT_FAILURE";
    const wrapped = {
      $transaction: <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>,
        options?: { maxWait?: number; timeout?: number }): Promise<T> =>
        prisma.$transaction((tx) => callback(new Proxy(tx, {
          get(target, property) {
            if (property === "auditLog") {
              return new Proxy(target.auditLog, { get(delegate, method) {
                if (method === "create") return async () => { throw new Error(injectedError); };
                return Reflect.get(delegate, method);
              } });
            }
            return Reflect.get(target, property);
          },
        })), options),
    } as unknown as PrismaService;
    const repo = new CompanyProfileLocationsRepository(wrapped);
    await expect(repo.createLocation(companyC, ownerA.id, { addressLine: "Must Roll Back" }))
      .rejects.toThrow(injectedError);
    expect(await prisma.companyLocation.count({ where: { companyId: companyC } }))
      .toBe(before);
  });
});
