import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type ApplicationAvailability, type ApplicationContactMethod } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { ApplicationPageQueryDto, AssignApplicationDto, ReviewApplicationDto, SubmitApplicationDto } from "./dto/application.dto";
import { validateScreeningAnswers } from "./screening-answers";

const applicationSelect = {
  id: true, companyId: true, jobId: true, status: true, version: true, resumeId: true,
  resumeVersionId: true, fullNameSnapshot: true, emailSnapshot: true, phoneSnapshot: true,
  currentLocationSnapshot: true, availability: true, preferredContactMethod: true,
  coverLetter: true, jobSnapshot: true, submittedAt: true, createdAt: true, updatedAt: true,
  job: { select: { id: true, title: true, status: true, company: { select: { id: true, name: true, slug: true } } } },
} as const;
const applicationDetailSelect = {
  ...applicationSelect,
  resumeVersion: { select: { id: true, versionNumber: true, templateCode: true, builderContent: true, builderSettings: true } },
  answers: { select: { id: true, screeningQuestionId: true, questionSnapshot: true, answerValue: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }] as Prisma.ApplicationAnswerOrderByWithRelationInput[] },
  statusHistory: { select: { id: true, fromStatus: true, toStatus: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }] as Prisma.ApplicationStatusHistoryOrderByWithRelationInput[] },
} as const;
const companyApplicationDetailSelect = {
  ...applicationDetailSelect,
  statusHistory: { select: { id: true, fromStatus: true, toStatus: true, changedByUserId: true, note: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }] as Prisma.ApplicationStatusHistoryOrderByWithRelationInput[] },
  assignments: { where: { removedAt: null },
    select: { id: true, assignmentType: true, companyMemberId: true, assignedByMemberId: true, assignedAt: true },
    orderBy: [{ assignedAt: "asc" }, { id: "asc" }] as Prisma.ApplicationAssignmentOrderByWithRelationInput[] },
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

  private async requireMember(tx: Prisma.TransactionClient, companyId: string, userId: string): Promise<string> {
    const member = await tx.companyMember.findFirst({
      where: { companyId, userId, status: "ACTIVE", removedAt: null, company: { status: "ACTIVE" } },
      select: { id: true },
    });
    if (!member) throw new ForbiddenException({ code: "AUTHORIZATION_FORBIDDEN", message: "Active company membership is required." });
    return member.id;
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
          where: { userId }, select: { id: true },
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
        const questions = await tx.screeningQuestion.findMany({
          where: { jobId, isActive: true },
          select: { id: true, type: true, label: true, isRequired: true, displayOrder: true, options: true },
          orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        });
        const answers = validateScreeningAnswers(questions, dto.answers);
        const application = await tx.application.create({
          data: {
            candidateProfileId: profile.id, companyId: job.companyId, jobId,
            resumeId: dto.resumeId, resumeVersionId: version.id, status: "SUBMITTED",
            fullNameSnapshot: dto.details.contact.fullName,
            emailSnapshot: dto.details.contact.email,
            phoneSnapshot: dto.details.contact.phone,
            currentLocationSnapshot: dto.details.currentLocation || null,
            availability: dto.details.availability.replaceAll("-", "_").toUpperCase() as ApplicationAvailability,
            preferredContactMethod: dto.details.preferredContactMethod.toUpperCase() as ApplicationContactMethod,
            coverLetter: dto.coverLetter, jobSnapshot: { id: job.id, title: job.title, categoryId: job.categoryId, publishedAt: job.publishedAt?.toISOString() },
            submittedAt: now,
            statusHistory: { create: { toStatus: "SUBMITTED", changedByUserId: userId } },
          },
          select: { id: true },
        });
        if (answers.length) {
          await tx.applicationAnswer.createMany({ data: answers.map((answer) => ({
            jobId, applicationId: application.id, screeningQuestionId: answer.screeningQuestionId,
            questionSnapshot: answer.questionSnapshot as Prisma.InputJsonValue,
            answerValue: answer.answerValue as Prisma.InputJsonValue,
          })) });
        }
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
    const row = await this.db.application.findFirst({ where: { id: applicationId, companyId, jobId }, select: companyApplicationDetailSelect });
    if (!row) throw missing();
    return row;
  }

  async assign(companyId: string, jobId: string, applicationId: string, userId: string, dto: AssignApplicationDto) {
    return this.db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Application" WHERE "id" = ${applicationId}::uuid
          AND "companyId" = ${companyId}::uuid AND "jobId" = ${jobId}::uuid FOR UPDATE
      `;
      if (locked.length !== 1) throw missing();
      const actorMemberId = await this.requireMember(tx, companyId, userId);
      const target = await tx.companyMember.findFirst({
        where: { id: dto.companyMemberId, companyId, status: "ACTIVE", removedAt: null,
          user: { status: "ACTIVE" } }, select: { id: true },
      });
      if (!target) throw new NotFoundException({ code: "COMPANY_MEMBER_NOT_FOUND", message: "Active company member was not found." });
      const current = await tx.applicationAssignment.findFirst({
        where: { applicationId, companyId, assignmentType: dto.assignmentType, removedAt: null },
        select: { id: true, companyMemberId: true, assignmentType: true, assignedByMemberId: true, assignedAt: true },
      });
      if (current?.companyMemberId === target.id) return current;
      if (current) await tx.applicationAssignment.updateMany({
        where: { applicationId, companyId, assignmentType: dto.assignmentType, removedAt: null },
        data: { removedAt: new Date() },
      });
      const assignment = await tx.applicationAssignment.create({ data: {
        applicationId, companyId, companyMemberId: target.id, assignmentType: dto.assignmentType,
        assignedByMemberId: actorMemberId,
      }, select: { id: true, companyMemberId: true, assignmentType: true, assignedByMemberId: true, assignedAt: true } });
      await tx.auditLog.create({ data: {
        actorUserId: userId, companyId, action: "application.assign", targetType: "Application", targetId: applicationId,
        beforeData: { assignmentType: dto.assignmentType, companyMemberId: current?.companyMemberId ?? null },
        afterData: { assignmentType: dto.assignmentType, companyMemberId: target.id },
      } });
      return assignment;
    });
  }

  async review(companyId: string, jobId: string, applicationId: string, userId: string, dto: ReviewApplicationDto) {
    return this.db.$transaction(async (tx) => {
      await this.requireMember(tx, companyId, userId);
      const current = await tx.application.findFirst({ where: { id: applicationId, companyId, jobId }, select: { status: true, version: true } });
      if (!current) throw missing();
      if (current.version !== dto.version) throw new ConflictException({ code: "APPLICATION_VERSION_CONFLICT", message: "Application version is stale." });
      const allowed: Record<string, readonly string[]> = {
        SUBMITTED: ["REVIEWING", "REJECTED"], REVIEWING: ["SHORTLISTED", "OFFERED", "REJECTED"],
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
        note: dto.note ?? null,
      } });
      await tx.auditLog.create({ data: {
        actorUserId: userId, companyId, action: "application.review", targetType: "Application", targetId: applicationId,
        beforeData: { status: current.status, version: dto.version }, afterData: { status: dto.status, version: dto.version + 1 },
      } });
      return tx.application.findUniqueOrThrow({ where: { id: applicationId }, select: applicationSelect });
    });
  }
}
