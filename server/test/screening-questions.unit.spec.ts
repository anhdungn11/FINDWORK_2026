import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CompanyJobsController } from "../src/modules/jobs/jobs.controller";
import { JobsService } from "../src/modules/jobs/jobs.service";
import { ReplaceScreeningQuestionsDto } from "../src/modules/jobs/dto/screening-question.dto";
import { normalizeScreeningQuestions } from "../src/modules/jobs/screening-question.rules";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { CompanyPermissionGuard } from "../src/modules/authorization/guards/company-permission.guard";
import { REQUIRED_COMPANY_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-company-permissions.decorator";
import { ApplicationsService } from "../src/modules/applications/applications.service";
import { SubmitApplicationDto } from "../src/modules/applications/dto/application.dto";
import { validateScreeningAnswers } from "../src/modules/applications/screening-answers";

const companyId = "11111111-1111-4111-8111-111111111111";
const otherCompanyId = "22222222-2222-4222-8222-222222222222";
const jobId = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";
const resumeId = "55555555-5555-4555-8555-555555555555";
const versionId = "66666666-6666-4666-8666-666666666666";
const textId = "77777777-7777-4777-8777-777777777777";
const selectId = "88888888-8888-4888-8888-888888888888";
const multiId = "99999999-9999-4999-8999-999999999999";
const yesId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const questions = [
  { id: textId, type: "TEXT" as const, label: "Years of experience?", isRequired: true, displayOrder: 0, options: null },
  { id: selectId, type: "SELECT" as const, label: "Work model?", isRequired: true, displayOrder: 1, options: ["Remote", "Office"] },
  { id: multiId, type: "MULTI_SELECT" as const, label: "Skills?", isRequired: false, displayOrder: 2, options: ["Node", "SQL"] },
  { id: yesId, type: "YES_NO" as const, label: "Can start soon?", isRequired: true, displayOrder: 3, options: null },
];

const answers = [
  { questionId: textId, answer: "Five years" },
  { questionId: selectId, answer: "Remote" },
  { questionId: multiId, answer: ["Node", "SQL"] },
  { questionId: yesId, answer: false },
];

function expectBadRequest(run: () => unknown, code: string): void {
  try { run(); } catch (error) {
    expect(error).toMatchObject({ status: 400, response: { code } });
    return;
  }
  throw new Error(`Expected ${code}`);
}

function jobDb() {
  const tx = {
    companyMember: { findFirst: jest.fn().mockResolvedValue({ id: "member" }) },
    job: { findFirst: jest.fn().mockResolvedValue({ status: "DRAFT", version: 1 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    screeningQuestion: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), createMany: jest.fn().mockResolvedValue({ count: 2 }), findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const db = { $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    job: { findFirst: jest.fn().mockResolvedValue({ id: jobId, version: 1 }) },
    screeningQuestion: { findMany: jest.fn().mockResolvedValue([]) } };
  return { tx, db, service: new JobsService(db as never) };
}

function applicationDb() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: jobId }]),
    job: { findFirst: jest.fn().mockResolvedValue({ id: jobId, companyId, title: "Nurse", categoryId: "category", publishedAt: new Date() }) },
    candidateProfile: { findUnique: jest.fn().mockResolvedValue({ id: "profile", fullName: "Candidate", phone: null, user: { email: "candidate@example.invalid" } }) },
    resumeVersion: { findFirst: jest.fn().mockResolvedValue({ id: versionId }) },
    screeningQuestion: { findMany: jest.fn().mockResolvedValue(questions) },
    application: { create: jest.fn().mockResolvedValue({ id: "application" }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "application" }) },
    applicationAnswer: { createMany: jest.fn().mockResolvedValue({ count: 4 }) },
  };
  const db = { $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    application: { findFirst: jest.fn().mockResolvedValue({ id: "application", answers: [] }) } };
  return { tx, db, service: new ApplicationsService(db as never) };
}

