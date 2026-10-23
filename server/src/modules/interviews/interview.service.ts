import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { Prisma } from "../../generated/prisma/client";
import type { ScheduleInterviewDto } from "./interview.dto";

const view = { id: true, companyId: true, applicationId: true, scheduledAt: true, durationMinutes: true,
  type: true, location: true, status: true, createdAt: true, updatedAt: true,
  session: { select: { id: true, provider: true, joinUrl: true } } } as const;

@Injectable()
export class InterviewService {
  constructor(private readonly db: PrismaService) {}

  private async reviewer(tx: Prisma.TransactionClient, companyId: string, actorUserId: string) {
    const member = await tx.companyMember.findFirst({ where: { companyId, userId: actorUserId,
      status: "ACTIVE", removedAt: null, company: { status: "ACTIVE" } }, select: { id: true } });
    if (!member) throw new ForbiddenException({ code: "AUTHORIZATION_FORBIDDEN" });
    const permission = await tx.permission.findUnique({ where: { code: "application.review" }, select: {
      isDeprecated: true,
      companyMemberPermissions: { where: { companyId, companyMemberId: member.id },
        select: { effect: true, dataScope: true, expiresAt: true }, take: 1 },
      rolePermissions: { where: { role: { is: { kind: "COMPANY", companyId, isActive: true,
        companyMembers: { some: { companyId, companyMemberId: member.id } } } } }, select: { dataScope: true } },
    } });
    const direct = permission?.companyMemberPermissions[0];
    const allowed = permission && !permission.isDeprecated &&
      (direct && (!direct.expiresAt || direct.expiresAt > new Date())
        ? direct.effect === "ALLOW" && direct.dataScope === "COMPANY"
        : permission.rolePermissions.some((grant) => grant.dataScope === "COMPANY") &&
          permission.rolePermissions.every((grant) => grant.dataScope === "COMPANY" || grant.dataScope === "ASSIGNED"));
    if (!allowed) throw new ForbiddenException({ code: "AUTHORIZATION_COMPANY_SCOPE_REQUIRED" });
    return member;
  }

  private future(value: string) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date.getTime() < Date.now() + 5 * 60_000 ||
      date.getTime() > Date.now() + 365 * 86_400_000) {
      throw new BadRequestException({ code: "INTERVIEW_TIME_INVALID" });
    }
    return date;
  }

  async schedule(companyId: string, applicationId: string, actorUserId: string, dto: ScheduleInterviewDto) {
    const scheduledAt = this.future(dto.scheduledAt);
    if (dto.provider === "ZOOM") throw new ServiceUnavailableException({ code: "INTERVIEW_ZOOM_NOT_CONFIGURED" });
    if (dto.type === "ONSITE" && !dto.location) throw new BadRequestException({ code: "INTERVIEW_LOCATION_REQUIRED" });
    if (dto.type === "VIDEO" && !dto.meetingUrl) throw new BadRequestException({ code: "INTERVIEW_MEETING_URL_REQUIRED" });
    if (dto.type !== "VIDEO" && dto.meetingUrl) throw new BadRequestException({ code: "INTERVIEW_MEETING_URL_INVALID" });
    return this.db.$transaction(async (tx) => {
      const application = await tx.application.findFirst({ where: { id: applicationId, companyId }, select: { status: true } });
      if (!application) throw new NotFoundException({ code: "APPLICATION_NOT_FOUND" });
      if (!["SUBMITTED", "REVIEWING", "SHORTLISTED", "INTERVIEW"].includes(application.status)) {
        throw new ConflictException({ code: "INTERVIEW_APPLICATION_STATE_CONFLICT" });
      }
      const member = await this.reviewer(tx, companyId, actorUserId);
      const created = await tx.interview.create({ data: { companyId, applicationId,
        createdByMemberId: member.id, scheduledAt, durationMinutes: dto.durationMinutes,
        type: dto.type, location: dto.type === "ONSITE" ? dto.location : null,
        meetingUrl: dto.type === "VIDEO" ? dto.meetingUrl : null,
        session: { create: { provider: "MANUAL", joinUrl: dto.type === "VIDEO" ? dto.meetingUrl : null } } },
        select: view });
      await tx.auditLog.create({ data: { actorUserId, companyId, action: "company.interview.schedule",
        targetType: "Interview", targetId: created.id,
        afterData: { applicationId, scheduledAt: scheduledAt.toISOString(), type: dto.type, provider: "MANUAL" } } });
      return created;
    });
  }

  async listCompany(companyId: string, applicationId: string) {
    const application = await this.db.application.findFirst({ where: { id: applicationId, companyId }, select: { id: true } });
    if (!application) throw new NotFoundException({ code: "APPLICATION_NOT_FOUND" });
    return this.db.interview.findMany({ where: { companyId, applicationId }, select: view,
      orderBy: [{ scheduledAt: "desc" }, { id: "desc" }], take: 100 });
  }

  async listCandidate(userId: string, applicationId: string) {
    const application = await this.db.application.findFirst({ where: { id: applicationId, candidateProfile: { userId } },
      select: { id: true } });
    if (!application) throw new NotFoundException({ code: "APPLICATION_NOT_FOUND" });
    return this.db.interview.findMany({ where: { applicationId }, select: view,
      orderBy: [{ scheduledAt: "desc" }, { id: "desc" }], take: 100 });
  }

  async updateStatus(companyId: string, interviewId: string, actorUserId: string,
    action: "cancel" | "complete" | "reschedule", scheduledAtText?: string) {
    const scheduledAt = action === "reschedule" ? this.future(scheduledAtText!) : undefined;
    return this.db.$transaction(async (tx) => {
      const row = await tx.interview.findFirst({ where: { id: interviewId, companyId },
        select: { status: true, scheduledAt: true } });
      if (!row) throw new NotFoundException({ code: "INTERVIEW_NOT_FOUND" });
      if (row.status !== "SCHEDULED" && row.status !== "RESCHEDULED") throw new ConflictException({ code: "INTERVIEW_STATE_CONFLICT" });
      if (action === "complete" && row.scheduledAt > new Date()) {
        throw new ConflictException({ code: "INTERVIEW_NOT_STARTED" });
      }
      if (action === "reschedule" && scheduledAt!.getTime() === row.scheduledAt.getTime()) {
        throw new ConflictException({ code: "INTERVIEW_TIME_UNCHANGED" });
      }
      await this.reviewer(tx, companyId, actorUserId);
      const status = action === "cancel" ? "CANCELLED" : action === "complete" ? "COMPLETED" : "RESCHEDULED";
      const updated = await tx.interview.update({ where: { id: interviewId },
        data: { status, ...(scheduledAt && { scheduledAt }) }, select: view });
      await tx.auditLog.create({ data: { actorUserId, companyId, action: `company.interview.${action}`,
        targetType: "Interview", targetId: interviewId,
        beforeData: { status: row.status, scheduledAt: row.scheduledAt.toISOString() },
        afterData: { status, scheduledAt: updated.scheduledAt.toISOString() } } });
      return updated;
    });
  }
}
