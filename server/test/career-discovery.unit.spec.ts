import "reflect-metadata";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { CareerDiscoveryController } from "../src/modules/career-discovery/career-discovery.controller";
import { CareerDiscoveryService } from "../src/modules/career-discovery/career-discovery.service";

const categoryA = {
  id: "11111111-1111-4111-8111-111111111111",
  code: "healthcare",
  name: "Healthcare",
  isActive: true,
  sortOrder: 1,
};
const categoryB = {
  id: "22222222-2222-4222-8222-222222222222",
  code: "technology",
  name: "Technology",
  isActive: true,
  sortOrder: 2,
};

describe("public career discovery", () => {
  let app: INestApplication;
  const db = {
    jobCategory: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    job: { groupBy: jest.fn() },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CareerDiscoveryController],
      providers: [CareerDiscoveryService, { provide: PrismaService, useValue: db }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    db.jobCategory.findMany.mockResolvedValue([categoryA, categoryB]);
    db.jobCategory.count.mockResolvedValue(2);
    db.job.groupBy.mockResolvedValue([{ categoryId: categoryB.id, _count: { _all: 3 } }]);
  });

  it("returns zero for a category without visible jobs and the grouped count for a category with them", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/career/categories").expect(200);
    expect(response.body).toEqual({
      data: [
        { ...categoryA, publishedJobCount: 0 },
        { ...categoryB, publishedJobCount: 3 },
      ],
      pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    });
    expect(db.job.groupBy).toHaveBeenCalledTimes(1);
    expect(db.job.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ["categoryId"],
      _count: { _all: true },
      where: expect.objectContaining({ categoryId: { in: [categoryA.id, categoryB.id] } }),
    }));
  });

  it("uses the public job visibility policy and excludes unpublished, expired and inactive-company jobs", async () => {
    await request(app.getHttpServer()).get("/api/v1/career/categories").expect(200);
    const where = db.job.groupBy.mock.calls[0][0].where;
    expect(where).toMatchObject({
      status: "PUBLISHED",
      category: { isActive: true },
      company: { status: "ACTIVE" },
    });
    const now = where.publishedAt.lte as Date;
    expect(now).toBeInstanceOf(Date);
    expect(where.AND).toEqual([
      { OR: [{ applicationDeadline: null }, { applicationDeadline: { gt: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ]);
    expect(db.jobCategory.findMany.mock.calls[0][0].select).toEqual({
      id: true, code: true, name: true, isActive: true, sortOrder: true,
    });
    expect(JSON.stringify(where)).not.toMatch(/candidate|member|email|password|salary/);
  });

  it("searches persisted name or code and paginates in stable order", async () => {
    db.jobCategory.findMany.mockResolvedValue([categoryB]);
    db.jobCategory.count.mockResolvedValue(4);
    const response = await request(app.getHttpServer())
      .get("/api/v1/career/categories?q=%20TECH%20&page=2&pageSize=1")
      .expect(200);
    const where = {
      isActive: true,
      OR: [
        { name: { contains: "TECH", mode: "insensitive" } },
        { code: { contains: "TECH", mode: "insensitive" } },
      ],
    };
    expect(db.jobCategory.findMany).toHaveBeenCalledWith({
      where,
      select: { id: true, code: true, name: true, isActive: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }, { id: "asc" }],
      skip: 1,
      take: 1,
    });
    expect(db.jobCategory.count).toHaveBeenCalledWith({ where });
    expect(db.job.groupBy.mock.calls[0][0].where.categoryId).toEqual({ in: [categoryB.id] });
    expect(response.body.pagination).toEqual({ page: 2, pageSize: 1, total: 4, totalPages: 4 });
  });

  it("returns a truthful empty page without a job query", async () => {
    db.jobCategory.findMany.mockResolvedValue([]);
    db.jobCategory.count.mockResolvedValue(0);
    const response = await request(app.getHttpServer()).get("/api/v1/career/categories").expect(200);
    expect(response.body).toEqual({
      data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
    expect(db.job.groupBy).not.toHaveBeenCalled();
  });

  it.each([
    "?page=0", "?page=1.5", "?pageSize=0", "?pageSize=101",
    "?q=%20%20", "?q=", "?unknown=1",
  ])("rejects malformed filters %s before querying data", async (query) => {
    await request(app.getHttpServer()).get(`/api/v1/career/categories${query}`).expect(400);
    expect(db.jobCategory.findMany).not.toHaveBeenCalled();
    expect(db.job.groupBy).not.toHaveBeenCalled();
  });
});
