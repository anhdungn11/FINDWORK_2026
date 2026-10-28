import { RecruitmentNotificationWorker } from "../src/infrastructure/email/recruitment-notification.worker";
import { EmailDeliveryWorker } from "../src/infrastructure/email/email-delivery.worker";
import { EmailOutboxRepository } from "../src/infrastructure/email/email-outbox.repository";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import type { EmailDeliverySettings } from "../src/infrastructure/email/email-delivery-settings.service";
import type { EmailCryptoService } from "../src/infrastructure/email/email-crypto.service";
import type { EmailProviderService } from "../src/infrastructure/email/email-provider.service";

it("scopes every pre-claim recruitment outbox query to the reviewed job", async () => {
  const findMany = jest.fn().mockResolvedValue([]);
  const updateMany = jest.fn().mockResolvedValue({ count: 0 });
  const findFirst = jest.fn().mockResolvedValue(null);
  const db = { recruitmentEmailOutbox: { findMany, updateMany, findFirst } } as unknown as PrismaService;
  const settings = { recruitmentEnabled: true, assertCanQueueRecruitment: jest.fn() } as unknown as EmailDeliverySettings;
  const crypto = { assertReady: jest.fn() } as unknown as EmailCryptoService;
  const provider = { sendRecruitmentNotice: jest.fn() } as unknown as EmailProviderService;
  const worker = new RecruitmentNotificationWorker(db, settings, crypto, provider);
  expect(await worker.processOne("reviewed-job-id")).toBe(false);
  expect(findMany.mock.calls[0][0].where.id).toBe("reviewed-job-id");
  expect(updateMany.mock.calls[0][0].where.id).toBe("reviewed-job-id");
  expect(findFirst.mock.calls[0][0].where.id).toBe("reviewed-job-id");
  expect(provider.sendRecruitmentNotice).not.toHaveBeenCalled();
});

it("scopes verification delivery to the reviewed job while the general worker stays off", async () => {
  const pendingKeyIds = jest.fn().mockResolvedValue([]);
  const claim = jest.fn().mockResolvedValue(null);
  const repo = { pendingKeyIds, claim };
  const settings = { assertCanQueue: jest.fn(), assertWorkerReady: jest.fn() };
  const crypto = { assertReady: jest.fn() };
  const worker = new EmailDeliveryWorker(repo as never, crypto as never,
    { sendVerification: jest.fn() } as never, settings as never);
  expect(await worker.processOne("reviewed-verification-job-id")).toBe(false);
  expect(settings.assertCanQueue).toHaveBeenCalledTimes(1);
  expect(settings.assertWorkerReady).not.toHaveBeenCalled();
  expect(pendingKeyIds).toHaveBeenCalledWith("reviewed-verification-job-id");
  expect(claim).toHaveBeenCalledWith(expect.any(String), "reviewed-verification-job-id");
});

it("binds the reviewed verification ID in every pending-key and claim query", async () => {
  const query = jest.fn().mockResolvedValue([]);
  const execute = jest.fn().mockResolvedValue(0);
  const repository = new EmailOutboxRepository({ $queryRaw: query,
    $executeRaw: execute } as unknown as PrismaService);
  const id = "00000000-0000-4000-8000-000000000001";
  expect(await repository.pendingKeyIds(id)).toEqual([]);
  expect(await repository.claim("reviewed-owner", id)).toBeNull();
  expect(query).toHaveBeenCalledTimes(2);
  expect(execute).toHaveBeenCalledTimes(1);
  for (const call of [...query.mock.calls, ...execute.mock.calls]) {
    expect(call.slice(1)).toContain(id);
  }
});
