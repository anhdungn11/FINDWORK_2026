import { GUARDS_METADATA } from "@nestjs/common/constants";
import { CandidateApplicationsController, CompanyApplicationsController } from "../src/modules/applications/applications.controller";
import { ApplicationsService } from "../src/modules/applications/applications.service";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { AccountTypeGuard } from "../src/modules/auth/guards/account-type.guard";
import { PermissionGuard } from "../src/modules/authorization/guards/permission.guard";
import { CompanyPermissionGuard } from "../src/modules/authorization/guards/company-permission.guard";
import { REQUIRED_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-permissions.decorator";
import { REQUIRED_COMPANY_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-company-permissions.decorator";
import { CandidateResumesService } from "../src/modules/candidate/candidate-resumes.service";
import { Prisma } from "../src/generated/prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SubmitApplicationDto } from "../src/modules/applications/dto/application.dto";

const companyId = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";
const applicationId = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";
const resumeId = "55555555-5555-4555-8555-555555555555";
const versionId = "66666666-6666-4666-8666-666666666666";
const details = {
  contact: { fullName: "Application Name", email: "apply@example.com", phone: "+84901234567" },
  currentLocation: "Ho Chi Minh City", availability: "within-2-weeks" as const,
  preferredContactMethod: "phone" as const,
};

function fakeDb() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: jobId }]),
    job: { findFirst: jest.fn().mockResolvedValue({ id: jobId, companyId, title: "Nurse", categoryId: "category", publishedAt: new Date() }) },
    candidateProfile: { findUnique: jest.fn().mockResolvedValue({ id: "profile", fullName: "Candidate", phone: null, user: { email: "candidate@example.com" } }) },
    resumeVersion: { findFirst: jest.fn().mockResolvedValue({ id: versionId }) },
    screeningQuestion: { findMany: jest.fn().mockResolvedValue([]) },
    applicationAnswer: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    application: {
      create: jest.fn().mockResolvedValue({ id: applicationId }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: applicationId }),
      findFirst: jest.fn().mockResolvedValue({ status: "SUBMITTED", version: 1 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    companyMember: { findFirst: jest.fn().mockResolvedValue({ id: "member" }) },
    applicationStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    applicationAssignment: {
      findFirst: jest.fn().mockResolvedValue(null), updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({ id: "assignment", companyMemberId: "target" }),
    },
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
  it("validates application-specific contact and availability before any database write", async () => {
    const valid = plainToInstance(SubmitApplicationDto, { resumeId, resumeVersionId: versionId, details });
    expect(await validate(valid)).toEqual([]);
    for (const badDetails of [
      undefined,
      { ...details, contact: { ...details.contact, fullName: " " } },
      { ...details, contact: { ...details.contact, email: "invalid" } },
      { ...details, contact: { ...details.contact, phone: "123" } },
      { ...details, availability: "tomorrow" },
      { ...details, preferredContactMethod: "sms" },
    ]) {
      const input = plainToInstance(SubmitApplicationDto, { resumeId, resumeVersionId: versionId, details: badDetails });
      expect(await validate(input)).not.toEqual([]);
    }
  });
  it("requires system own-scope and company-scoped permission guards", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CandidateApplicationsController)).toEqual([AccessTokenGuard, AccountTypeGuard, PermissionGuard]);
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyApplicationsController)).toEqual([AccessTokenGuard, CompanyPermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CandidateApplicationsController.prototype.submit)).toEqual(["application.create"]);
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY, CompanyApplicationsController.prototype.review)).toEqual(["application.review"]);
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY, CompanyApplicationsController.prototype.assign)).toEqual(["application.review"]);
  });

  it("submits only to an available job with an owned ready builder version and status history", async () => {
    const { tx, db } = fakeDb();
    await new ApplicationsService(db as never).submit(userId, jobId, { resumeId, resumeVersionId: versionId, details });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.job.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: jobId, status: "PUBLISHED", company: { status: "ACTIVE" } }) }));
    expect(tx.resumeVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: versionId, resumeId, resume: expect.objectContaining({ candidateProfileId: "profile", status: "READY", sourceType: "BUILDER" }) }) }));
    expect(tx.application.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      companyId, jobId, status: "SUBMITTED", candidateProfileId: "profile",
      fullNameSnapshot: "Application Name", emailSnapshot: "apply@example.com", phoneSnapshot: "+84901234567",
      currentLocationSnapshot: "Ho Chi Minh City", availability: "WITHIN_2_WEEKS", preferredContactMethod: "PHONE",
      statusHistory: { create: { toStatus: "SUBMITTED", changedByUserId: userId } },
    }) }));
    expect(tx.applicationAnswer.createMany).not.toHaveBeenCalled();
  });

  it("rejects unavailable resumes before creating an application", async () => {
    const { tx, db } = fakeDb();
    tx.resumeVersion.findFirst.mockResolvedValue(null);
    await expect(new ApplicationsService(db as never).submit(userId, jobId, { resumeId, resumeVersionId: versionId, details })).rejects.toMatchObject({ status: 400 });
    expect(tx.application.create).not.toHaveBeenCalled();
  });

  it("maps the database candidate/job unique constraint to a stable duplicate conflict", async () => {
    const { tx, db } = fakeDb();
    tx.application.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("duplicate", {
      code: "P2002", clientVersion: "7.10.0",
    }));
    await expect(new ApplicationsService(db as never).submit(userId, jobId, { resumeId, resumeVersionId: versionId, details }))
      .rejects.toMatchObject({ status: 409, response: { code: "APPLICATION_DUPLICATE" } });
  });

  it("scopes candidate and recruiter detail reads by account and company/job", async () => {
    const { db } = fakeDb();
    const service = new ApplicationsService(db as never);
    await expect(service.getCandidate(userId, applicationId)).rejects.toMatchObject({ status: 404 });
    expect(db.application.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: applicationId, candidateProfile: { userId } } }));
    const candidateSelect = db.application.findFirst.mock.calls[0][0].select;
    expect(candidateSelect.statusHistory.select).not.toHaveProperty("note");
    expect(candidateSelect.statusHistory.select).not.toHaveProperty("changedByUserId");
    await expect(service.getCompany(companyId, jobId, applicationId)).rejects.toMatchObject({ status: 404 });
    expect(db.application.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: applicationId, companyId, jobId } }));
    expect(db.application.findFirst.mock.calls[1][0].select.statusHistory.select.note).toBe(true);
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

  it("supports quick offer after HR review and keeps the review note internal", async () => {
    const { tx, db } = fakeDb();
    tx.application.findFirst.mockResolvedValue({ status: "REVIEWING", version: 2 });
    const service = new ApplicationsService(db as never);
    await service.review(companyId, jobId, applicationId, userId,
      { version: 2, status: "OFFERED", note: "Approved by HR" });
    expect(tx.application.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: applicationId, companyId, jobId, status: "REVIEWING", version: 2 },
      data: { status: "OFFERED", version: { increment: 1 } },
    }));
    expect(tx.applicationStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ fromStatus: "REVIEWING", toStatus: "OFFERED", note: "Approved by HR" }),
    }));
    await expect(service.review(companyId, jobId, applicationId, userId,
      { version: 2, status: "INTERVIEW" })).rejects.toMatchObject({
      status: 409, response: { code: "APPLICATION_STATE_CONFLICT" },
    });
  });

  it("assigns only an active member in the application tenant and audits reassignment", async () => {
    const { tx, db } = fakeDb();
    const service = new ApplicationsService(db as never);
    tx.companyMember.findFirst.mockResolvedValueOnce({ id: "actor" }).mockResolvedValueOnce(null);
    await expect(service.assign(companyId, jobId, applicationId, userId,
      { assignmentType: "REVIEWER", companyMemberId: resumeId })).rejects.toMatchObject({ status: 404 });
    expect(tx.applicationAssignment.create).not.toHaveBeenCalled();

    tx.companyMember.findFirst.mockResolvedValueOnce({ id: "actor" }).mockResolvedValueOnce({ id: "target" });
    tx.applicationAssignment.findFirst.mockResolvedValueOnce({ id: "previous", companyMemberId: "old" });
    await service.assign(companyId, jobId, applicationId, userId,
      { assignmentType: "REVIEWER", companyMemberId: resumeId });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.companyMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: resumeId, companyId, status: "ACTIVE", removedAt: null, user: { status: "ACTIVE" } },
    }));
    expect(tx.applicationAssignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { applicationId, companyId, assignmentType: "REVIEWER", removedAt: null },
    }));
    expect(tx.applicationAssignment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { applicationId, companyId, companyMemberId: "target", assignmentType: "REVIEWER", assignedByMemberId: "actor" },
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "application.assign", companyId, targetId: applicationId }),
    }));
  });

  it("persists builder content under the authenticated candidate profile", async () => {
    const { tx, db } = fakeDb();
    await new CandidateResumesService(db as never).create(userId, {
      name: "Clinical CV", builderContent: { summary: "Nurse" },
      templateCode: "classic", builderSettings: { accent: "blue" },
    });
    expect(tx.candidateProfile.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId } }));
    expect(tx.resume.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      candidateProfileId: "profile", sourceType: "BUILDER", status: "READY",
      versions: { create: {
        versionNumber: 1, builderContent: { summary: "Nurse" },
        templateCode: "classic", builderSettings: { accent: "blue" },
      } },
    }) }));
  });
});
