import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveWorkspaceAccess, isAdminRole } from "../../../app/guards/accessPolicy";
import { toApiFailure, kindFromStatus } from "../apiFailure";
import {
  normalizeJob,
  normalizePaged,
  normalizeMyCompany,
  normalizeCompanyProfile,
  normalizeCompanyApplication,
  formatSalary,
} from "../apiTypes";
import { validateJobForm, formToPayload, EMPTY_JOB_FORM } from "../jobForm";
import { availableTransitions, availableReviewTransitions, canEditJob } from "../companyWorkspaceApi";
import { normalizeAdminUser, normalizeAdminCompany, normalizeAdminJob, normalizeAdminAudit } from "../adminApi";
import { normalizeBackendResume } from "../../../features/resume/services/resumeService";

describe("accessPolicy", () => {
  it("recognizes system admin roles accurately", () => {
    assert.equal(isAdminRole("ADMIN"), true);
    assert.equal(isAdminRole("SYSTEM_ADMIN"), true);
    assert.equal(isAdminRole("SUPER_ADMIN"), true);
    assert.equal(isAdminRole("PLATFORM_ADMIN"), true);
    assert.equal(isAdminRole("SUPPORT_ADMIN"), true);
    assert.equal(isAdminRole("VERIFICATION_ADMIN"), true);
    assert.equal(isAdminRole("MODERATION_ADMIN"), true);
    assert.equal(isAdminRole("candidate"), false);
    assert.equal(isAdminRole("EMPLOYER"), false);
    assert.equal(isAdminRole(null), false);
    assert.equal(isAdminRole(undefined), false);
  });

  it("denies unauthenticated or invalid session", () => {
    assert.equal(resolveWorkspaceAccess("admin", "unauthenticated", null, null), "unauthenticated");
    assert.equal(resolveWorkspaceAccess("admin", "authenticated", null, "token"), "unauthenticated");
    assert.equal(resolveWorkspaceAccess("admin", "authenticated", { role: "ADMIN" }, null), "unauthenticated");
    assert.equal(resolveWorkspaceAccess("admin", "loading", null, null), "loading");
    assert.equal(resolveWorkspaceAccess("admin", "idle", null, null), "loading");
  });

  it("enforces admin role separation from candidate/employer", () => {
    assert.equal(resolveWorkspaceAccess("admin", "authenticated", { role: "CANDIDATE" }, "token"), "forbidden");
    assert.equal(resolveWorkspaceAccess("admin", "authenticated", { role: "EMPLOYER" }, "token"), "forbidden");
    assert.equal(resolveWorkspaceAccess("admin", "authenticated", { role: "ADMIN" }, "token"), "allowed");
    assert.equal(resolveWorkspaceAccess("admin", "authenticated", { role: "SYSTEM_ADMIN" }, "token"), "allowed");
  });

  it("allows authenticated user to enter employer workspace for membership verification", () => {
    assert.equal(resolveWorkspaceAccess("employer", "authenticated", { role: "EMPLOYER" }, "token"), "allowed");
    assert.equal(resolveWorkspaceAccess("employer", "authenticated", { role: "CANDIDATE" }, "token"), "allowed");
  });
});

describe("apiFailure", () => {
  it("classifies HTTP status codes accurately", () => {
    assert.equal(kindFromStatus(401), "unauthenticated");
    assert.equal(kindFromStatus(403), "forbidden");
    assert.equal(kindFromStatus(404), "not_found");
    assert.equal(kindFromStatus(409), "conflict");
    assert.equal(kindFromStatus(400), "validation");
    assert.equal(kindFromStatus(422), "validation");
    assert.equal(kindFromStatus(503), "unavailable");
    assert.equal(kindFromStatus(500), "unavailable");
    assert.equal(kindFromStatus(0), "unknown");
  });

  it("normalizes unknown errors to network or unknown", () => {
    const f = toApiFailure(new Error("custom"));
    assert.equal(f.kind, "unknown");
    assert.equal(f.status, 0);
  });
});

