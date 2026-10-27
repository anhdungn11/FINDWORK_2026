import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeAdminUser,
  normalizeAdminCompany,
  normalizeAdminCompanyDetail,
  normalizeAdminCompanyLegal,
  normalizeAdminJob,
  normalizeAdminJobDetail,
  normalizeAdminAudit,
  adminApi,
} from "../adminApi";

describe("FINDWORK CP12B Admin & Employer Management Regression Tests", () => {
  describe("Admin User DTO Normalization", () => {
    it("normalizes user DTO correctly with active and verified status", () => {
      const raw = {
        id: "usr-12345",
        email: "employer@example.com",
        status: "ACTIVE",
        emailVerifiedAt: "2026-10-27T10:00:00.000Z",
        createdAt: "2026-10-20T08:00:00.000Z",
        updatedAt: "2026-10-27T10:00:00.000Z",
      };

      const user = normalizeAdminUser(raw);
      assert.equal(user.id, "usr-12345");
      assert.equal(user.email, "employer@example.com");
      assert.equal(user.status, "ACTIVE");
      assert.equal(user.emailVerifiedAt, "2026-10-27T10:00:00.000Z");
    });

    it("handles null or missing fields in user DTO safely", () => {
      const user = normalizeAdminUser(null);
      assert.equal(user.id, "");
      assert.equal(user.email, "");
      assert.equal(user.status, "ACTIVE");
      assert.equal(user.emailVerifiedAt, null);
    });
  });

  describe("Admin Company & Detail DTO Normalization", () => {
    it("normalizes company DTO with verification status and rejection reason", () => {
      const raw = {
        id: "comp-999",
        name: "Công ty Cổ phần Vận tải Á Châu",
        slug: "van-tai-a-chau",
        status: "ACTIVE",
        verificationStatus: "REJECTED",
        verifiedAt: null,
        verificationRejectionReason: "Mã số thuế không khớp với cơ sở dữ liệu Tổng cục thuế.",
        createdAt: "2026-10-15T00:00:00.000Z",
        updatedAt: "2026-10-26T12:00:00.000Z",
      };

      const company = normalizeAdminCompany(raw);
      assert.equal(company.id, "comp-999");
      assert.equal(company.name, "Công ty Cổ phần Vận tải Á Châu");
      assert.equal(company.verificationStatus, "REJECTED");
      assert.equal(company.verificationRejectionReason, "Mã số thuế không khớp với cơ sở dữ liệu Tổng cục thuế.");
    });

    it("normalizes full company detail including locations, tax code, and counts", () => {
      const raw = {
        id: "comp-full-1",
        name: "Tập đoàn FPT",
        slug: "fpt-corp",
        status: "ACTIVE",
        verificationStatus: "VERIFIED",
        verifiedAt: "2026-10-25T09:00:00.000Z",
        legalName: "Công ty Cổ phần FPT",
        taxCode: "0101248141",
        industryId: "ind-it",
        website: "https://fpt.com.vn",
        employeeSizeRange: "1000+",
        foundedYear: 1988,
        locations: [
          {
            id: "loc-hq",
            addressLine: "Tòa nhà FPT, Phố Duy Tân, Cầu Giấy, Hà Nội",
            isHeadquarters: true,
          },
        ],
        _count: {
          members: 45,
          jobs: 12,
          applications: 380,
        },
      };

      const detail = normalizeAdminCompanyDetail(raw);
      assert.equal(detail.id, "comp-full-1");
      assert.equal(detail.legalName, "Công ty Cổ phần FPT");
      assert.equal(detail.taxCode, "0101248141");
      assert.equal(detail.counts.members, 45);
      assert.equal(detail.counts.jobs, 12);
      assert.equal(detail.counts.applications, 380);
      assert.equal(detail.locations.length, 1);
      assert.equal(detail.locations[0].isHeadquarters, true);
    });

    it("normalizes company legal profile and legal evidence documents safely", () => {
      const rawLegal = {
        profile: {
          companyId: "comp-full-1",
          registeredAddress: "Số 10 Phạm Văn Bạch, Hà Nội",
          representativeName: "Nguyễn Văn A",
          representativeTitle: "Tổng Giám đốc",
          contactEmail: "legal@fpt.com.vn",
          contactPhone: "02473007300",
          updatedAt: "2026-10-20T00:00:00.000Z",
        },
        evidences: [
          {
            id: "ev-dkkd-1",
            kind: "BUSINESS_REGISTRATION",
            originalName: "GiayPhepDKKD_FPT.pdf",
            mimeType: "application/pdf",
            byteSize: 1048576,
            sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            createdAt: "2026-10-20T00:00:00.000Z",
          },
        ],
      };

      const legal = normalizeAdminCompanyLegal(rawLegal);
      assert.ok(legal.profile);
      assert.equal(legal.profile?.representativeName, "Nguyễn Văn A");
      assert.equal(legal.profile?.registeredAddress, "Số 10 Phạm Văn Bạch, Hà Nội");
      assert.equal(legal.evidences.length, 1);
      assert.equal(legal.evidences[0].originalName, "GiayPhepDKKD_FPT.pdf");
      assert.equal(legal.evidences[0].kind, "BUSINESS_REGISTRATION");
    });
  });

  describe("Admin Job DTO & Detail Normalization", () => {
    it("normalizes admin job summary and detailed information", () => {
      const raw = {
        id: "job-sec-1",
        companyId: "comp-full-1",
        categoryId: "cat-dev",
        title: "Senior React Architect",
        status: "PUBLISHED",
        version: 3,
        description: "Phát triển kiến trúc giao diện Web Enterprise.",
        employmentType: "FULL_TIME",
        workplaceType: "HYBRID",
        salaryMin: 40000000,
        salaryMax: 60000000,
        currency: "VND",
        salaryPeriod: "MONTHLY",
        publishedAt: "2026-10-26T00:00:00.000Z",
        company: {
          id: "comp-full-1",
          name: "Tập đoàn FPT",
          status: "ACTIVE",
          verificationStatus: "VERIFIED",
        },
        category: {
          id: "cat-dev",
          code: "FRONTEND",
          name: "Lập trình Frontend",
        },
        _count: {
          applications: 24,
        },
      };

      const job = normalizeAdminJobDetail(raw);
      assert.equal(job.id, "job-sec-1");
      assert.equal(job.title, "Senior React Architect");
      assert.equal(job.status, "PUBLISHED");
      assert.equal(job.version, 3);
      assert.equal(job.company?.name, "Tập đoàn FPT");
      assert.equal(job.category?.code, "FRONTEND");
      assert.equal(job.applicationsCount, 24);
      assert.equal(job.salaryMin, 40000000);
      assert.equal(job.salaryMax, 60000000);
    });
  });

  describe("Admin Audit Normalization", () => {
    it("normalizes audit log record accurately", () => {
      const raw = {
        id: "audit-001",
        actorUserId: "admin-uuid",
        companyId: "comp-uuid",
        action: "admin.company.verify",
        targetType: "Company",
        targetId: "comp-uuid",
        createdAt: "2026-10-27T14:30:00.000Z",
      };

      const audit = normalizeAdminAudit(raw);
      assert.equal(audit.id, "audit-001");
      assert.equal(audit.action, "admin.company.verify");
      assert.equal(audit.targetType, "Company");
      assert.equal(audit.targetId, "comp-uuid");
      assert.equal(audit.actorUserId, "admin-uuid");
    });
  });

  describe("Business Permission Center API Contract & Evidence URLs", () => {
    it("constructs correct admin legal evidence download URL", () => {
      const url = adminApi.getLegalEvidenceDownloadUrl("comp-123", "ev-456");
      assert.ok(url.includes("/admin/companies/comp-123/legal/evidence/ev-456"));
    });
  });
});
