import { GUARDS_METADATA } from "@nestjs/common/constants";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CompanyController } from "../src/modules/company/company.controller";
import { CompanyRepository } from "../src/modules/company/company.repository";
import { PublicCompanyQueryDto } from "../src/modules/company/dto/public-company-query.dto";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { JobsService } from "../src/modules/jobs/jobs.service";

const companyId = "11111111-1111-4111-8111-111111111111";
const provinceId = "22222222-2222-4222-8222-222222222222";

function fixture() {
  const company = {
    findMany: jest.fn().mockResolvedValue([{
      id: companyId, name: "Acme", slug: "acme", description: "Public description",
      website: "https://acme.example", employeeSizeRange: "10-50", foundedYear: 2020,
      verificationStatus: "UNVERIFIED", industry: { id: "industry", code: "tech", name: "Technology" },
      locations: [{ countryCode: "VN", province: { id: provinceId, code: "79", name: "HCMC" }, ward: null }],
      _count: { jobs: 2 },
    }]),
    findFirst: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(1),
  };
  return { company, repo: new CompanyRepository({ company } as never) };
}

describe("public company discovery", () => {
  it("keeps workspace protected while public reads require no token", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyController.prototype.listMyWorkspace)).toEqual([AccessTokenGuard]);
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyController.prototype.listPublic)).toBeUndefined();
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyController.prototype.getPublic)).toBeUndefined();
  });

  it("filters ACTIVE companies and selects only safe public fields", async () => {
    const { company, repo } = fixture();
    const result = await repo.listPublic({ page: 2, pageSize: 10, q: "acme", industryCode: "tech", provinceId, verifiedOnly: true });
    expect(company.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: "ACTIVE", name: { contains: "acme", mode: "insensitive" },
        industry: { code: "tech" }, locations: { some: { provinceId } }, verificationStatus: "VERIFIED",
      },
      orderBy: [{ name: "asc" }, { id: "asc" }], skip: 10, take: 10,
    }));
    const select = company.findMany.mock.calls[0][0].select;
    for (const secret of ["createdByUserId", "taxCode", "legalName", "members", "invitations", "auditLogs", "logoAssetKey", "coverAssetKey"]) {
      expect(select[secret]).toBeUndefined();
    }
    expect(select._count.select.jobs.where).toMatchObject({ status: "PUBLISHED", category: { isActive: true } });
    expect(result).toEqual({ data: [expect.objectContaining({
      id: companyId, jobsCount: 2, isVerified: false,
    })], pagination: { page: 2, pageSize: 10, total: 1, totalPages: 1 } });
    expect(JSON.stringify(result)).not.toMatch(/taxCode|email|member|invitation|audit/);
  });

  it("hides inactive company details and constrains public jobs by company", async () => {
    const { company, repo } = fixture();
    await expect(repo.getPublic(companyId)).rejects.toMatchObject({ status: 404, response: { code: "PUBLIC_COMPANY_NOT_FOUND" } });
    expect(company.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: companyId, status: "ACTIVE" } }));
    const job = { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) };
    await new JobsService({ job } as never).listPublic({ page: 1, pageSize: 20, companyId });
    expect(job.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ companyId, status: "PUBLISHED", company: { status: "ACTIVE" } }),
    }));
  });

  it("rejects unsafe pagination and malformed public filters", async () => {
    const valid = plainToInstance(PublicCompanyQueryDto, { page: "2", pageSize: "25", verifiedOnly: "false", q: " Acme " });
    expect(await validate(valid)).toEqual([]);
    expect(valid).toMatchObject({ page: 2, pageSize: 25, verifiedOnly: false, q: "Acme" });
    const invalid = plainToInstance(PublicCompanyQueryDto, { page: "0", pageSize: "101", provinceId: "not-a-uuid", verifiedOnly: "yes" });
    expect((await validate(invalid)).map((error) => error.property).sort()).toEqual(["page", "pageSize", "provinceId", "verifiedOnly"]);
  });
});
