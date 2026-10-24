import { ConfigService } from "@nestjs/config";
import { ForbiddenException } from "@nestjs/common";
import { AiService } from "../src/modules/ai/ai.service";
import { AiProviderService } from "../src/modules/ai/ai-provider.service";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";

describe("AI premium feature gate before billing rollout", () => {
  const provider = { pricing: jest.fn(), generate: jest.fn(), transcribe: jest.fn() };
  const db = { aiConversation: { findFirst: jest.fn().mockResolvedValue({ id: "owned" }) } };
  const service = new AiService(db as unknown as PrismaService, provider as unknown as AiProviderService,
    {} as ConfigService);
  const identity = { type: "guest" as const, id: "guest-owned" };

  beforeEach(() => jest.clearAllMocks());

  it("refuses guest image analysis before provider use or usage reservation", async () => {
    try { await service.send(identity, "owned", "Describe this image", { buffer: Buffer.from("image"), mimetype: "image/png" });
      throw new Error("Expected premium gate"); }
    catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({ code: "AI_PREMIUM_ENTITLEMENT_REQUIRED" });
    }
    expect(provider.pricing).not.toHaveBeenCalled();
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it("refuses voice transcription before provider use or usage reservation", async () => {
    await expect(service.transcribe(identity, { buffer: Buffer.from("RIFF"), mimetype: "audio/wav" }))
      .rejects.toMatchObject({ response: { code: "AI_PREMIUM_ENTITLEMENT_REQUIRED" } });
    expect(provider.transcribe).not.toHaveBeenCalled();
    expect(provider.pricing).not.toHaveBeenCalled();
  });
});
