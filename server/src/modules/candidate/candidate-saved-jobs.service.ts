import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { jobSelect } from "../jobs/job-select";
import { publicJobVisibility } from "../jobs/public-job-visibility";
import type { SavedJobsPageQueryDto } from "./dto/saved-job.dto";

function visibleJobWhere(now: Date): Prisma.JobWhereInput {
  return { ...publicJobVisibility(now), company: { status: "ACTIVE" } };
}

function profileMissing(): NotFoundException {
  return new NotFoundException({ code: "CANDIDATE_PROFILE_NOT_FOUND", message: "Candidate profile was not found." });
}

@Injectable()
export class CandidateSavedJobsService {
  constructor(private readonly db: PrismaService) {}

  private async profileId(userId: string): Promise<string> {
    const profile = await this.db.candidateProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) throw profileMissing();
    return profile.id;
  }

  async save(userId: string, jobId: string) {
    const candidateProfileId = await this.profileId(userId);
    try {
      return await this.db.$transaction(async (tx) => {
        // Serialize with job pause/close/delete before accepting a new bookmark.
        await tx.$queryRaw`SELECT "id" FROM "Job" WHERE "id" = ${jobId}::uuid FOR SHARE`;
        const job = await tx.job.findFirst({
          where: { id: jobId, ...visibleJobWhere(new Date()) }, select: jobSelect,
        });
        if (!job) throw new NotFoundException({ code: "JOB_NOT_FOUND", message: "Available job was not found." });
        const saved = await tx.savedJob.create({ data: { candidateProfileId, jobId }, select: { id: true, savedAt: true } });
        return { id: saved.id, jobId, savedAt: saved.savedAt, isAvailable: true, job };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException({ code: "SAVED_JOB_DUPLICATE", message: "This job is already saved." });
      }
      throw error;
    }
  }

  async list(userId: string, query: SavedJobsPageQueryDto) {
    const candidateProfileId = await this.profileId(userId);
    const where: Prisma.SavedJobWhereInput = { candidateProfileId };
    const [saved, total] = await Promise.all([
      this.db.savedJob.findMany({ where, select: { id: true, jobId: true, savedAt: true },
        orderBy: [{ savedAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.savedJob.count({ where }),
    ]);
    const jobs = saved.length ? await this.db.job.findMany({
      where: { id: { in: saved.map((row) => row.jobId) }, ...visibleJobWhere(new Date()) },
      select: jobSelect,
    }) : [];
    const publicJobs = new Map(jobs.map((job) => [job.id, job]));
    return {
      data: saved.map((row) => ({ ...row, isAvailable: publicJobs.has(row.jobId), job: publicJobs.get(row.jobId) ?? null })),
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    };
  }

  async status(userId: string, jobId: string) {
    const candidateProfileId = await this.profileId(userId);
    const [saved, job] = await Promise.all([
      this.db.savedJob.findUnique({ where: { candidateProfileId_jobId: { candidateProfileId, jobId } }, select: { id: true } }),
      this.db.job.findFirst({ where: { id: jobId, ...visibleJobWhere(new Date()) }, select: { id: true } }),
    ]);
    return { jobId, saved: !!saved, isAvailable: !!job };
  }

  async remove(userId: string, jobId: string): Promise<void> {
    const candidateProfileId = await this.profileId(userId);
    const result = await this.db.savedJob.deleteMany({ where: { candidateProfileId, jobId } });
    if (result.count !== 1) {
      throw new NotFoundException({ code: "SAVED_JOB_NOT_FOUND", message: "Saved job was not found." });
    }
  }
}
