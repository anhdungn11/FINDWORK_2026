import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EmailWorkerModule } from "../src/workers/email-worker.module";
import { InvitationMaintenanceModule } from "../src/workers/invitation-maintenance.module";
import { InvitationCleanupScheduler } from "../src/workers/invitation-cleanup.scheduler";
import { CompanyInvitationsRepository } from "../src/modules/company/company-invitations.repository";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { EmailProviderService } from "../src/infrastructure/email/email-provider.service";
import { EmailDeliverySettings } from "../src/infrastructure/email/email-delivery-settings.service";
import { EmailDeliveryWorker } from "../src/infrastructure/email/email-delivery.worker";
import { EmailOutboxRepository } from "../src/infrastructure/email/email-outbox.repository";
import { EmailCryptoService } from "../src/infrastructure/email/email-crypto.service";
import { validateEnvironment } from "../src/config/env.validation";

describe("Invitation cleanup scheduler and worker bootstrap", () => {
  it("resolves verification worker without CompanyModule or invitation maintenance", async () => {
    const provider = { sendVerification: jest.fn(() => { throw new Error("NO_TEST_NETWORK"); }) };
    const moduleRef = await Test.createTestingModule({ imports: [EmailWorkerModule] })
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(EmailProviderService).useValue(provider)
      .compile();
    try {
      await moduleRef.init();
      expect(moduleRef.get(EmailDeliveryWorker)).toBeDefined();
      expect(moduleRef.get(EmailDeliverySettings).invitationEnabled).toBe(false);
      expect(() => moduleRef.get(CompanyInvitationsRepository)).toThrow();
      expect(provider.sendVerification).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it("resolves maintenance repositories with delivery disabled and no provider", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [InvitationMaintenanceModule] })
      .overrideProvider(PrismaService).useValue({})
      .compile();
    try {
      await moduleRef.init();
      expect(moduleRef.get(ConfigService).get("EMAIL_DELIVERY_MODE", "disabled")).toBe("disabled");
      expect(moduleRef.get(ConfigService).get("EMAIL_INVITATION_DELIVERY_ENABLED", "false")).toBe("false");
      expect(moduleRef.get(CompanyInvitationsRepository)).toBeDefined();
      expect(() => moduleRef.get(EmailDeliveryWorker)).toThrow();
      expect(() => moduleRef.get(EmailProviderService)).toThrow();
    } finally {
      await moduleRef.close();
    }
  });

  it("keeps the invitation flag default-off and maintenance independent of verification worker readiness", () => {
    const env = validateEnvironment({
      NODE_ENV: "test", DATABASE_URL: "postgresql://fake:fake@localhost:5432/findwork_test",
      JWT_ACCESS_SECRET: "fake-test-jwt-secret-long-enough-12345",
      REFRESH_TOKEN_PEPPER: "fake-test-refresh-pepper-long-enough-12345",
    });
    expect(env.EMAIL_INVITATION_DELIVERY_ENABLED).toBe("false");
    const settings = new EmailDeliverySettings({
      get: (name: string, fallback?: unknown) => env[name as keyof typeof env] ?? fallback,
    } as ConfigService);
    expect(() => settings.assertWorkerReady()).toThrow("EMAIL_DELIVERY_DISABLED");
    expect(() => settings.assertCanQueueInvitation()).toThrow("EMAIL_INVITATION_DELIVERY_DISABLED");
    // Maintenance has no EmailDeliverySettings prerequisite.
    expect(new InvitationCleanupScheduler({ cleanupExpired: jest.fn() }, jest.fn())).toBeDefined();
  });

  it("runs scheduled bounded batches from completion time", async () => {
    let now = 1000;
    const cleanupExpired = jest.fn().mockResolvedValueOnce(25).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const scheduler = new InvitationCleanupScheduler({ cleanupExpired }, jest.fn(), () => now);
    expect(await scheduler.runDue()).toBe("more");
    now = 1249;
    expect(await scheduler.runDue()).toBe("not-due");
    now = 1250;
    expect(await scheduler.runDue()).toBe("idle");
    now = 31_249;
    expect(await scheduler.runDue()).toBe("not-due");
    now = 31_250;
    expect(await scheduler.runDue()).toBe("idle");
    expect(cleanupExpired).toHaveBeenCalledTimes(3);
    expect(cleanupExpired).toHaveBeenCalledWith(25);
  });

  it("waits after a slow successful cleanup pass", async () => {
    let now = 1000;
    const cleanupExpired = jest.fn(async () => { now = 121_000; return 0; });
    const scheduler = new InvitationCleanupScheduler({ cleanupExpired }, jest.fn(), () => now);
    expect(await scheduler.runDue()).toBe("idle");
    now = 150_999;
    expect(await scheduler.runDue()).toBe("not-due");
    now = 151_000;
    expect(await scheduler.runDue()).toBe("idle");
    expect(cleanupExpired).toHaveBeenCalledTimes(2);
  });

  it("backs off from completion after a slow failure, then recovers", async () => {
    let now = 1000;
    const cleanupExpired = jest.fn()
      .mockImplementationOnce(async () => { now = 121_000; throw new Error("secret database URL and token"); })
      .mockImplementationOnce(async () => { now = 181_000; throw new Error("secret database URL and token"); })
      .mockResolvedValueOnce(0);
    const onFailure = jest.fn();
    const scheduler = new InvitationCleanupScheduler({ cleanupExpired }, onFailure, () => now);
    expect(await scheduler.runDue()).toBe("failed");
    now = 150_999;
    expect(await scheduler.runDue()).toBe("not-due");
    expect(cleanupExpired).toHaveBeenCalledTimes(1);
    now = 151_000;
    expect(await scheduler.runDue()).toBe("failed");
    now = 240_999;
    expect(await scheduler.runDue()).toBe("not-due");
    expect(cleanupExpired).toHaveBeenCalledTimes(2);
    now = 241_000;
    expect(await scheduler.runDue()).toBe("idle");
    expect(cleanupExpired).toHaveBeenCalledTimes(3);
    expect(onFailure).toHaveBeenCalledTimes(2);
    expect(onFailure.mock.calls).toEqual([[], []]);
    now = 270_999;
    expect(await scheduler.runDue()).toBe("not-due");
  });

  it("caps repeated failure backoff without a busy loop", async () => {
    let now = 1000;
    const cleanupExpired = jest.fn().mockRejectedValue(new Error("sensitive details"));
    const scheduler = new InvitationCleanupScheduler({ cleanupExpired }, jest.fn(), () => now);
    for (let attempt = 0; attempt < 7; attempt += 1) {
      expect(await scheduler.runDue()).toBe("failed");
      now += Math.min(15 * 60_000, 30_000 * 2 ** attempt);
      now -= 1;
      expect(await scheduler.runDue()).toBe("not-due");
      now += 1;
    }
    expect(cleanupExpired).toHaveBeenCalledTimes(7);
  });

  it("does not wait for slow maintenance before a verification work pass", async () => {
    let finishCleanup!: (count: number) => void;
    const pendingCleanup = new Promise<number>((resolve) => { finishCleanup = resolve; });
    const cleanupExpired = jest.fn(() => pendingCleanup);
    const scheduler = new InvitationCleanupScheduler({ cleanupExpired }, jest.fn());
    const maintenancePass = scheduler.runDue();
    const claim = jest.fn().mockResolvedValue(null);
    const provider = { sendVerification: jest.fn(() => { throw new Error("NO_TEST_NETWORK"); }) };
    const worker = new EmailDeliveryWorker(
      { pendingKeyIds: jest.fn().mockResolvedValue([]), claim } as unknown as EmailOutboxRepository,
      { assertReady: jest.fn() } as unknown as EmailCryptoService,
      provider as unknown as EmailProviderService,
      { assertWorkerReady: jest.fn() } as unknown as EmailDeliverySettings,
    );
    await expect(worker.processOne()).resolves.toBe(false);
    expect(claim).toHaveBeenCalledTimes(1);
    expect(provider.sendVerification).not.toHaveBeenCalled();
    expect(cleanupExpired).toHaveBeenCalledTimes(1);
    finishCleanup(0);
    expect(await maintenancePass).toBe("idle");
  });

  it("keeps COMPANY_INVITATION outside the CP2 claim query", async () => {
    const queries: string[] = [];
    const repo = {
      $executeRaw: jest.fn(async (strings: TemplateStringsArray) => { queries.push(strings.join("")); return 0; }),
      $queryRaw: jest.fn(async (strings: TemplateStringsArray) => { queries.push(strings.join("")); return []; }),
    };
    const outbox = new EmailOutboxRepository(
      repo as unknown as PrismaService,
    );
    expect(await outbox.claim("test-owner")).toBeNull();
    expect(queries).toHaveLength(2);
    expect(queries.every((query) => query.includes("'VERIFY_EMAIL'"))).toBe(true);
    expect(queries.every((query) => !query.includes("'COMPANY_INVITATION'"))).toBe(true);
  });
});