describe("apiTypes normalizers", () => {
  it("normalizes job DTO with nested relations and numeric conversions", () => {
    const raw = {
      id: "b21848b0-0000-0000-0000-000000000001",
      title: "Senior Frontend Engineer",
      company: { id: "comp-1", name: "Công ty Công nghệ Á Châu", slug: "achau-tech" },
      category: { id: "cat-1", name: "Công nghệ thông tin" },
      employmentType: "FULL_TIME",
      workplaceType: "HYBRID",
      salaryMin: "25000000",
      salaryMax: "40000000",
      currency: "VND",
      salaryPeriod: "MONTH",
      showSalary: true,
      salaryNegotiable: false,
      status: "PUBLISHED",
      version: 2,
    };
    const job = normalizeJob(raw);
    assert.equal(job.id, "b21848b0-0000-0000-0000-000000000001");
    assert.equal(job.companyName, "Công ty Công nghệ Á Châu");
    assert.equal(job.categoryName, "Công nghệ thông tin");
    assert.equal(job.salaryMin, 25000000);
    assert.equal(job.salaryMax, 40000000);
    assert.equal(job.version, 2);
    assert.equal(job.status, "PUBLISHED");
  });

  it("formats salary correctly", () => {
    assert.match(
      formatSalary({
        salaryMin: 20000000,
        salaryMax: 30000000,
        currency: "VND",
        salaryPeriod: "MONTH",
        salaryNegotiable: false,
        showSalary: true,
      }),
      /20\.000\.000.*30\.000\.000.*VND.*tháng/
    );
    assert.equal(
      formatSalary({
        salaryMin: null,
        salaryMax: null,
        currency: "VND",
        salaryPeriod: "MONTH",
        salaryNegotiable: true,
        showSalary: false,
      }),
      "Thương lượng"
    );
  });

  it("normalizes paged response safely", () => {
    const raw = {
      data: [{ id: "1", title: "Job 1" }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    const paged = normalizePaged(raw, (x: any) => ({ id: x.id, title: x.title }));
    assert.equal(paged.data.length, 1);
    assert.equal(paged.pagination.total, 1);
  });

  it("normalizes my companies and profile", () => {
    const rawMyCompany = {
      id: "comp-1",
      name: "Tập đoàn A",
      slug: "tap-doan-a",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
      memberRoleNames: ["OWNER", "RECRUITER"],
    };
    const c = normalizeMyCompany(rawMyCompany);
    assert.equal(c.name, "Tập đoàn A");
    assert.deepEqual(c.memberRoleNames, ["OWNER", "RECRUITER"]);

    const rawProfile = {
      data: {
        id: "comp-1",
        name: "Tập đoàn A",
        slug: "tap-doan-a",
        legalName: "Công ty Cổ phần Tập đoàn A",
        website: "https://a.example.com",
      },
    };
    const p = normalizeCompanyProfile(rawProfile);
    assert.equal(p.legalName, "Công ty Cổ phần Tập đoàn A");
  });
});

describe("jobForm validation", () => {
  const validForm = {
    categoryId: "550e8400-e29b-41d4-a716-446655440000",
    title: "Tuyển dụng Lập trình viên React",
    description: "Mô tả công việc chi tiết từ 20 ký tự trở lên để đảm bảo hợp lệ.",
    employmentType: "FULL_TIME" as const,
    workplaceType: "HYBRID" as const,
    experienceMinMonths: "12",
    experienceMaxMonths: "36",
    salaryMin: "15000000",
    salaryMax: "25000000",
    salaryPeriod: "MONTH" as const,
    salaryNegotiable: false,
    showSalary: true,
    applicationDeadline: "2030-01-01T00:00",
  };

  it("passes valid form", () => {
    const errors = validateJobForm(validForm, new Date("2026-10-16T00:00:00Z"));
    assert.deepEqual(errors, {});
  });

  it("catches required fields, range mismatches, and past deadline", () => {
    const errors = validateJobForm(
      {
        ...EMPTY_JOB_FORM,
        experienceMinMonths: "24",
        experienceMaxMonths: "12",
        salaryMin: "30000000",
        salaryMax: "20000000",
        applicationDeadline: "2020-01-01T00:00",
      },
      new Date("2026-10-16T00:00:00Z")
    );
    assert.ok(errors.title);
    assert.ok(errors.description);
    assert.ok(errors.categoryId);
    assert.ok(errors.employmentType);
    assert.ok(errors.workplaceType);
    assert.ok(errors.experienceMaxMonths);
    assert.ok(errors.salaryMax);
    assert.ok(errors.applicationDeadline);
  });

  it("maps form to clean payload", () => {
    const payload = formToPayload(validForm);
    assert.equal(payload.title, "Tuyển dụng Lập trình viên React");
    assert.equal(payload.salaryMin, 15000000);
    assert.equal(payload.salaryMax, 25000000);
    assert.equal(payload.currency, "VND");
    assert.ok(payload.applicationDeadline);
  });
});

describe("job lifecycle transitions", () => {
  it("determines valid status transitions per backend contract", () => {
    assert.deepEqual(availableTransitions("DRAFT"), ["publish"]);
    assert.deepEqual(availableTransitions("PUBLISHED"), ["pause", "close"]);
    assert.deepEqual(availableTransitions("PAUSED"), ["close"]);
    assert.deepEqual(availableTransitions("CLOSED"), []);
    assert.deepEqual(availableTransitions("ARCHIVED"), []);
  });

  it("only allows editing DRAFT jobs", () => {
    assert.equal(canEditJob("DRAFT"), true);
    assert.equal(canEditJob("PUBLISHED"), false);
    assert.equal(canEditJob("PAUSED"), false);
    assert.equal(canEditJob("CLOSED"), false);
  });

  it("determines valid application review transitions per backend contract", () => {
    assert.deepEqual(availableReviewTransitions("SUBMITTED"), ["REVIEWING", "REJECTED"]);
    assert.deepEqual(availableReviewTransitions("REVIEWING"), ["SHORTLISTED", "REJECTED"]);
    assert.deepEqual(availableReviewTransitions("SHORTLISTED"), ["INTERVIEW", "REJECTED"]);
    assert.deepEqual(availableReviewTransitions("INTERVIEW"), ["OFFERED", "REJECTED"]);
    assert.deepEqual(availableReviewTransitions("OFFERED"), []);
    assert.deepEqual(availableReviewTransitions("REJECTED"), []);
    assert.deepEqual(availableReviewTransitions("WITHDRAWN"), []);
  });
});

describe("applications and admin normalizers", () => {
  it("normalizes company application correctly", () => {
    const raw = {
      id: "app-uuid-1",
      companyId: "comp-uuid-1",
      jobId: "job-uuid-1",
      status: "SUBMITTED",
      version: 1,
      resumeId: "res-uuid-1",
      resumeVersionId: "rv-uuid-1",
      fullNameSnapshot: "Nguyễn Văn A",
      emailSnapshot: "nguyenvana@example.com",
      phoneSnapshot: "0901234567",
      coverLetter: "Kính gửi nhà tuyển dụng...",
      submittedAt: "2026-10-17T00:00:00Z",
      createdAt: "2026-10-17T00:00:00Z",
      updatedAt: "2026-10-17T00:00:00Z",
      job: { id: "job-uuid-1", title: "Frontend Engineer", status: "PUBLISHED" },
      resumeVersion: { id: "rv-uuid-1", versionNumber: 1, builderContent: { summary: "Hi" } },
    };
    const app = normalizeCompanyApplication(raw);
    assert.equal(app.id, "app-uuid-1");
    assert.equal(app.fullNameSnapshot, "Nguyễn Văn A");
    assert.equal(app.status, "SUBMITTED");
    assert.equal(app.version, 1);
    assert.equal(app.job?.title, "Frontend Engineer");
    assert.equal(app.resumeVersion?.versionNumber, 1);
  });

  it("normalizes admin user, company, job, and audit records", () => {
    const user = normalizeAdminUser({
      id: "u-1",
      email: "admin@findwork.vn",
      status: "ACTIVE",
      emailVerifiedAt: "2026-10-01T00:00:00Z",
    });
    assert.equal(user.id, "u-1");
    assert.equal(user.email, "admin@findwork.vn");
    assert.equal(user.status, "ACTIVE");

    const comp = normalizeAdminCompany({
      id: "c-1",
      name: "Tập đoàn X",
      slug: "tap-doan-x",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    });
    assert.equal(comp.name, "Tập đoàn X");
    assert.equal(comp.verificationStatus, "VERIFIED");

    const job = normalizeAdminJob({
      id: "j-1",
      companyId: "c-1",
      categoryId: "cat-1",
      title: "Backend Go Engineer",
      status: "PUBLISHED",
      version: 3,
    });
    assert.equal(job.title, "Backend Go Engineer");
    assert.equal(job.version, 3);

    const audit = normalizeAdminAudit({
      id: "aud-1",
      action: "admin.company.verify",
      targetType: "Company",
      targetId: "c-1",
      actorUserId: "u-1",
    });
    assert.equal(audit.action, "admin.company.verify");
    assert.equal(audit.targetType, "Company");
  });

  it("normalizes backend resume DTO with versions, templateCode, and builderSettings", () => {
    const rawDto = {
      id: "res-uuid-10",
      name: "CV Kỹ sư Phần mềm",
      sourceType: "BUILDER" as const,
      status: "READY" as const,
      isDefault: true,
      createdAt: "2026-10-17T08:00:00Z",
      updatedAt: "2026-10-17T09:00:00Z",
      versions: [
        {
          id: "rv-uuid-2",
          versionNumber: 2,
          templateCode: "modern",
          builderContent: { fullName: "Nguyễn Văn B", email: "b@test.vn" },
          builderSettings: { accentColor: "blue", fontFamily: "sans" },
          createdAt: "2026-10-17T09:00:00Z",
        },
      ],
    };

    const resume = normalizeBackendResume(rawDto);
    assert.equal(resume.id, "res-uuid-10");
    assert.equal(resume.name, "CV Kỹ sư Phần mềm");
    assert.equal(resume.sourceType, "builder");
    assert.equal(resume.status, "ready");
    assert.equal(resume.isDefault, true);
    assert.equal(resume.currentVersion.versionNumber, 2);
    assert.equal(resume.currentVersion.templateCode, "modern");
    assert.equal(resume.currentVersion.builderSettings?.accentColor, "blue");
    assert.equal(resume.currentVersion.builderContent?.fullName, "Nguyễn Văn B");
  });
});
