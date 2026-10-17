import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { CreateBuilderResumeDto, UpdateBuilderResumeDto } from "./dto/create-builder-resume.dto";

const resumeSelect = {
  id: true, name: true, sourceType: true, status: true, isDefault: true,
  createdAt: true, updatedAt: true,
  versions: {
    orderBy: { versionNumber: "desc" as const },
    select: { id: true, versionNumber: true, templateCode: true, builderContent: true, builderSettings: true, createdAt: true },
  },
} as const;

@Injectable()
export class CandidateResumesService {
  constructor(private readonly db: PrismaService) {}

  private validateContent(content: Record<string, unknown>, settings?: Record<string, unknown>): void {
    let bytes: number;
    try { bytes = Buffer.byteLength(JSON.stringify({ content, settings }), "utf8"); }
    catch { throw new BadRequestException({ code: "RESUME_CONTENT_INVALID", message: "Builder content must be JSON." }); }
    if (bytes > 128 * 1024) {
      throw new BadRequestException({ code: "RESUME_CONTENT_TOO_LARGE", message: "Builder content exceeds 128 KB." });
    }
  }

  async create(userId: string, dto: CreateBuilderResumeDto) {
    this.validateContent(dto.builderContent, dto.builderSettings);
    return this.db.$transaction(async (tx) => {
      const profile = await tx.candidateProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!profile) throw new NotFoundException({ code: "CANDIDATE_PROFILE_NOT_FOUND", message: "Candidate profile was not found." });
      const resume = await tx.resume.create({ data: {
        candidateProfileId: profile.id, name: dto.name, sourceType: "BUILDER", status: "READY",
        versions: { create: {
          versionNumber: 1, builderContent: dto.builderContent as Prisma.InputJsonObject,
          templateCode: dto.templateCode,
          builderSettings: dto.builderSettings as Prisma.InputJsonObject | undefined,
        } },
      }, select: { id: true } });
      return tx.resume.findUniqueOrThrow({ where: { id: resume.id }, select: resumeSelect });
    });
  }

  async update(userId: string, resumeId: string, dto: UpdateBuilderResumeDto) {
    this.validateContent(dto.builderContent, dto.builderSettings);
    try {
      return await this.db.$transaction(async (tx) => {
        const resume = await tx.resume.findFirst({
          where: { id: resumeId, candidateProfile: { userId }, deletedAt: null },
          select: { id: true, sourceType: true, status: true,
            versions: { orderBy: { versionNumber: "desc" }, take: 1,
              select: { versionNumber: true, templateCode: true, builderSettings: true } } },
        });
        if (!resume) throw new NotFoundException({ code: "RESUME_NOT_FOUND", message: "Resume was not found." });
        if (resume.sourceType !== "BUILDER" || resume.status !== "READY") {
          throw new ConflictException({ code: "RESUME_STATE_CONFLICT", message: "Only ready builder resumes can be updated." });
        }
        const latest = resume.versions[0];
        if (latest?.versionNumber !== dto.expectedVersionNumber) {
          throw new ConflictException({ code: "RESUME_VERSION_CONFLICT", message: "Resume version is stale." });
        }
        this.validateContent(dto.builderContent,
          (dto.builderSettings ?? latest.builderSettings ?? undefined) as Record<string, unknown> | undefined);
        // The unique (resumeId, versionNumber) key is the final concurrent writer guard.
        // A failed insert rolls back the name update and any other transaction writes.
        await tx.resumeVersion.create({ data: {
          resumeId, versionNumber: dto.expectedVersionNumber + 1,
          builderContent: dto.builderContent as Prisma.InputJsonObject,
          templateCode: dto.templateCode ?? latest.templateCode,
          builderSettings: (dto.builderSettings ?? latest.builderSettings ?? undefined) as Prisma.InputJsonObject | undefined,
        } });
        await tx.resume.update({ where: { id: resumeId }, data: { name: dto.name } });
        return tx.resume.findUniqueOrThrow({ where: { id: resumeId }, select: resumeSelect });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException({ code: "RESUME_VERSION_CONFLICT", message: "Resume version changed during update." });
      }
      throw error;
    }
  }

  async list(userId: string) {
    const data = await this.db.resume.findMany({
      where: { candidateProfile: { userId }, deletedAt: null },
      select: { ...resumeSelect, versions: { orderBy: { versionNumber: "desc" }, take: 1,
        select: { id: true, versionNumber: true, createdAt: true } } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
    return { data };
  }

  async get(userId: string, resumeId: string) {
    const resume = await this.db.resume.findFirst({
      where: { id: resumeId, candidateProfile: { userId }, deletedAt: null },
      select: resumeSelect,
    });
    if (!resume) throw new NotFoundException({ code: "RESUME_NOT_FOUND", message: "Resume was not found." });
    return resume;
  }
}
