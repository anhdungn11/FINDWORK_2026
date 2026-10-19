import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AdminService } from "../src/modules/admin/admin.service";
import { AdminCompanyQueryDto, AdminJobQueryDto, AdminUserQueryDto } from "../src/modules/admin/dto/admin.dto";

function dbFixture() {
  const model = () => ({ findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) });
  const db = { user: model(), company: model(), job: model(), auditLog: model(),
    application: { count: jest.fn().mockResolvedValue(0) } };
  return { db, service: new AdminService(db as never) };
}

describe("admin PostgreSQL read contracts", () => {
  it("derives dashboard metrics from eight database counts", async () => {
    const { db, service } = dbFixture();
    db.user.count.mockResolvedValueOnce(11).mockResolvedValueOnce(9);
    db.company.count.mockResolvedValueOnce(5).mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    db.job.count.mockResolvedValueOnce(20).mockResolvedValueOnce(7);
    db.application.count.mockResolvedValueOnce(31);
    await expect(service.dashboard()).resolves.toEqual({
      users: 11, activeUsers: 9, companies: 5, activeCompanies: 4,
      pendingCompanies: 2, jobs: 20, publishedJobs: 7, applications: 31,
    });
    expect(db.user.count).toHaveBeenNthCalledWith(2, { where: { status: "ACTIVE" } });
    expect(db.company.count).toHaveBeenNthCalledWith(3, { where: { status: "ACTIVE", verificationStatus: "PENDING" } });
    expect(db.job.count).toHaveBeenNthCalledWith(2, { where: { status: "PUBLISHED" } });
  });

  it("uses identical filters for company data and total, with bounded database pagination", async () => {
    const { db, service } = dbFixture();
    db.company.count.mockResolvedValue(23);
    const query = { page: 2, pageSize: 10, status: "ACTIVE" as const,
      verificationStatus: "PENDING" as const, q: "Acme" };
    await expect(service.companies(query)).resolves.toEqual({ data: [],
      pagination: { page: 2, pageSize: 10, total: 23, totalPages: 3 } });
    const where = { status: "ACTIVE", verificationStatus: "PENDING",
      name: { contains: "Acme", mode: "insensitive" } };
    expect(db.company.findMany).toHaveBeenCalledWith(expect.objectContaining({ where, skip: 10, take: 10 }));
    expect(db.company.count).toHaveBeenCalledWith({ where });
  });

  it("uses the dashboard's actionable ACTIVE/PENDING predicate for the pending queue", async () => {
    const { db, service } = dbFixture();
    db.company.count.mockResolvedValue(4);
    await expect(service.companies({ page: 1, pageSize: 2, verificationStatus: "PENDING" }))
      .resolves.toEqual({ data: [], pagination: { page: 1, pageSize: 2, total: 4, totalPages: 2 } });
    const where = { status: "ACTIVE", verificationStatus: "PENDING" };
    expect(db.company.findMany).toHaveBeenCalledWith(expect.objectContaining({ where, skip: 0, take: 2 }));
    expect(db.company.count).toHaveBeenCalledWith({ where });
    await service.companies({ page: 1, pageSize: 2, status: "SUSPENDED", verificationStatus: "PENDING" });
    expect(db.company.count).toHaveBeenLastCalledWith({ where: { status: "SUSPENDED", verificationStatus: "PENDING" } });
  });

  it("filters user and job lists in PostgreSQL and never selects account secrets", async () => {
    const { db, service } = dbFixture();
    await service.users({ page: 1, pageSize: 5, q: "user", status: "ACTIVE" });
    const userQuery = db.user.findMany.mock.calls[0][0];
    expect(userQuery.where).toEqual({ status: "ACTIVE", email: { contains: "user", mode: "insensitive" } });
    expect(db.user.count).toHaveBeenCalledWith({ where: userQuery.where });
    for (const secret of ["passwordHash", "authSessions", "refreshTokenHash"]) {
      expect(userQuery.select[secret]).toBeUndefined();
    }
    await service.jobs({ page: 3, pageSize: 5, status: "PUBLISHED",
      companyId: "33333333-3333-4333-8333-333333333333" });
    const jobQuery = db.job.findMany.mock.calls[0][0];
    expect(jobQuery.skip).toBe(10);
    expect(db.job.count).toHaveBeenCalledWith({ where: jobQuery.where });
  });

  it("returns only audit metadata and applies database pagination", async () => {
    const { db, service } = dbFixture();
    await service.audits({ page: 2, pageSize: 20 });
    const query = db.auditLog.findMany.mock.calls[0][0];
    expect(query).toEqual(expect.objectContaining({ skip: 20, take: 20 }));
    for (const payload of ["beforeData", "afterData", "metadata"]) expect(query.select[payload]).toBeUndefined();
    expect(db.auditLog.count).toHaveBeenCalledWith();
  });

  it("rejects invalid pagination and queue filters before reaching service", async () => {
    const company = plainToInstance(AdminCompanyQueryDto, { page: "0", pageSize: "101", verificationStatus: "ANY" });
    expect((await validate(company)).map((error) => error.property).sort())
      .toEqual(["page", "pageSize", "verificationStatus"]);
    expect(await validate(plainToInstance(AdminUserQueryDto, { q: "ab", page: "1" }))).toHaveLength(0);
    expect(await validate(plainToInstance(AdminJobQueryDto, { companyId: "invalid" }))).not.toHaveLength(0);
  });
});
