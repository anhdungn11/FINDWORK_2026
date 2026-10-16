import "reflect-metadata";
import { type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import { AppModule } from "../src/app.module";
import { Prisma } from "../src/generated/prisma/client";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import {
  REFERENCE_SNAPSHOT,
  syncReferenceFoundation,
  type ReferenceSnapshot,
} from "../prisma/seed-data/reference-foundation";
import { assertSafeIntegrationDatabase } from "./integration-safety";

describe("Reference seed against PostgreSQL (transaction rollback only)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    const config = app.get(ConfigService);
    await app.init();
    prisma = app.get(PrismaService);
    await assertSafeIntegrationDatabase(prisma, config);
  });
  afterAll(async () => app?.close());

  async function targetCounts(db: PrismaService | Prisma.TransactionClient) {
    const [skills, certificates, provinces] = await Promise.all([
      db.skill.count({ where: { code: { in: REFERENCE_SNAPSHOT.skills.map((item) => item.code) } } }),
      db.languageCertificateType.count({ where: { code: { in: REFERENCE_SNAPSHOT.certificates.map((item) => item.code) } } }),
      db.province.count({ where: { code: { in: REFERENCE_SNAPSHOT.provinces.map((item) => item.code) } } }),
    ]);
    return { skills, certificates, provinces };
  }

  it("dry-run executes in a read-only transaction and leaves all target counts unchanged", async () => {
    const before = await targetCounts(prisma);
    const report = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return syncReferenceFoundation(tx, REFERENCE_SNAPSHOT, "dry-run");
    });
    expect(report.mode).toBe("dry-run");
    expect(report.provinces).toMatch(/^BLOCKED:/);
    expect(report.wards).toMatch(/^BLOCKED:/);
    expect(await targetCounts(prisma)).toEqual(before);
  });

  it("keeps UUID and updatedAt on replay and reordered scoreFields keys, then rolls back", async () => {
    const before = await targetCounts(prisma);
    const rollback = new Error("ROLLBACK_CP8A_REFERENCE_TEST");

    await expect(prisma.$transaction(async (tx) => {
      await syncReferenceFoundation(tx, REFERENCE_SNAPSHOT, "apply", "skills-certificates");
      const skillCode = REFERENCE_SNAPSHOT.skills[0]!.code;
      const certificateCode = REFERENCE_SNAPSHOT.certificates[0]!.code;
      const first = await Promise.all([
        tx.skill.findUniqueOrThrow({ where: { code: skillCode }, select: { id: true, updatedAt: true } }),
        tx.languageCertificateType.findUniqueOrThrow({ where: { code: certificateCode }, select: { id: true, updatedAt: true } }),
      ]);
      const replay = await syncReferenceFoundation(tx, REFERENCE_SNAPSHOT, "apply", "skills-certificates");
      expect(replay.tables.skills.create + replay.tables.skills.update).toBe(0);
      expect(replay.tables.certificates.create + replay.tables.certificates.update).toBe(0);
      expect(replay.tables.provinces.create + replay.tables.provinces.update).toBe(0);

      const firstCertificate = REFERENCE_SNAPSHOT.certificates[0]!;
      const reordered: ReferenceSnapshot = {
        ...REFERENCE_SNAPSHOT,
        certificates: [
          { ...firstCertificate, scoreFields: firstCertificate.scoreFields.map((field) =>
            Object.fromEntries(Object.entries(field).reverse()) as typeof field) },
          ...REFERENCE_SNAPSHOT.certificates.slice(1),
        ],
      };
      const reorderedReport = await syncReferenceFoundation(tx, reordered, "apply", "skills-certificates");
      expect(reorderedReport.tables.certificates.update).toBe(0);
      const second = await Promise.all([
        tx.skill.findUniqueOrThrow({ where: { code: skillCode }, select: { id: true, updatedAt: true } }),
        tx.languageCertificateType.findUniqueOrThrow({ where: { code: certificateCode }, select: { id: true, updatedAt: true } }),
      ]);
      expect(second).toEqual(first);
      throw rollback;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120_000 })).rejects.toBe(rollback);

    expect(await targetCounts(prisma)).toEqual(before);
  }, 130_000);

  it("rolls back prior upserts when a later snapshot has an invalid parent reference", async () => {
    const before = await targetCounts(prisma);
    const invalid: ReferenceSnapshot = {
      ...REFERENCE_SNAPSHOT,
      skills: [
        { ...REFERENCE_SNAPSHOT.skills[0]!, categoryCode: `cp8a-missing-${randomUUID()}` },
        ...REFERENCE_SNAPSHOT.skills.slice(1),
      ],
    };
    await expect(prisma.$transaction(async (tx) => {
      await syncReferenceFoundation(tx, REFERENCE_SNAPSHOT, "apply", "skills-certificates");
      await syncReferenceFoundation(tx, invalid, "apply", "skills-certificates");
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120_000 }))
      .rejects.toThrow(/missing\/inactive category/);
    expect(await targetCounts(prisma)).toEqual(before);
  }, 130_000);
});
