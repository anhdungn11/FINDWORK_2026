import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { CreateBuilderResumeDto } from "./dto/create-builder-resume.dto";

const resumeSelect = {
  id: true, name: true, sourceType: true, status: true, isDefault: true,
  createdAt: true, updatedAt: true,
  versions: {
    orderBy: { versionNumber: "desc" as const },
    select: { id: true, versionNumber: true, templateCode: true, builderContent: true, createdAt: true },
  },
} as const;

@Injectable()
export class CandidateResumesService {
  constructor(private readonly db: PrismaService) {}

  async create(userId: string, dto: CreateBuilderResumeDto) {
    let bytes: number;
    try { bytes = Buffer.byteLength(JSON.stringify(dto.builderContent), "utf8"); }
    catch { throw new BadRequestException({ code: "RESUME_CONTENT_INVALID", message: "Builder content must be JSON." }); }
    if (bytes > 128 * 1024) {
      throw new BadRequestException({ code: "RESUME_CONTENT_TOO_LARGE", message: "Builder content exceeds 128 KB." });
    }
    return this.db.$transaction(async (tx) => {
      const profile = await tx.candidateProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!profile) throw new NotFoundException({ code: "CANDIDATE_PROFILE_NOT_FOUND", message: "Candidate profile was not found." });
      const resume = await tx.resume.create({ data: {
        candidateProfileId: profile.id, name: dto.name, sourceType: "BUILDER", status: "READY",
        versions: { create: { versionNumber: 1, builderContent: dto.builderContent as Prisma.InputJsonObject } },
      }, select: { id: true } });
      return tx.resume.findUniqueOrThrow({ where: { id: resume.id }, select: resumeSelect });
    });
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
