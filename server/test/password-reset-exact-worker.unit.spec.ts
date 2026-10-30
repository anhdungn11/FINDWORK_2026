import { PasswordResetWorker } from "../src/infrastructure/email/password-reset.worker";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { EmailDeliverySettings } from "../src/infrastructure/email/email-delivery-settings.service";
import { EmailCryptoService } from "../src/infrastructure/email/email-crypto.service";
import { EmailProviderService } from "../src/infrastructure/email/email-provider.service";
import { validateEnvironment } from "../src/config/env.validation";

const approvedId = "11111111-1111-4111-8111-111111111111";

describe("password reset exact-ID worker selection", () => {
  const db = { passwordResetOutbox: {
    findMany: jest.fn().mockResolvedValue([]),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    findFirst: jest.fn().mockResolvedValue(null),
  } };
  const settings = { passwordResetEnabled: true, assertCanQueuePasswordReset: jest.fn() };
  const crypto = { assertReady: jest.fn(), assertKeyAvailable: jest.fn() };
  const provider = { sendPasswordReset: jest.fn() };
  const worker = new PasswordResetWorker(db as unknown as PrismaService,
    settings as unknown as EmailDeliverySettings, crypto as unknown as EmailCryptoService,
    provider as unknown as EmailProviderService);

  beforeEach(() => {
    jest.clearAllMocks();
    db.passwordResetOutbox.findMany.mockResolvedValue([]);
    db.passwordResetOutbox.updateMany.mockResolvedValue({ count: 0 });
    db.passwordResetOutbox.findFirst.mockResolvedValue(null);
  });

  it("scopes key checks, stale-lease cleanup, and due-job selection to the approved ID", async () => {
    await expect(worker.processOne(approvedId)).resolves.toBe(false);
    expect(db.passwordResetOutbox.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: approvedId }) }));
    expect(db.passwordResetOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: approvedId, status: "PROCESSING" }) }));
    expect(db.passwordResetOutbox.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: approvedId }) }));
    expect(provider.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("preserves the existing general-worker selection when no ID is supplied", async () => {
    await expect(worker.processOne()).resolves.toBe(false);
    expect(db.passwordResetOutbox.findMany.mock.calls[0][0].where).not.toHaveProperty("id");
    expect(db.passwordResetOutbox.updateMany.mock.calls[0][0].where).not.toHaveProperty("id");
    expect(db.passwordResetOutbox.findFirst.mock.calls[0][0].where).not.toHaveProperty("id");
  });

  it("does not inspect jobs while reset delivery is disabled", async () => {
    const disabled = new PasswordResetWorker(db as unknown as PrismaService,
      { passwordResetEnabled: false } as EmailDeliverySettings,
      crypto as unknown as EmailCryptoService, provider as unknown as EmailProviderService);
    await expect(disabled.processOne(approvedId)).resolves.toBe(false);
    expect(db.passwordResetOutbox.findMany).not.toHaveBeenCalled();
    expect(provider.sendPasswordReset).not.toHaveBeenCalled();
  });
});

describe("automatic reset worker startup gate", () => {
  const base = {
    NODE_ENV: "test", DATABASE_URL: "postgresql://fake:fake@127.0.0.1:5432/findwork_disposable?schema=public",
    JWT_ACCESS_SECRET: "fake-test-jwt-secret-long-enough-12345",
    REFRESH_TOKEN_PEPPER: "fake-test-refresh-pepper-long-enough-12345",
    EMAIL_DELIVERY_MODE: "resend", EMAIL_WORKER_ENABLED: "false",
    EMAIL_PASSWORD_RESET_ENABLED: "true", EMAIL_ACTIVE_KEY_ID: "test",
    EMAIL_KEYRING_JSON: JSON.stringify({ test: Buffer.alloc(32, 1).toString("base64") }),
    EMAIL_RESEND_API_KEY: "fake-provider-key-123456", EMAIL_FROM: "test@example.invalid",
    EMAIL_VERIFY_URL: "http://127.0.0.1:5177/verify-email",
    EMAIL_RESET_URL: "http://127.0.0.1:5177/reset-password",
  };

  it("requires an explicit UTC cutoff and keeps the general worker disabled", () => {
    const enabled = { ...base, EMAIL_PASSWORD_RESET_AUTO_WORKER_ENABLED: "true" };
    expect(() => validateEnvironment(enabled)).toThrow("EMAIL_PASSWORD_RESET_AUTO_NOT_BEFORE");
    expect(() => validateEnvironment({ ...enabled,
      EMAIL_PASSWORD_RESET_AUTO_NOT_BEFORE: "2026-10-30T02:00:00.000Z",
      EMAIL_WORKER_ENABLED: "true" })).toThrow("general worker disabled");
    const settings = new EmailDeliverySettings({ get: (key: string, fallback?: unknown) =>
      validateEnvironment({ ...enabled, EMAIL_PASSWORD_RESET_AUTO_NOT_BEFORE: "2026-10-30T02:00:00.000Z" })[key] ?? fallback,
    } as never);
    expect(settings.assertAutomaticPasswordResetWorkerReady().toISOString())
      .toBe("2026-10-30T02:00:00.000Z");
  });
});
