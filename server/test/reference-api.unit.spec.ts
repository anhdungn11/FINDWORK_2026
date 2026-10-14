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
  const provinceFind = jest.fn();
  const provinceCount = jest.fn();
  const empty = () => Promise.resolve([]);
  const zero = () => Promise.resolve(0);
  const db = {
    jobCategory: { findMany: empty, count: zero },
    skillCategory: { findMany: empty, count: zero },
    skill: { findMany: skillFind, count: skillCount },
    language: { findMany: empty, count: zero },
    languageCertificateType: { findMany: empty, count: zero },
    province: { findMany: provinceFind, count: provinceCount },
    ward: { findMany: empty, count: zero },
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

  it("filters by parent code, active state, and page, and maps persisted IDs only", async () => {
    skillFind.mockResolvedValue([{ id: "persisted-id", code: "javascript", name: "JavaScript", aliases: [], isActive: false, sortOrder: 0, category: { code: "software-development" } }]);
    skillCount.mockResolvedValue(1);
    const response = await request(app.getHttpServer())
      .get("/api/v1/reference/skills?categoryCode=software-development&active=false&page=2&pageSize=1")
      .expect(200);
    expect(skillFind).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: false, category: { code: "software-development" } }, skip: 1, take: 1,
    }));
    expect(response.body.data[0]).toEqual({ id: "persisted-id", code: "javascript", name: "JavaScript", aliases: [], isActive: false, sortOrder: 0, categoryCode: "software-development" });
    expect(response.body.pagination).toEqual({ page: 2, pageSize: 1, total: 1, totalPages: 1 });
  });

  it("preserves province codes with leading zeroes", async () => {
    provinceFind.mockResolvedValue([{ id: "persisted-province", code: "01", name: "Hà Nội", divisionType: "centrally-governed-city", isActive: true }]);
    provinceCount.mockResolvedValue(1);
    const response = await request(app.getHttpServer()).get("/api/v1/reference/provinces").expect(200);
    expect(response.body.data[0].code).toBe("01");
  });

  it("passes language and province parent filters through to persisted relations", async () => {
    const certificateFind = jest.fn().mockResolvedValue([]);
    const wardFind = jest.fn().mockResolvedValue([]);
    db.languageCertificateType.findMany = certificateFind;
    db.ward.findMany = wardFind;
    await request(app.getHttpServer()).get("/api/v1/reference/language-certificate-types?languageCode=en&active=all").expect(200);
    await request(app.getHttpServer()).get("/api/v1/reference/wards?provinceCode=01").expect(200);
    expect(certificateFind).toHaveBeenCalledWith(expect.objectContaining({ where: { language: { code: "en" } } }));
    expect(wardFind).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true, province: { code: "01" } } }));
  });

  it.each(["/skills?page=0", "/skills?pageSize=101", "/skills?active=unknown", "/wards?provinceCode=1", "/language-certificate-types?languageCode=%24bad"])(
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
