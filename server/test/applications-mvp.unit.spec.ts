import { GUARDS_METADATA } from "@nestjs/common/constants";
import { CandidateApplicationsController, CompanyApplicationsController } from "../src/modules/applications/applications.controller";
import { ApplicationsService } from "../src/modules/applications/applications.service";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { PermissionGuard } from "../src/modules/authorization/guards/permission.guard";
import { CompanyPermissionGuard } from "../src/modules/authorization/guards/company-permission.guard";
import { REQUIRED_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-permissions.decorator";
import { REQUIRED_COMPANY_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-company-permissions.decorator";
import { CandidateResumesService } from "../src/modules/candidate/candidate-resumes.service";

const companyId = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";
const applicationId = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";
const resumeId = "55555555-5555-4555-8555-555555555555";
const versionId = "66666666-6666-4666-8666-666666666666";

function fakeDb() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: jobId }]),
    job: { findFirst: jest.fn().mockResolvedValue({ id: jobId, companyId, title: "Nurse", categoryId: "category", publishedAt: new Date() }) },
    candidateProfile: { findUnique: jest.fn().mockResolvedValue({ id: "profile", fullName: "Candidate", phone: null, user: { email: "candidate@example.com" } }) },
    resumeVersion: { findFirst: jest.fn().mockResolvedValue({ id: versionId }) },
    application: {
      create: jest.fn().mockResolvedValue({ id: applicationId }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: applicationId }),
      findFirst: jest.fn().mockResolvedValue({ status: "SUBMITTED", version: 1 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    companyMember: { findFirst: jest.fn().mockResolvedValue({ id: "member" }) },
    applicationStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    resume: { create: jest.fn().mockResolvedValue({ id: resumeId }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: resumeId }) },
  };
  return { tx, db: {
    $transaction: jest.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    application: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
    job: { findFirst: jest.fn().mockResolvedValue({ id: jobId }) },
    resume: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
  } };
}

describe("applications MVP security", () => {
  it("requires system own-scope and company-scoped permission guards", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CandidateApplicationsController)).toEqual([AccessTokenGuard, PermissionGuard]);
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyApplicationsController)).toEqual([AccessTokenGuard, CompanyPermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CandidateApplicationsController.prototype.submit)).toEqual(["application.create"]);
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY, CompanyApplicationsController.prototype.review)).toEqual(["application.review"]);
  });

  it("submits only to an available job with an owned ready builder version and status history", async () => {
    const { tx, db } = fakeDb();
    await new ApplicationsService(db as never).submit(userId, jobId, { resumeId, resumeVersionId: versionId });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.job.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: jobId, status: "PUBLISHED", company: { status: "ACTIVE" } }) }));
    expect(tx.resumeVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: versionId, resumeId, resume: expect.objectContaining({ candidateProfileId: "profile", status: "READY", sourceType: "BUILDER" }) }) }));
    expect(tx.application.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ companyId, jobId, status: "SUBMITTED", candidateProfileId: "profile", statusHistory: { create: { toStatus: "SUBMITTED", changedByUserId: userId } } }) }));
  });

  it("rejects unavailable resumes before creating an application", async () => {
    const { tx, db } = fakeDb();
    tx.resumeVersion.findFirst.mockResolvedValue(null);
    await expect(new ApplicationsService(db as never).submit(userId, jobId, { resumeId, resumeVersionId: versionId })).rejects.toMatchObject({ status: 400 });
    expect(tx.application.create).not.toHaveBeenCalled();
  });

  it("scopes candidate and recruiter detail reads by account and company/job", async () => {
    const { db } = fakeDb();
    const service = new ApplicationsService(db as never);
    await expect(service.getCandidate(userId, applicationId)).rejects.toMatchObject({ status: 404 });
    expect(db.application.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: applicationId, candidateProfile: { userId } } }));
    await expect(service.getCompany(companyId, jobId, applicationId)).rejects.toMatchObject({ status: 404 });
    expect(db.application.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: applicationId, companyId, jobId } }));
  });

  it("rejects inactive membership and uses company/job scoped compare-and-swap with audit", async () => {
    const { tx, db } = fakeDb();
    const service = new ApplicationsService(db as never);
    tx.companyMember.findFirst.mockResolvedValueOnce(null);
    await expect(service.review(companyId, jobId, applicationId, userId, { version: 1, status: "REVIEWING" })).rejects.toMatchObject({ status: 403 });
    expect(tx.application.updateMany).not.toHaveBeenCalled();
    await service.review(companyId, jobId, applicationId, userId, { version: 1, status: "REVIEWING" });
    expect(tx.application.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: applicationId, companyId, jobId, status: "SUBMITTED", version: 1 } }));
    expect(tx.applicationStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fromStatus: "SUBMITTED", toStatus: "REVIEWING", changedByUserId: userId }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "application.review", companyId }) }));
  });

  it("persists builder content under the authenticated candidate profile", async () => {
    const { tx, db } = fakeDb();
    await new CandidateResumesService(db as never).create(userId, { name: "Clinical CV", builderContent: { summary: "Nurse" } });
    expect(tx.candidateProfile.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId } }));
    expect(tx.resume.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ candidateProfileId: "profile", sourceType: "BUILDER", status: "READY", versions: { create: { versionNumber: 1, builderContent: { summary: "Nurse" } } } }) }));
  });
});
