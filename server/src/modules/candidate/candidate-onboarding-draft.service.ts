import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { SaveCandidateOnboardingDraftDto } from "./dto/onboarding-draft.dto";

const SECTIONS = ["personal", "education", "experience", "skills", "languages", "preferences", "resume", "privacy"] as const;
const ARRAY_SECTIONS = new Set<string>(["education", "experience", "skills", "languages"]);
const MAX_DRAFT_BYTES = 64 * 1024;

/** Private, versioned WIP, intentionally independent of published CandidateProfile. */
@Injectable()
export class CandidateOnboardingDraftService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const draft = await this.prisma.candidateOnboardingDraft.findUnique({ where: { userId } });
    return draft ? { data: draft.content, stepIndex: draft.stepIndex, version: draft.version, updatedAt: draft.updatedAt } : null;
  }

  async put(userId: string, dto: SaveCandidateOnboardingDraftDto) {
    this.validate(dto);
    // The userId is ALWAYS taken from AccessTokenGuard, never from the client payload.
    const content = dto.data as Prisma.InputJsonObject;
    if (dto.version === 0) {
      try {
        await this.prisma.candidateOnboardingDraft.create({
          data: { userId, content, stepIndex: dto.stepIndex, version: 1 },
        });
      } catch (error) {
        if (this.isUniqueCollision(error)) throw this.versionConflict();
        throw error;
      }
    } else {
      const updated = await this.prisma.candidateOnboardingDraft.updateMany({
        where: { userId, version: dto.version },
        data: { content, stepIndex: dto.stepIndex, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw this.versionConflict();
    }
    return this.get(userId);
  }

  private validate(dto: SaveCandidateOnboardingDraftDto) {
    if (!dto || !Number.isInteger(dto.version) || dto.version < 0 || !Number.isInteger(dto.stepIndex) || dto.stepIndex < 0 || dto.stepIndex > 6) {
      throw new BadRequestException({ code: "CANDIDATE_DRAFT_INVALID", message: "Invalid draft metadata." });
    }
    const obj = dto.data;
    if (!obj || Array.isArray(obj) || typeof obj !== "object" || Object.keys(obj).length !== SECTIONS.length ||
        Object.keys(obj).some((key) => !(SECTIONS as readonly string[]).includes(key)) ||
        SECTIONS.some((key) => !Object.hasOwn(obj, key) || (ARRAY_SECTIONS.has(key)
          ? !Array.isArray(obj[key])
          : obj[key] === null || typeof obj[key] !== "object" || Array.isArray(obj[key])))) {
      throw new BadRequestException({ code: "CANDIDATE_DRAFT_INVALID", message: "Invalid onboarding draft structure." });
    }
    let serialized = "";
    try { serialized = JSON.stringify(obj); } catch { /* invalid cyclic input */ }
    if (!serialized || Buffer.byteLength(serialized, "utf8") > MAX_DRAFT_BYTES) {
      throw new BadRequestException({ code: "CANDIDATE_DRAFT_TOO_LARGE", message: "Onboarding draft exceeds 64 KB." });
    }
  }

  private isUniqueCollision(error: unknown) {
    return !!error && typeof error === "object" && "code" in error && error.code === "P2002";
  }

  private versionConflict() {
    return new ConflictException({
      code: "CANDIDATE_DRAFT_VERSION_CONFLICT",
      message: "This draft changed elsewhere. Reload it before saving again.",
    });
  }
}
