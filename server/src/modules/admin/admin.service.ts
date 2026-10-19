import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { AdminCompanyQueryDto, AdminJobQueryDto, AdminPageQueryDto, AdminUserQueryDto } from "./dto/admin.dto";

const userSelect = { id: true, email: true, status: true, emailVerifiedAt: true, createdAt: true, updatedAt: true } as const;
const companySelect = { id: true, name: true, slug: true, status: true, verificationStatus: true, verifiedAt: true, createdAt: true, updatedAt: true } as const;
const jobSelect = { id: true, companyId: true, categoryId: true, title: true, status: true, version: true, publishedAt: true, applicationDeadline: true, createdAt: true, updatedAt: true } as const;
const auditSelect = { id: true, actorUserId: true, companyId: true, action: true, targetType: true, targetId: true, createdAt: true } as const;

function missing(type: string) { return new NotFoundException({ code: `${type}_NOT_FOUND`, message: `${type} was not found.` }); }
function conflict(type: string) { return new ConflictException({ code: `${type}_STATE_CONFLICT`, message: `${type} cannot be changed from its current state.` }); }
function page<T>(data: T[], total: number, query: AdminPageQueryDto) {
  return { data, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
}

@Injectable()
export class AdminService {
  constructor(private readonly db: PrismaService) {}

  async dashboard() {
    const [users, activeUsers, companies, activeCompanies, pendingCompanies, jobs, publishedJobs, applications] = await Promise.all([
      this.db.user.count(), this.db.user.count({ where: { status: "ACTIVE" } }),
      this.db.company.count(), this.db.company.count({ where: { status: "ACTIVE" } }),
      this.db.company.count({ where: { status: "ACTIVE", verificationStatus: "PENDING" } }),
      this.db.job.count(), this.db.job.count({ where: { status: "PUBLISHED" } }),
      this.db.application.count(),
    ]);
    return { users, activeUsers, companies, activeCompanies, pendingCompanies, jobs, publishedJobs, applications };
  }

  async users(query: AdminUserQueryDto) {
    const where: Prisma.UserWhereInput = { ...(query.status && { status: query.status }), ...(query.q && { email: { contains: query.q, mode: "insensitive" } }) };
    const [data, total] = await Promise.all([
      this.db.user.findMany({ where, select: userSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.user.count({ where }),
    ]);
    return page(data, total, query);
  }

  async user(userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!user) throw missing("USER");
    return user;
  }

  async companies(query: AdminCompanyQueryDto) {
    const where: Prisma.CompanyWhereInput = {
      // The pending queue contains only companies eligible for a verification decision.
      ...((query.status || query.verificationStatus === "PENDING") &&
        { status: query.status ?? "ACTIVE" }),
      ...(query.verificationStatus && { verificationStatus: query.verificationStatus }),
      ...(query.q && { name: { contains: query.q, mode: "insensitive" } }),
    };
    const [data, total] = await Promise.all([
      this.db.company.findMany({ where, select: companySelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.company.count({ where }),
    ]);
    return page(data, total, query);
  }

  async company(companyId: string) {
    const company = await this.db.company.findUnique({
      where: { id: companyId },
      select: { ...companySelect, createdByUserId: true, legalName: true, taxCode: true,
        industryId: true, description: true, website: true, employeeSizeRange: true,
        foundedYear: true, locations: { select: { id: true, countryCode: true, provinceId: true,
          wardId: true, addressLine: true, isHeadquarters: true } },
        _count: { select: { members: true, jobs: true, applications: true } } },
    });
    if (!company) throw missing("COMPANY");
    return company;
  }

  async jobs(query: AdminJobQueryDto) {
    const where: Prisma.JobWhereInput = { ...(query.status && { status: query.status }), ...(query.companyId && { companyId: query.companyId }) };
    const [data, total] = await Promise.all([
      this.db.job.findMany({ where, select: jobSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.job.count({ where }),
    ]);
    return page(data, total, query);
  }

  async job(jobId: string) {
    const job = await this.db.job.findUnique({
      where: { id: jobId },
      select: { ...jobSelect, description: true, employmentType: true, workplaceType: true,
        experienceMinMonths: true, experienceMaxMonths: true, salaryMin: true, salaryMax: true,
        currency: true, salaryPeriod: true, salaryNegotiable: true, showSalary: true, expiresAt: true,
        company: { select: { id: true, name: true, status: true, verificationStatus: true } },
        category: { select: { id: true, code: true, name: true } },
        _count: { select: { applications: true } } },
    });
    if (!job) throw missing("JOB");
    return job;
  }

  async audits(query: AdminPageQueryDto) {
    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({ select: auditSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.auditLog.count(),
    ]);
    return page(data, total, query);
  }

  async setUserStatus(actorUserId: string, userId: string, status: "ACTIVE" | "SUSPENDED" | "DISABLED") {
    if (actorUserId === userId) throw new ForbiddenException({ code: "ADMIN_SELF_MUTATION_FORBIDDEN", message: "Administrators cannot change their own account status." });
    return this.db.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId }, select: { status: true } });
      if (!current) throw missing("USER");
      if (current.status === "DISABLED" || current.status === status) throw conflict("USER");
      // System role holders and users with direct SYSTEM grants require a separate,
      // higher-authority workflow. This also protects the last platform administrator.
      const [systemRole, systemGrant] = await Promise.all([
        tx.systemUserRole.findFirst({
          where: { userId, role: { is: { kind: "SYSTEM", isActive: true, systemCode: { not: "CANDIDATE" } } } },
          select: { roleId: true },
        }),
        tx.systemUserPermission.findFirst({
          where: { userId, effect: "ALLOW", dataScope: "SYSTEM",
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          select: { permissionId: true },
        }),
      ]);
      if (systemRole || systemGrant) {
        throw new ForbiddenException({ code: "ADMIN_PRIVILEGED_TARGET_FORBIDDEN",
          message: "This account has platform authority and cannot be moderated through this endpoint." });
      }
      const updated = await tx.user.updateMany({ where: { id: userId, status: current.status }, data: { status } });
      if (updated.count !== 1) throw conflict("USER");
      await tx.auditLog.create({ data: { actorUserId, action: "admin.user.status", targetType: "User", targetId: userId,
        beforeData: { status: current.status }, afterData: { status } } });
      return tx.user.findUniqueOrThrow({ where: { id: userId }, select: userSelect });
    });
  }

  async setCompanyVerification(actorUserId: string, companyId: string, status: "VERIFIED" | "REJECTED") {
    return this.db.$transaction(async (tx) => {
      const current = await tx.company.findUnique({ where: { id: companyId }, select: { status: true, verificationStatus: true } });
      if (!current) throw missing("COMPANY");
      if (current.status !== "ACTIVE" || current.verificationStatus !== "PENDING") throw conflict("COMPANY");
      const updated = await tx.company.updateMany({ where: { id: companyId, status: "ACTIVE", verificationStatus: "PENDING" },
        data: { verificationStatus: status, verifiedAt: status === "VERIFIED" ? new Date() : null } });
      if (updated.count !== 1) throw conflict("COMPANY");
      await tx.auditLog.create({ data: { actorUserId, companyId, action: "admin.company.verify", targetType: "Company", targetId: companyId,
        beforeData: { verificationStatus: current.verificationStatus }, afterData: { verificationStatus: status } } });
      return tx.company.findUniqueOrThrow({ where: { id: companyId }, select: companySelect });
    });
  }

  async setCompanyStatus(actorUserId: string, companyId: string, status: "ACTIVE" | "SUSPENDED") {
    return this.db.$transaction(async (tx) => {
      const current = await tx.company.findUnique({ where: { id: companyId }, select: { status: true } });
      if (!current) throw missing("COMPANY");
      if (current.status === "ARCHIVED" || current.status === status) throw conflict("COMPANY");
      const updated = await tx.company.updateMany({ where: { id: companyId, status: current.status }, data: { status } });
      if (updated.count !== 1) throw conflict("COMPANY");
      await tx.auditLog.create({ data: { actorUserId, companyId, action: "admin.company.status", targetType: "Company", targetId: companyId,
        beforeData: { status: current.status }, afterData: { status } } });
      return tx.company.findUniqueOrThrow({ where: { id: companyId }, select: companySelect });
    });
  }

  async closeJob(actorUserId: string, jobId: string) {
    return this.db.$transaction(async (tx) => {
      const current = await tx.job.findUnique({ where: { id: jobId }, select: { companyId: true, status: true, version: true } });
      if (!current) throw missing("JOB");
      if (current.status !== "PUBLISHED" && current.status !== "PAUSED") throw conflict("JOB");
      const updated = await tx.job.updateMany({ where: { id: jobId, status: current.status, version: current.version },
        data: { status: "CLOSED", version: { increment: 1 } } });
      if (updated.count !== 1) throw conflict("JOB");
      await tx.auditLog.create({ data: { actorUserId, companyId: current.companyId, action: "admin.job.close", targetType: "Job", targetId: jobId,
        beforeData: { status: current.status, version: current.version }, afterData: { status: "CLOSED", version: current.version + 1 } } });
      return tx.job.findUniqueOrThrow({ where: { id: jobId }, select: jobSelect });
    });
  }
}
