import { GUARDS_METADATA } from "@nestjs/common/constants";
import { CompanyJobsController } from "../src/modules/jobs/jobs.controller";
import { JobsService } from "../src/modules/jobs/jobs.service";
import { REQUIRED_COMPANY_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-company-permissions.decorator";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { CompanyPermissionGuard } from "../src/modules/authorization/guards/company-permission.guard";
import { CompanyRepository } from "../src/modules/company/company.repository";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateJobDto, PublicJobQueryDto } from "../src/modules/jobs/dto/job.dto";

const companyId = "11111111-1111-4111-8111-111111111111";
const otherCompanyId = "22222222-2222-4222-8222-222222222222";
const jobId = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";
const categoryId = "55555555-5555-4555-8555-555555555555";

const draft = (overrides: Record<string, unknown> = {}) => ({
  id: jobId, companyId, categoryId, status: "DRAFT", version: 1,
  experienceMinMonths: null, experienceMaxMonths: null,
  salaryMin: null, salaryMax: null, applicationDeadline: null, expiresAt: null,
  ...overrides,
});

function fakeDb() {
  const tx = {
    companyMember: { findFirst: jest.fn().mockResolvedValue({ id: "member-id" }) },
    jobCategory: { findFirst: jest.fn().mockResolvedValue({ id: categoryId }) },
    province: { findFirst: jest.fn().mockResolvedValue({ id: "province-id" }) },
    ward: { findFirst: jest.fn().mockResolvedValue({ id: "ward-id" }) },
    jobLocation: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn(), update: jest.fn() },
    job: {
      findFirst: jest.fn().mockResolvedValue(draft()),
      create: jest.fn().mockResolvedValue({ id: jobId }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue(draft()),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  return {
    tx,
    db: {
      $transaction: jest.fn(async (run: ((client: typeof tx) => Promise<unknown>) | Promise<unknown>[]) =>
        Array.isArray(run) ? Promise.all(run) : run(tx)),
      job: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    },
  };
}

describe("jobs MVP ownership and publication", () => {
  it("requires both the access and company permission guards on company routes", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyJobsController)).toEqual([AccessTokenGuard, CompanyPermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY, CompanyJobsController.prototype.create))
      .toEqual(["company.update"]);
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY, CompanyJobsController.prototype.list))
      .toEqual(["company.view"]);
  });

  it("fails closed when membership is absent before writing a job or audit", async () => {
    const { tx, db } = fakeDb();
    tx.companyMember.findFirst.mockResolvedValue(null);
    const service = new JobsService(db as never);
    await expect(service.create(companyId, userId, {
      categoryId, title: "Nurse", description: "Care for patients in a clinic.",
      employmentType: "FULL_TIME", workplaceType: "ONSITE",
    })).rejects.toMatchObject({ status: 403 });
    expect(tx.job.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("creates a DRAFT under the authenticated member and audits it", async () => {
    const { tx, db } = fakeDb();
    const service = new JobsService(db as never);
    await service.create(companyId, userId, {
      categoryId, title: "Nurse", description: "Care for patients in a clinic.",
      employmentType: "FULL_TIME", workplaceType: "ONSITE",
    });
    expect(tx.companyMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ companyId, userId, status: "ACTIVE", removedAt: null }),
    }));
    expect(tx.job.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ companyId, createdByMemberId: "member-id", categoryId }),
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "job.create", companyId, actorUserId: userId }),
    }));
  });

  it("stores a verified province location and rejects an invalid ward parent", async () => {
    const { tx, db } = fakeDb();
    const service = new JobsService(db as never);
    const input = { categoryId, title: "Sample nurse", description: "Care for patients in a clinic.",
      employmentType: "FULL_TIME" as const, workplaceType: "ONSITE" as const,
      location: { provinceCode: "01", wardCode: "00004", addressLine: "Sample office" } };
    await service.create(companyId, userId, input);
    expect(tx.ward.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { code: "00004", provinceId: "province-id", isActive: true },
    }));
    expect(tx.job.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      locations: { create: { countryCode: "VN", provinceId: "province-id", wardId: "ward-id",
        addressLine: "Sample office", isPrimary: true } },
    }) }));
    tx.ward.findFirst.mockResolvedValue(null);
    await expect(service.create(companyId, userId, input)).rejects.toMatchObject({ status: 400 });
  });

  it("scopes a company job read by both job and company ID", async () => {
    const { db } = fakeDb();
    const service = new JobsService(db as never);
    await expect(service.getCompany(otherCompanyId, jobId)).rejects.toMatchObject({ status: 404 });
    expect(db.job.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: jobId, companyId: otherCompanyId } }));
  });

  it("rejects a stale version and uses a scoped compare-and-swap for edits", async () => {
    const { tx, db } = fakeDb();
    const service = new JobsService(db as never);
    await expect(service.update(companyId, jobId, userId, { version: 2, title: "Updated nurse" }))
      .rejects.toMatchObject({ status: 409 });
    expect(tx.job.updateMany).not.toHaveBeenCalled();
    await service.update(companyId, jobId, userId, { version: 1, title: "Updated nurse" });
    expect(tx.job.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: jobId, companyId, status: "DRAFT", version: 1 },
      data: expect.objectContaining({ title: "Updated nurse", version: { increment: 1 } }),
    }));
  });

  it("edits a published job without republishing and rejects an elapsed deadline", async () => {
    const { tx, db } = fakeDb();
    const service = new JobsService(db as never);
    tx.job.findFirst.mockResolvedValue(draft({ status: "PUBLISHED", publishedAt: new Date("2026-10-23") }));
    await service.update(companyId, jobId, userId, { version: 1, title: "Updated public sample job" });
    expect(tx.job.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: jobId, companyId, status: "PUBLISHED", version: 1 },
      data: expect.objectContaining({ title: "Updated public sample job", version: { increment: 1 } }),
    }));
    await expect(service.update(companyId, jobId, userId,
      { version: 1, applicationDeadline: "2020-01-01T00:00:00.000Z" })).rejects.toMatchObject({ status: 409 });
  });

  it("blocks expired publication and records an authorized state change", async () => {
    const { tx, db } = fakeDb();
    const service = new JobsService(db as never);
    tx.job.findFirst.mockResolvedValue(draft({ applicationDeadline: new Date("2020-01-01") }));
    await expect(service.transition(companyId, jobId, userId, 1, "publish"))
      .rejects.toMatchObject({ status: 409 });
    expect(tx.job.updateMany).not.toHaveBeenCalled();
    tx.job.findFirst.mockResolvedValue(draft());
    await service.transition(companyId, jobId, userId, 1, "publish");
    expect(tx.job.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: jobId, companyId, version: 1, status: "DRAFT" },
      data: expect.objectContaining({ status: "PUBLISHED", version: { increment: 1 } }),
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "job.publish", companyId, actorUserId: userId }),
    }));
  });

  it("enforces public availability and server-side pagination/filtering", async () => {
    const { db } = fakeDb();
    const service = new JobsService(db as never);
    await service.listPublic({ page: 2, pageSize: 10, q: "nurse", categoryCode: "healthcare", employmentType: "FULL_TIME" });
    expect(db.job.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 10, take: 10,
      where: expect.objectContaining({
        status: "PUBLISHED", company: { status: "ACTIVE" },
        category: { isActive: true, code: "healthcare" },
        OR: expect.arrayContaining([
          { title: { contains: "nurse", mode: "insensitive" } },
          { description: { contains: "nurse", mode: "insensitive" } },
          { company: { name: { contains: "nurse", mode: "insensitive" } } },
        ]),
        employmentType: "FULL_TIME",
      }),
    }));
    await expect(service.getPublic(jobId)).rejects.toMatchObject({ status: 404 });
    expect(db.job.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: jobId, status: "PUBLISHED", company: { status: "ACTIVE" } }),
    }));
  });

  it("combines province and displayed salary filters with stable page order and public logo URL", async () => {
    const { db } = fakeDb();
    db.job.findMany.mockResolvedValue([{ id: jobId, company: { id: companyId, name: "Demo", slug: "demo", logoAssetKey: "private-key" }, locations: [] }]);
    db.job.count.mockResolvedValue(23);
    const service = new JobsService(db as never);
    const result = await service.listPublic({ page: 2, pageSize: 10, provinceCode: "01",
      salaryAtLeast: "10000000", salaryAtMost: "20000000", sort: "salary_desc" });
    expect(db.job.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 10, take: 10, orderBy: [{ salaryMin: "desc" }, { publishedAt: "desc" }, { id: "desc" }],
      where: expect.objectContaining({
        locations: { some: { province: { code: "01", isActive: true } } },
        showSalary: true, salaryNegotiable: false, currency: "VND", salaryPeriod: "MONTH",
        salaryMax: { gte: "10000000" }, salaryMin: { lte: "20000000", not: null },
      }),
    }));
    expect(result.pagination).toEqual({ page: 2, pageSize: 10, total: 23, totalPages: 3 });
    expect(result.data[0]?.company).toEqual({ id: companyId, name: "Demo", slug: "demo",
      logoUrl: `/api/v1/companies/${companyId}/media/logo` });
  });

  it("discovers only the authenticated user's active company memberships", async () => {
    const findMany = jest.fn().mockResolvedValue([{ company: { id: companyId, name: "Clinic", slug: "clinic", status: "ACTIVE", verificationStatus: "UNVERIFIED" }, roles: [{ role: { name: "OWNER" } }] }]);
    const repo = new CompanyRepository({ companyMember: { findMany } } as never);
    await expect(repo.listActiveWorkspace(userId)).resolves.toEqual({ data: [{
      id: companyId, name: "Clinic", slug: "clinic", status: "ACTIVE",
      verificationStatus: "UNVERIFIED", memberRoleNames: ["OWNER"],
    }] });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId, status: "ACTIVE", removedAt: null, company: { status: "ACTIVE" } },
    }));
  });

  it("rejects malformed job inputs and unbounded public pagination", async () => {
    const invalidJob = plainToInstance(CreateJobDto, {
      categoryId, title: "IT", description: "Too short", employmentType: "UNKNOWN",
      workplaceType: "ONSITE", salaryMin: "-1",
    });
    expect((await validate(invalidJob)).length).toBeGreaterThanOrEqual(4);
    const invalidQuery = plainToInstance(PublicJobQueryDto, { page: "0", pageSize: "101" });
    expect((await validate(invalidQuery)).length).toBe(2);
    const invalidFilters = plainToInstance(PublicJobQueryDto, {
      provinceCode: "ZZ", salaryAtLeast: "-1", sort: "relevant", q: "x".repeat(101),
    });
    expect((await validate(invalidFilters)).map((error) => error.property).sort())
      .toEqual(["provinceCode", "q", "salaryAtLeast", "sort"]);
    const invalidLocation = plainToInstance(CreateJobDto, {
      categoryId, title: "Sample designer", description: "Design sample user interfaces for an approved demonstration.",
      employmentType: "FULL_TIME", workplaceType: "HYBRID",
      location: { provinceCode: "XX", wardCode: "bad" },
    });
    expect((await validate(invalidLocation)).map((error) => error.property)).toContain("location");
  });

  it("accepts exact JSON integer salaries from the frontend and rejects unsafe numbers", async () => {
    const base = {
      categoryId, title: "Senior nurse", description: "Care for patients in a clinic.",
      employmentType: "FULL_TIME", workplaceType: "ONSITE",
    };
    const accepted = plainToInstance(CreateJobDto, { ...base, salaryMin: 10000000, salaryMax: "20000000.50" });
    expect(await validate(accepted)).toEqual([]);
    expect(accepted.salaryMin).toBe("10000000");
    expect(accepted.salaryMax).toBe("20000000.50");
    const unsafe = plainToInstance(CreateJobDto, { ...base, salaryMin: Number.MAX_SAFE_INTEGER + 1 });
    expect((await validate(unsafe)).map((error) => error.property)).toContain("salaryMin");
  });
});