describe("recruitment screening questions", () => {
  it("keeps company question editing behind company-scoped guards and DTO validation", async () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyJobsController)).toEqual([AccessTokenGuard, CompanyPermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY, CompanyJobsController.prototype.replaceQuestions))
      .toEqual(["company.update"]);
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY, CompanyJobsController.prototype.questions))
      .toEqual(["company.view"]);
    const invalid = plainToInstance(ReplaceScreeningQuestionsDto, {
      version: 1, questions: [{ type: "SELECT", label: "x", isRequired: "yes", displayOrder: -1, options: ["one"] }],
    });
    expect(await validate(invalid)).not.toHaveLength(0);
  });

  it("normalizes choice options and rejects duplicate order or invalid configurations", () => {
    expect(normalizeScreeningQuestions([
      { type: "SELECT", label: "Work model?", isRequired: true, displayOrder: 1, options: [" Remote ", "Office"] },
      { type: "TEXT", label: "Why apply?", isRequired: false, displayOrder: 0 },
    ])[1]?.options).toEqual(["Remote", "Office"]);
    expect(() => normalizeScreeningQuestions([
      { type: "TEXT", label: "Question A", isRequired: true, displayOrder: 0 },
      { type: "TEXT", label: "Question B", isRequired: true, displayOrder: 0 },
    ])).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => normalizeScreeningQuestions([
      { type: "MULTI_SELECT", label: "Skills?", isRequired: true, displayOrder: 0, options: ["Node", "node"] },
    ])).toThrow(expect.objectContaining({ status: 400 }));
  });

  it("uses owned-job CAS, preserves older question rows, and audits only metadata", async () => {
    const { tx, service } = jobDb();
    const dto: ReplaceScreeningQuestionsDto = { version: 1, questions: [
      { type: "SELECT", label: "Work model?", isRequired: true, displayOrder: 0, options: ["Remote", "Office"] },
    ] };
    await service.replaceScreeningQuestions(companyId, jobId, userId, dto);
    expect(tx.job.findFirst).toHaveBeenCalledWith({ where: { id: jobId, companyId }, select: { status: true, version: true } });
    expect(tx.job.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: jobId, companyId, status: "DRAFT", version: 1 }, data: { version: { increment: 1 } },
    }));
    expect(tx.screeningQuestion.updateMany).toHaveBeenCalledWith({ where: { jobId, isActive: true }, data: { isActive: false } });
    expect(tx.screeningQuestion.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ jobId, type: "SELECT", options: ["Remote", "Office"] })],
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "job.screening_questions.replace", metadata: { fromVersion: 1, count: 1 } }),
    }));
    tx.job.findFirst.mockResolvedValueOnce(null);
    await expect(service.replaceScreeningQuestions(otherCompanyId, jobId, userId, dto)).rejects.toMatchObject({ status: 404 });
    tx.job.findFirst.mockResolvedValueOnce({ status: "PUBLISHED", version: 1 });
    await expect(service.replaceScreeningQuestions(companyId, jobId, userId, dto)).rejects.toMatchObject({ status: 409 });
    tx.job.findFirst.mockResolvedValueOnce({ status: "PAUSED", version: 2 });
    await expect(service.replaceScreeningQuestions(companyId, jobId, userId, dto)).rejects.toMatchObject({ status: 409 });
  });

  it("exposes only active applicant questions on public job detail", async () => {
    const { db, service } = jobDb();
    await service.getPublic(jobId);
    expect(db.job.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: jobId, status: "PUBLISHED", company: { status: "ACTIVE" } }),
      select: expect.objectContaining({ screeningQuestions: expect.objectContaining({ where: { isActive: true } }) }),
    }));
  });

  it("accepts every supported answer type, including false, and rejects required/foreign/invalid answers", () => {
    const validated = validateScreeningAnswers(questions, answers);
    expect(validated).toHaveLength(4);
    expect(validated[3]).toMatchObject({ answerValue: false, questionSnapshot: { label: "Can start soon?", type: "YES_NO" } });
    expect(validateScreeningAnswers([], [])).toEqual([]);
    expectBadRequest(() => validateScreeningAnswers(questions, answers.slice(1)), "SCREENING_REQUIRED_ANSWER_MISSING");
    expectBadRequest(() => validateScreeningAnswers(questions, [...answers, { questionId: textId, answer: "again" }]), "SCREENING_ANSWER_DUPLICATE");
    expectBadRequest(() => validateScreeningAnswers(questions, [...answers, { questionId: companyId, answer: "foreign" }]), "SCREENING_QUESTION_INVALID");
    expectBadRequest(() => validateScreeningAnswers(questions, answers.map((a) => a.questionId === multiId ? { ...a, answer: ["Unknown"] } : a)), "SCREENING_OPTION_INVALID");
    expectBadRequest(() => validateScreeningAnswers(questions, answers.map((a) => a.questionId === yesId ? { ...a, answer: "yes" } : a)), "SCREENING_ANSWER_INVALID");
  });

  it("persists answer snapshots inside the existing application transaction and selects them for details", async () => {
    const { tx, db, service } = applicationDb();
    await service.submit(userId, jobId, { resumeId, resumeVersionId: versionId, answers });
    expect(tx.applicationAnswer.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({
        jobId, applicationId: "application", screeningQuestionId: multiId,
        answerValue: ["Node", "SQL"], questionSnapshot: expect.objectContaining({ label: "Skills?", type: "MULTI_SELECT" }),
      })]),
    }));
    await service.getCompany(companyId, jobId, "application");
    expect(db.application.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "application", companyId, jobId },
      select: expect.objectContaining({ answers: expect.objectContaining({ select: expect.objectContaining({ questionSnapshot: true, answerValue: true }) }) }),
    }));
    tx.screeningQuestion.findMany.mockResolvedValueOnce([{ ...questions[0], isRequired: true }]);
    await expect(service.submit(userId, jobId, { resumeId, resumeVersionId: versionId }))
      .rejects.toMatchObject({ status: 400, response: { code: "SCREENING_REQUIRED_ANSWER_MISSING" } });
    expect(tx.application.create).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed nested answer DTOs before the service", async () => {
    const malformed = plainToInstance(SubmitApplicationDto, {
      resumeId, resumeVersionId: versionId,
      answers: [{ questionId: textId, answer: { arbitrary: "payload" } }],
    });
    expect(await validate(malformed)).not.toHaveLength(0);
  });
});
