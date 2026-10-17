import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Prisma } from "../src/generated/prisma/client";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { REQUIRED_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-permissions.decorator";
import { PermissionGuard } from "../src/modules/authorization/guards/permission.guard";
import { CandidateSavedJobsController } from "../src/modules/candidate/candidate-saved-jobs.controller";
import { CandidateSavedJobsService } from "../src/modules/candidate/candidate-saved-jobs.service";
import { SaveJobDto, SavedJobsPageQueryDto } from "../src/modules/candidate/dto/saved-job.dto";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const jobId = "33333333-3333-4333-8333-333333333333";
const profileId = "44444444-4444-4444-8444-444444444444";
const savedAt = new Date("2026-10-17T00:00:00.000Z");

function fakeDb() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: jobId }]),
    job: { findFirst: jest.fn().mockResolvedValue({ id: jobId, title: "Nurse" }) },
    savedJob: { create: jest.fn().mockResolvedValue({ id: "saved-id", savedAt }) },
  };
  const db = {
    candidateProfile: { findUnique: jest.fn().mockResolvedValue({ id: profileId }) },
    $transaction: jest.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    savedJob: {
      findMany: jest.fn().mockResolvedValue([{ id: "saved-id", jobId, savedAt }]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockResolvedValue({ id: "saved-id" }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    job: {
      findMany: jest.fn().mockResolvedValue([{ id: jobId, title: "Nurse" }]),
      findFirst: jest.fn().mockResolvedValue({ id: jobId }),
    },
  };
  return { tx, db, service: new CandidateSavedJobsService(db as never) };
}

describe("candidate saved jobs", () => {
  it("requires authentication and saved_job.manage OWN on every route", async () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CandidateSavedJobsController)).toEqual([AccessTokenGuard, PermissionGuard]);
    for (const method of ["save", "list", "status", "remove"] as const) {
      expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CandidateSavedJobsController.prototype[method]))
        .toEqual(["saved_job.manage"]);
    }
    const guard = new AccessTokenGuard({} as never, {} as never);
    await expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }) } as never))
      .rejects.toMatchObject({ status: 401, response: { code: "AUTH_ACCESS_TOKEN_REQUIRED" } });
    const controller = new CandidateSavedJobsController({ save: jest.fn() } as never);
    expect(() => controller.save({ userId } as never,
      { authorization: { permissions: { "saved_job.manage": { scope: "SYSTEM" } } } } as never, { jobId }))
      .toThrow(expect.objectContaining({ status: 403 }));
    expect(await validate(plainToInstance(SaveJobDto, { jobId: "123" }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(SavedJobsPageQueryDto, { page: 1, pageSize: 101 }))).not.toHaveLength(0);
  });

  it("saves a public job with the authenticated candidate ID and lists it with bounded pagination", async () => {
    const { tx, db, service } = fakeDb();
    await expect(service.save(userId, jobId)).resolves.toMatchObject({ jobId, isAvailable: true, job: { id: jobId } });
    expect(db.candidateProfile.findUnique).toHaveBeenCalledWith({ where: { userId }, select: { id: true } });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.job.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: jobId, status: "PUBLISHED", company: { status: "ACTIVE" } }),
    }));
    expect(tx.savedJob.create).toHaveBeenCalledWith({ data: { candidateProfileId: profileId, jobId }, select: { id: true, savedAt: true } });
    await expect(service.list(userId, { page: 2, pageSize: 10 })).resolves.toMatchObject({
      data: [{ jobId, isAvailable: true, job: { id: jobId } }],
      pagination: { page: 2, pageSize: 10, total: 1, totalPages: 1 },
    });
    expect(db.savedJob.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { candidateProfileId: profileId }, skip: 10, take: 10 }));
    expect(db.job.findMany).toHaveBeenCalledTimes(1); // One batch query, no per-bookmark lookup.
    await expect(service.status(userId, jobId)).resolves.toEqual({ jobId, saved: true, isAvailable: true });
    await expect(service.remove(userId, jobId)).resolves.toBeUndefined();
    expect(db.savedJob.deleteMany).toHaveBeenCalledWith({ where: { candidateProfileId: profileId, jobId } });
  });

  it("redacts a job after it stops being public while keeping its owned bookmark", async () => {
    const { db, service } = fakeDb();
    db.job.findMany.mockResolvedValue([]);
    db.job.findFirst.mockResolvedValue(null);
    await expect(service.list(userId, { page: 1, pageSize: 20 })).resolves.toMatchObject({
      data: [{ jobId, isAvailable: false, job: null }],
    });
    await expect(service.status(userId, jobId)).resolves.toEqual({ jobId, saved: true, isAvailable: false });
  });

  it("rejects unpublished jobs and duplicate bookmarks without writing another row", async () => {
    const { tx, service } = fakeDb();
    tx.job.findFirst.mockResolvedValueOnce(null);
    await expect(service.save(userId, jobId)).rejects.toMatchObject({ status: 404, response: { code: "JOB_NOT_FOUND" } });
    expect(tx.savedJob.create).not.toHaveBeenCalled();
    tx.savedJob.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("duplicate", {
      code: "P2002", clientVersion: "7.10.0",
    }));
    await expect(service.save(userId, jobId)).rejects.toMatchObject({ status: 409, response: { code: "SAVED_JOB_DUPLICATE" } });
  });

  it("scopes reads and deletion to the caller, including cross-user not-found semantics", async () => {
    const { db, service } = fakeDb();
    db.candidateProfile.findUnique.mockImplementation(async ({ where }: { where: { userId: string } }) =>
      ({ id: where.userId === otherUserId ? "other-profile" : profileId }));
    db.savedJob.findUnique.mockResolvedValueOnce(null);
    db.savedJob.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.status(otherUserId, jobId)).resolves.toEqual({ jobId, saved: false, isAvailable: true });
    expect(db.savedJob.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { candidateProfileId_jobId: { candidateProfileId: "other-profile", jobId } },
    }));
    await expect(service.remove(otherUserId, jobId)).rejects.toMatchObject({ status: 404, response: { code: "SAVED_JOB_NOT_FOUND" } });
    expect(db.savedJob.deleteMany).toHaveBeenCalledWith({ where: { candidateProfileId: "other-profile", jobId } });
  });

  it("requires an existing candidate profile before touching saved-job storage", async () => {
    const { db, tx, service } = fakeDb();
    db.candidateProfile.findUnique.mockResolvedValue(null);
    await expect(service.save(userId, jobId)).rejects.toMatchObject({ status: 404, response: { code: "CANDIDATE_PROFILE_NOT_FOUND" } });
    expect(tx.savedJob.create).not.toHaveBeenCalled();
    expect(db.savedJob.findMany).not.toHaveBeenCalled();
  });
});
