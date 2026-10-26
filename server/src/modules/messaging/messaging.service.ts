import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { MessagingPageDto } from "./messaging.dto";

type Side = "CANDIDATE" | "COMPANY";

@Injectable()
export class MessagingService {
  constructor(private readonly db: PrismaService) {}

  private async requireApplication(side: Side, userId: string, applicationId: string, companyId?: string) {
    const application = await this.db.application.findFirst({
      where: { id: applicationId, status: { not: "DRAFT" },
        ...(side === "CANDIDATE" ? { candidateProfile: { userId } } : { companyId }) },
      select: { id: true },
    });
    if (!application) throw new NotFoundException({ code: "CONVERSATION_NOT_FOUND" });
  }

  async list(side: Side, userId: string, query: MessagingPageDto, companyId?: string) {
    const where = { status: { not: "DRAFT" as const },
      ...(side === "CANDIDATE" ? { candidateProfile: { userId } } : { companyId }) };
    const [applications, total] = await Promise.all([
      this.db.application.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.pageSize, take: query.pageSize,
        select: { id: true, companyId: true, jobId: true, status: true,
          company: { select: { name: true } }, job: { select: { title: true } },
          messages: { select: { createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 } } }),
      this.db.application.count({ where }),
    ]);
    const data = await Promise.all(applications.map(async (application) => ({
      applicationId: application.id, companyId: application.companyId, jobId: application.jobId,
      applicationStatus: application.status, companyName: application.company.name,
      jobTitle: application.job.title, lastMessageAt: application.messages[0]?.createdAt ?? null,
      unreadCount: await this.db.applicationMessage.count({ where: { applicationId: application.id,
        senderRole: side === "CANDIDATE" ? "COMPANY" : "CANDIDATE",
        ...(side === "CANDIDATE" ? { candidateReadAt: null } : { companyReadAt: null }) } }),
    })));
    return { data, pagination: { page: query.page, pageSize: query.pageSize, total,
      totalPages: Math.ceil(total / query.pageSize) } };
  }

  async messages(side: Side, userId: string, applicationId: string, query: MessagingPageDto, companyId?: string) {
    await this.requireApplication(side, userId, applicationId, companyId);
    const where = { applicationId };
    const [data, total, unreadCount] = await Promise.all([
      this.db.applicationMessage.findMany({ where, select: { id: true, senderRole: true, body: true,
        createdAt: true, candidateReadAt: true, companyReadAt: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.applicationMessage.count({ where }),
      this.db.applicationMessage.count({ where: { applicationId,
        senderRole: side === "CANDIDATE" ? "COMPANY" : "CANDIDATE",
        ...(side === "CANDIDATE" ? { candidateReadAt: null } : { companyReadAt: null }) } }),
    ]);
    return { data, unreadCount, pagination: { page: query.page, pageSize: query.pageSize, total,
      totalPages: Math.ceil(total / query.pageSize) } };
  }

  async send(side: Side, userId: string, applicationId: string, body: string, companyId?: string) {
    await this.requireApplication(side, userId, applicationId, companyId);
    const message = await this.db.applicationMessage.create({ data: { applicationId, senderUserId: userId,
      senderRole: side, body,
      ...(side === "CANDIDATE" ? { candidateReadAt: new Date() } : { companyReadAt: new Date() }) },
      select: { id: true, senderRole: true, body: true, createdAt: true,
        candidateReadAt: true, companyReadAt: true } });
    return message;
  }

  async markRead(side: Side, userId: string, applicationId: string, companyId?: string) {
    await this.requireApplication(side, userId, applicationId, companyId);
    const updated = await this.db.applicationMessage.updateMany({ where: { applicationId,
      senderRole: side === "CANDIDATE" ? "COMPANY" : "CANDIDATE",
      ...(side === "CANDIDATE" ? { candidateReadAt: null } : { companyReadAt: null }) },
      data: side === "CANDIDATE" ? { candidateReadAt: new Date() } : { companyReadAt: new Date() } });
    return { readCount: updated.count };
  }
}
