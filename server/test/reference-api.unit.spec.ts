import "reflect-metadata";
import { type INestApplication, RequestMethod, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { CandidateController } from "../src/modules/candidate/candidate.controller";
import { ReferenceController } from "../src/modules/reference/reference.controller";
import { ReferenceService } from "../src/modules/reference/reference.service";

describe("shared reference API", () => {
  let app: INestApplication;
  const skillFind = jest.fn();
  const skillCount = jest.fn();
  const skillCategoryFind = jest.fn();
  const certificateFind = jest.fn();
  const wardFind = jest.fn();
  const provinceFind = jest.fn();
  const provinceCount = jest.fn();
  const empty = () => Promise.resolve([]);
  const zero = () => Promise.resolve(0);
  const db = {
    jobCategory: { findMany: empty, count: zero },
    skillCategory: { findMany: skillCategoryFind, count: zero },
    skill: { findMany: skillFind, count: skillCount },
    language: { findMany: empty, count: zero },
    languageCertificateType: { findMany: certificateFind, count: zero },
    province: { findMany: provinceFind, count: provinceCount },
    ward: { findMany: wardFind, count: zero },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReferenceController],
      providers: [ReferenceService, { provide: PrismaService, useValue: db }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    skillFind.mockResolvedValue([]);
    skillCount.mockResolvedValue(0);
    skillCategoryFind.mockResolvedValue([]);
    certificateFind.mockResolvedValue([]);
    wardFind.mockResolvedValue([]);
    provinceFind.mockResolvedValue([]);
    provinceCount.mockResolvedValue(0);
  });

  it.each(["job-categories", "skill-categories", "skills", "languages", "language-certificate-types", "provinces", "wards"])(
    "exposes GET /reference/%s with an empty database result and no invented UUIDs",
    async (path) => {
      const response = await request(app.getHttpServer()).get(`/api/v1/reference/${path}`).expect(200);
      expect(response.body).toEqual({ data: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 } });
    },
  );

  it("filters by active child and parent, then pages, and maps persisted IDs only", async () => {
    skillFind.mockResolvedValue([{ id: "persisted-id", code: "javascript", name: "JavaScript", aliases: [], isActive: true, sortOrder: 0, category: { code: "software-development" } }]);
    skillCount.mockResolvedValue(1);
    const response = await request(app.getHttpServer())
      .get("/api/v1/reference/skills?categoryCode=software-development&page=2&pageSize=1")
      .expect(200);
    expect(skillFind).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: true, category: { isActive: true, code: "software-development" } }, skip: 1, take: 1,
    }));
    expect(response.body.data[0]).toEqual({ id: "persisted-id", code: "javascript", name: "JavaScript", aliases: [], isActive: true, sortOrder: 0, categoryCode: "software-development" });
    expect(response.body.pagination).toEqual({ page: 2, pageSize: 1, total: 1, totalPages: 1 });
  });

  it("preserves province codes with leading zeroes", async () => {
    provinceFind.mockResolvedValue([{ id: "persisted-province", code: "01", name: "Hà Nội", divisionType: "centrally-governed-city", isActive: true }]);
    provinceCount.mockResolvedValue(1);
    const response = await request(app.getHttpServer()).get("/api/v1/reference/provinces").expect(200);
    expect(response.body.data[0].code).toBe("01");
  });

  it("finds Vietnamese D-bar province names with accentless search", async () => {
    provinceFind.mockResolvedValue([{ id: "official-province-fixture", code: "75",
      name: "\u0110\u1ed3ng Nai", divisionType: "centrally-governed-city", isActive: true }]);
    const response = await request(app.getHttpServer())
      .get("/api/v1/reference/provinces?q=Dong%20Nai&pageSize=10").expect(200);
    expect(response.body.pagination.total).toBe(1);
    expect(response.body.data[0].code).toBe("75");
  });

  it("passes language and province parent filters through to persisted relations", async () => {
    await request(app.getHttpServer()).get("/api/v1/reference/language-certificate-types?languageCode=en").expect(200);
    await request(app.getHttpServer()).get("/api/v1/reference/wards?provinceCode=01").expect(200);
    expect(certificateFind).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true, language: { isActive: true, code: "en" } } }));
    expect(wardFind).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true, province: { isActive: true, code: "01" } } }));
  });

  it.each(["false", "all"])("rejects public active=%s with a clear error", async (active) => {
    const response = await request(app.getHttpServer()).get(`/api/v1/reference/skills?active=${active}`).expect(400);
    expect(JSON.stringify(response.body)).toContain("Public reference catalogs only support active=true.");
    expect(skillFind).not.toHaveBeenCalled();
  });

  it("requires an active parent for skill categories, including a filtered parent", async () => {
    await request(app.getHttpServer()).get("/api/v1/reference/skill-categories").expect(200);
    expect(db.skillCategory.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: true, OR: [{ parentId: null }, { parent: { isActive: true } }] },
    }));
    await request(app.getHttpServer()).get("/api/v1/reference/skill-categories?parentCode=software-development").expect(200);
    expect(db.skillCategory.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: true, parent: { code: "software-development", isActive: true } },
    }));
  });

  it.each([
    ["skill-categories?parentCode=missing-parent", "skillCategory", "parent"],
    ["skills?categoryCode=missing-parent", "skill", "category"],
    ["language-certificate-types?languageCode=abc", "languageCertificateType", "language"],
    ["wards?provinceCode=99", "ward", "province"],
  ])("returns no rows for a valid but missing parent filter: %s", async (path, model, relation) => {
    const response = await request(app.getHttpServer()).get(`/api/v1/reference/${path}`).expect(200);
    expect(response.body.pagination.total).toBe(0);
    expect(response.body.data).toEqual([]);
    const where = (db[model as keyof typeof db].findMany as jest.Mock).mock.calls[0][0].where;
    expect(where[relation]).toEqual(expect.objectContaining({ isActive: true }));
  });

  it("uses one active-child and active-parent filter for rows and count before pagination", async () => {
    const rows = [
      { code: "a", isActive: true, categoryActive: true },
      { code: "b", isActive: true, categoryActive: false },
      { code: "c", isActive: false, categoryActive: true },
      { code: "d", isActive: true, categoryActive: true },
    ];
    const filtered = (args: { where: { isActive: boolean; category: { isActive: boolean } } }) => rows.filter((row) =>
      row.isActive === args.where.isActive && row.categoryActive === args.where.category.isActive);
    skillFind.mockImplementation(async (args) => filtered(args).slice(args.skip, args.skip + args.take).map((row) => ({
      id: row.code, code: row.code, name: row.code, aliases: [], isActive: true, sortOrder: 0, category: { code: "software-development" },
    })));
    skillCount.mockImplementation(async (args) => filtered(args).length);
    const response = await request(app.getHttpServer()).get("/api/v1/reference/skills?page=2&pageSize=1").expect(200);
    expect(response.body.data.map((row: { code: string }) => row.code)).toEqual(["d"]);
    expect(response.body.pagination).toEqual({ page: 2, pageSize: 1, total: 2, totalPages: 2 });
    expect(skillFind.mock.calls[0][0].where).toEqual(skillCount.mock.calls[0][0].where);
  });

  it.each(["/skills?page=0", "/skills?pageSize=101", "/skills?active=unknown", "/wards?provinceCode=1", "/language-certificate-types?languageCode=%24bad", "/skill-categories?parentCode=%24bad", "/skills?categoryCode=%24bad"])(
    "rejects invalid query %s",
    async (path) => { await request(app.getHttpServer()).get(`/api/v1/reference${path}`).expect(400); },
  );

  it("keeps the existing candidate onboarding draft routes under the auth guard", () => {
    expect(Reflect.getMetadata(PATH_METADATA, CandidateController)).toBe("candidate");
    expect(Reflect.getMetadata(GUARDS_METADATA, CandidateController)).toContain(AccessTokenGuard);
    expect(Reflect.getMetadata(PATH_METADATA, CandidateController.prototype.loadOnboardingDraft)).toBe("onboarding-draft");
    expect(Reflect.getMetadata(METHOD_METADATA, CandidateController.prototype.loadOnboardingDraft)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, CandidateController.prototype.saveOnboardingDraft)).toBe("onboarding-draft");
    expect(Reflect.getMetadata(METHOD_METADATA, CandidateController.prototype.saveOnboardingDraft)).toBe(RequestMethod.PUT);
  });
});
