import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveWorkspaceAccess, isAdminRole } from "../../../app/guards/accessPolicy";
import { toApiFailure, kindFromStatus } from "../apiFailure";
import {
  normalizeJob,
  normalizePaged,
  normalizeMyCompany,
  normalizeCompanyProfile,
  formatSalary,
} from "../apiTypes";
import { validateJobForm, formToPayload, EMPTY_JOB_FORM } from "../jobForm";
import { availableTransitions, canEditJob } from "../companyWorkspaceApi";

describe("accessPolicy", () => {
  it("recognizes system admin roles accurately", () => {
    assert.equal(isAdminRole("ADMIN"), true);
    assert.equal(isAdminRole("SYSTEM_ADMIN"), true);
    assert.equal(isAdminRole("SUPER_ADMIN"), true);
    assert.equal(isAdminRole("PLATFORM_ADMIN"), true);
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
});
