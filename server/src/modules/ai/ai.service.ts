import { BadRequestException, ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { validateCompanyImage } from "../company/company-media.storage";
import type { AiIdentity } from "./ai-access.guard";
import { AiProviderService } from "./ai-provider.service";

const ownerWhere = (identity: AiIdentity) => identity.type === "user"
  ? { ownerUserId: identity.id } : { guestSessionId: identity.id };
const ownerKey = (identity: AiIdentity) => `${identity.type === "user" ? "u" : "g"}:${identity.id}`;
const day = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
const rateLimit = (code: string) => new HttpException({ code }, 429);

@Injectable()
export class AiService {
  constructor(private readonly db: PrismaService, private readonly provider: AiProviderService,
    private readonly config: ConfigService) {}

  private requirePremiumEntitlement() {
    // No payment-derived entitlement exists yet. The future check must also enforce expiry and quota.
    throw new ForbiddenException({ code: "AI_PREMIUM_ENTITLEMENT_REQUIRED" });
  }

  async guest(ip: string) {
    // Purge a bounded batch of expired guest history before issuing another session.
    const expired = await this.db.aiGuestSession.findMany({ where: { expiresAt: { lt: new Date() } },
      select: { id: true }, take: 100 });
    if (expired.length) {
      const ids = expired.map((row) => row.id);
      await this.db.$transaction(async (tx) => {
        await tx.aiMessage.deleteMany({ where: { conversation: { guestSessionId: { in: ids } } } });
        await tx.aiConversation.deleteMany({ where: { guestSessionId: { in: ids } } });
        await tx.aiGuestSession.deleteMany({ where: { id: { in: ids } } });
      });
    }
    const pepper = this.config.getOrThrow<string>("REFRESH_TOKEN_PEPPER");
    const ipHash = createHash("sha256").update(`${pepper}:${ip}`).digest("hex");
    const since = new Date(Date.now() - 86_400_000);
    if (await this.db.aiGuestSession.count({ where: { ipHash, createdAt: { gte: since } } }) >= 3) {
      throw rateLimit("AI_GUEST_SESSION_LIMIT");
    }
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 86_400_000);
    const session = await this.db.aiGuestSession.create({ data: {
      tokenHash: createHash("sha256").update(token).digest("hex"), ipHash, expiresAt,
    }, select: { id: true, expiresAt: true } });
    return { ...session, token };
  }

  async create(identity: AiIdentity) {
    const existing = await this.db.aiConversation.count({ where: { ...ownerWhere(identity), createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
    if (existing >= (identity.type === "guest" ? 3 : 30)) {
      throw rateLimit("AI_CONVERSATION_LIMIT");
    }
    return this.db.aiConversation.create({ data: identity.type === "user"
      ? { ownerUserId: identity.id } : { guestSessionId: identity.id },
      select: { id: true, createdAt: true, updatedAt: true } });
  }

  list(identity: AiIdentity) {
    return this.db.aiConversation.findMany({ where: ownerWhere(identity),
      select: { id: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" }, take: 30 });
  }

  async messages(identity: AiIdentity, conversationId: string) {
    await this.requireConversation(identity, conversationId);
    return this.db.aiMessage.findMany({ where: { conversationId },
      select: { id: true, role: true, content: true, createdAt: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 100 });
  }

  private async requireConversation(identity: AiIdentity, id: string) {
    const found = await this.db.aiConversation.findFirst({ where: { id, ...ownerWhere(identity) }, select: { id: true } });
    if (!found) throw new NotFoundException({ code: "AI_CONVERSATION_NOT_FOUND" });
  }

  private async reserve(identity: AiIdentity, tokens: number, costMicros: number) {
    const key = ownerKey(identity);
    const today = day();
    const tokenLimit = identity.type === "guest" ? 32_000 : 120_000;
    const costLimit = identity.type === "guest" ? 3_000 : 20_000;
    const requestLimit = identity.type === "guest" ? 5 : 20;
    await this.db.aiUsageBucket.upsert({ where: { ownerKey_day: { ownerKey: key, day: today } },
      create: { ownerKey: key, day: today }, update: {} });
    const reserved = await this.db.aiUsageBucket.updateMany({ where: { ownerKey: key, day: today,
      requestCount: { lt: requestLimit }, reservedTokens: { lte: tokenLimit - tokens },
      reservedCostMicros: { lte: costLimit - costMicros } },
      data: { requestCount: { increment: 1 }, reservedTokens: { increment: tokens },
        reservedCostMicros: { increment: costMicros } } });
    if (reserved.count !== 1) throw rateLimit("AI_DAILY_BUDGET_EXCEEDED");
    return { key, today, tokens, costMicros };
  }

  private async settle(reservation: { key: string; today: Date; tokens: number; costMicros: number },
    actualTokens: number, actualCost: number) {
    await this.db.aiUsageBucket.update({ where: { ownerKey_day: { ownerKey: reservation.key, day: reservation.today } },
      data: { reservedTokens: { increment: actualTokens - reservation.tokens },
        reservedCostMicros: { increment: actualCost - reservation.costMicros } } });
  }

  async send(identity: AiIdentity, conversationId: string, content: string,
    image?: { buffer: Buffer; mimetype: string }) {
    await this.requireConversation(identity, conversationId);
    if (image) this.requirePremiumEntitlement();
    const prompt = content.trim();
    if (!prompt || prompt.length > 4000) throw new BadRequestException({ code: "AI_MESSAGE_INVALID" });
    if (Buffer.byteLength(prompt, "utf8") > 4000) throw new BadRequestException({ code: "AI_MESSAGE_TOO_LARGE" });
    if (/password|mật khẩu|credit card|thẻ tín dụng/i.test(prompt)) {
      throw new BadRequestException({ code: "AI_SENSITIVE_INPUT_BLOCKED" });
    }
    let attachment: { bytes: Buffer; mimeType: string } | undefined;
    if (image) {
      try { validateCompanyImage(image.buffer, image.mimetype, "cover"); }
      catch { throw new BadRequestException({ code: "AI_IMAGE_INVALID" }); }
      attachment = { bytes: image.buffer, mimeType: image.mimetype };
    }
    const prices = this.provider.pricing();
    const previous = await this.db.aiMessage.findMany({ where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20,
      select: { role: true, content: true } });
    const history = previous.reverse().map((m) => ({ role: m.role === "USER" ? "user" as const : "assistant" as const, content: m.content }));
    let contextBytes = Buffer.byteLength(prompt, "utf8") + history.reduce((n, item) => n + Buffer.byteLength(item.content, "utf8"), 0);
    while (history.length && contextBytes > 7000) {
      contextBytes -= Buffer.byteLength(history.shift()!.content, "utf8");
    }
    // Keep additional headroom for model-dependent image patch tokenization.
    const reserveTokens = attachment ? 20_000 : 9_000;
    const reserveCost = Math.ceil((reserveTokens - 700) * prices.inputPrice + 700 * prices.outputPrice);
    const reservation = await this.reserve(identity, reserveTokens, reserveCost);
    let result;
    try { result = await this.provider.generate(history, prompt, attachment); }
    catch (error) { await this.settle(reservation, 0, 0); throw error; }
    const actualCost = Math.ceil(result.inputTokens * prices.inputPrice + result.outputTokens * prices.outputPrice);
    const saved = await this.db.$transaction(async (tx) => {
      await tx.aiUsageBucket.update({ where: { ownerKey_day: { ownerKey: reservation.key, day: reservation.today } },
        data: { reservedTokens: { increment: result.totalTokens - reservation.tokens },
          reservedCostMicros: { increment: actualCost - reservation.costMicros } } });
      const user = await tx.aiMessage.create({ data: { conversationId, role: "USER",
        content: attachment ? `${prompt}\n[Image attached; bytes not retained]` : prompt,
        tokenCount: result.inputTokens }, select: { id: true, role: true, content: true, createdAt: true } });
      const assistant = await tx.aiMessage.create({ data: { conversationId, role: "ASSISTANT", content: result.text,
        tokenCount: result.outputTokens }, select: { id: true, role: true, content: true, createdAt: true } });
      await tx.aiConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return { user, assistant };
    });
    return { ...saved, usage: { totalTokens: result.totalTokens, estimatedCostMicros: actualCost } };
  }

  async transcribe(identity: AiIdentity, file?: { buffer: Buffer; mimetype: string }) {
    this.requirePremiumEntitlement();
    const bytes = file?.buffer;
    if (!bytes || file.mimetype !== "audio/wav" || bytes.length < 44 || bytes.length > 2_000_000 ||
      bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") {
      throw new BadRequestException({ code: "AI_AUDIO_INVALID" });
    }
    const byteRate = bytes.readUInt32LE(28);
    if (byteRate < 8000 || byteRate > 384000 || bytes.length / byteRate > 60) {
      throw new BadRequestException({ code: "AI_AUDIO_DURATION_INVALID" });
    }
    this.provider.pricing();
    const configuredCost = Number(this.config.get<string>("FINDWORK_AI_TRANSCRIPTION_MAX_COST_MICROS"));
    if (!Number.isInteger(configuredCost) || configuredCost < 1 || configuredCost > 3000) {
      throw new ServiceUnavailableException({ code: "AI_TRANSCRIPTION_BUDGET_NOT_CONFIGURED" });
    }
    const reservation = await this.reserve(identity, 2000, configuredCost);
    try { return { text: await this.provider.transcribe(bytes) }; }
    catch (error) { await this.settle(reservation, 0, 0); throw error; }
  }

  async remove(identity: AiIdentity, conversationId: string) {
    await this.requireConversation(identity, conversationId);
    await this.db.$transaction(async (tx) => {
      await tx.aiMessage.deleteMany({ where: { conversationId } });
      await tx.aiConversation.delete({ where: { id: conversationId } });
    });
    return { id: conversationId, deleted: true };
  }
}
