import { PasswordResetWorker } from "../src/infrastructure/email/password-reset.worker";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { EmailDeliverySettings } from "../src/infrastructure/email/email-delivery-settings.service";
import { EmailCryptoService } from "../src/infrastructure/email/email-crypto.service";
import { EmailProviderService } from "../src/infrastructure/email/email-provider.service";

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