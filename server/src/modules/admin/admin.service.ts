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
      this.db.company.count({ where: { verificationStatus: "PENDING" } }),
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

  async companies(query: AdminCompanyQueryDto) {
    const where: Prisma.CompanyWhereInput = { ...(query.status && { status: query.status }) };
    const [data, total] = await Promise.all([
      this.db.company.findMany({ where, select: companySelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.company.count({ where }),
    ]);
    return page(data, total, query);
  }

  async jobs(query: AdminJobQueryDto) {
    const where: Prisma.JobWhereInput = { ...(query.status && { status: query.status }), ...(query.companyId && { companyId: query.companyId }) };
    const [data, total] = await Promise.all([
      this.db.job.findMany({ where, select: jobSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.job.count({ where }),
    ]);
    return page(data, total, query);
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
      if (current.status !== "ACTIVE" || current.verificationStatus === status) throw conflict("COMPANY");
      const updated = await tx.company.updateMany({ where: { id: companyId, status: "ACTIVE", verificationStatus: current.verificationStatus },
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
