import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { ApplicationPageQueryDto, ReviewApplicationDto, SubmitApplicationDto } from "./dto/application.dto";

const applicationSelect = {
  id: true, companyId: true, jobId: true, status: true, version: true, resumeId: true,
  resumeVersionId: true, fullNameSnapshot: true, emailSnapshot: true, phoneSnapshot: true,
  coverLetter: true, jobSnapshot: true, submittedAt: true, createdAt: true, updatedAt: true,
  job: { select: { id: true, title: true, status: true, company: { select: { id: true, name: true, slug: true } } } },
} as const;
const applicationDetailSelect = {
  ...applicationSelect,
  resumeVersion: { select: { id: true, versionNumber: true, templateCode: true, builderContent: true, builderSettings: true } },
} as const;

function missing(): NotFoundException {
  return new NotFoundException({ code: "APPLICATION_NOT_FOUND", message: "Application was not found." });
}
function unavailable(): ConflictException {
  return new ConflictException({ code: "JOB_UNAVAILABLE", message: "Job is not accepting applications." });
}

@Injectable()
export class ApplicationsService {
  constructor(private readonly db: PrismaService) {}

  private async requireMember(tx: Prisma.TransactionClient, companyId: string, userId: string): Promise<void> {
    const member = await tx.companyMember.findFirst({
      where: { companyId, userId, status: "ACTIVE", removedAt: null, company: { status: "ACTIVE" } },
      select: { id: true },
    });
    if (!member) throw new ForbiddenException({ code: "AUTHORIZATION_FORBIDDEN", message: "Active company membership is required." });
  }

  async submit(userId: string, jobId: string, dto: SubmitApplicationDto) {
    try {
      return await this.db.$transaction(async (tx) => {
        // Serialize against pause/close: a submit cannot commit after the job stops accepting applications.
        await tx.$queryRaw`SELECT "id" FROM "Job" WHERE "id" = ${jobId}::uuid FOR SHARE`;
        const now = new Date();
        const job = await tx.job.findFirst({
          where: {
            id: jobId, status: "PUBLISHED", company: { status: "ACTIVE" }, category: { isActive: true },
            publishedAt: { lte: now },
            AND: [
              { OR: [{ applicationDeadline: null }, { applicationDeadline: { gt: now } }] },
              { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            ],
          },
          select: { id: true, companyId: true, title: true, categoryId: true, publishedAt: true },
        });
        if (!job) throw unavailable();
        const profile = await tx.candidateProfile.findUnique({
          where: { userId }, select: { id: true, fullName: true, phone: true, user: { select: { email: true } } },
        });
        if (!profile) throw new NotFoundException({ code: "CANDIDATE_PROFILE_NOT_FOUND", message: "Candidate profile was not found." });
        const version = await tx.resumeVersion.findFirst({
          where: {
            id: dto.resumeVersionId, resumeId: dto.resumeId, builderContent: { not: Prisma.DbNull },
            resume: { candidateProfileId: profile.id, sourceType: "BUILDER", status: "READY", deletedAt: null },
          },
          select: { id: true },
        });
        if (!version) throw new BadRequestException({ code: "RESUME_UNAVAILABLE", message: "An owned, ready builder resume version is required." });
        const application = await tx.application.create({
          data: {
            candidateProfileId: profile.id, companyId: job.companyId, jobId,
            resumeId: dto.resumeId, resumeVersionId: version.id, status: "SUBMITTED",
            fullNameSnapshot: profile.fullName, emailSnapshot: profile.user.email, phoneSnapshot: profile.phone,
            coverLetter: dto.coverLetter, jobSnapshot: { id: job.id, title: job.title, categoryId: job.categoryId, publishedAt: job.publishedAt?.toISOString() },
            submittedAt: now,
            statusHistory: { create: { toStatus: "SUBMITTED", changedByUserId: userId } },
          },
          select: { id: true },
        });
        return tx.application.findUniqueOrThrow({ where: { id: application.id }, select: applicationSelect });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException({ code: "APPLICATION_DUPLICATE", message: "This candidate has already applied to this job." });
      }
      throw error;
    }
  }

  async listCandidate(userId: string, query: ApplicationPageQueryDto) {
    const where: Prisma.ApplicationWhereInput = { candidateProfile: { userId }, ...(query.status && { status: query.status }) };
    const [data, total] = await Promise.all([
      this.db.application.findMany({ where, select: applicationSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.application.count({ where }),
    ]);
    return { data, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  }

  async getCandidate(userId: string, applicationId: string) {
    const row = await this.db.application.findFirst({ where: { id: applicationId, candidateProfile: { userId } }, select: applicationDetailSelect });
    if (!row) throw missing();
    return row;
  }

  async listCompany(companyId: string, jobId: string, query: ApplicationPageQueryDto) {
    const job = await this.db.job.findFirst({ where: { id: jobId, companyId }, select: { id: true } });
    if (!job) throw new NotFoundException({ code: "JOB_NOT_FOUND", message: "Job was not found." });
    const where: Prisma.ApplicationWhereInput = { companyId, jobId, ...(query.status && { status: query.status }) };
    const [data, total] = await Promise.all([
      this.db.application.findMany({ where, select: applicationSelect, orderBy: [{ submittedAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.application.count({ where }),
    ]);
    return { data, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  }

  async getCompany(companyId: string, jobId: string, applicationId: string) {
    const row = await this.db.application.findFirst({ where: { id: applicationId, companyId, jobId }, select: applicationDetailSelect });
    if (!row) throw missing();
    return row;
  }

  async review(companyId: string, jobId: string, applicationId: string, userId: string, dto: ReviewApplicationDto) {
    return this.db.$transaction(async (tx) => {
      await this.requireMember(tx, companyId, userId);
      const current = await tx.application.findFirst({ where: { id: applicationId, companyId, jobId }, select: { status: true, version: true } });
      if (!current) throw missing();
      if (current.version !== dto.version) throw new ConflictException({ code: "APPLICATION_VERSION_CONFLICT", message: "Application version is stale." });
      const allowed: Record<string, readonly string[]> = {
        SUBMITTED: ["REVIEWING", "REJECTED"], REVIEWING: ["SHORTLISTED", "REJECTED"],
        SHORTLISTED: ["INTERVIEW", "REJECTED"], INTERVIEW: ["OFFERED", "REJECTED"],
      };
      if (!allowed[current.status]?.includes(dto.status)) {
        throw new ConflictException({ code: "APPLICATION_STATE_CONFLICT", message: "Application status transition is not allowed." });
      }
      const result = await tx.application.updateMany({
        where: { id: applicationId, companyId, jobId, status: current.status, version: dto.version },
        data: { status: dto.status, version: { increment: 1 } },
      });
      if (result.count !== 1) throw new ConflictException({ code: "APPLICATION_VERSION_CONFLICT", message: "Application changed during review." });
      await tx.applicationStatusHistory.create({ data: {
        applicationId, fromStatus: current.status, toStatus: dto.status, changedByUserId: userId,
      } });
      await tx.auditLog.create({ data: {
        actorUserId: userId, companyId, action: "application.review", targetType: "Application", targetId: applicationId,
        beforeData: { status: current.status, version: dto.version }, afterData: { status: dto.status, version: dto.version + 1 },
      } });
      return tx.application.findUniqueOrThrow({ where: { id: applicationId }, select: applicationSelect });
    });
  }
}
