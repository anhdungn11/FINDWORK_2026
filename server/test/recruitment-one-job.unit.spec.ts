import { RecruitmentNotificationWorker } from "../src/infrastructure/email/recruitment-notification.worker";
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
