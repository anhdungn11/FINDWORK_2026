import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { EmailCryptoService } from "../../../infrastructure/email/email-crypto.service";
import { EmailDeliverySettings } from "../../../infrastructure/email/email-delivery-settings.service";
import { PasswordService } from "../services/password.service";

const RESET_TTL_MS = 60 * 60 * 1000;
const RESET_COOLDOWN_MS = 60 * 1000;
const tokenHash = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");
const invalidToken = () => new UnauthorizedException({ code: "AUTH_PASSWORD_RESET_TOKEN_INVALID",
  message: "Password reset token is invalid or expired." });

@Injectable()
export class PasswordResetService {
  constructor(private readonly db: PrismaService, private readonly settings: EmailDeliverySettings,
    private readonly crypto: EmailCryptoService, private readonly password: PasswordService) {}

  private assertDelivery(): void {
    try { this.settings.assertCanQueuePasswordReset(); this.crypto.assertReady(); }
    catch { throw new ServiceUnavailableException({ code: "AUTH_PASSWORD_RESET_DELIVERY_UNAVAILABLE" }); }
  }

  async request(email: string): Promise<void> {
    // Check delivery before lookup so disabled mode does not disclose account existence.
    this.assertDelivery();
    const normalized = email.trim().toLowerCase();
    const account = await this.db.user.findUnique({ where: { emailNormalized: normalized },
      select: { id: true } });
    if (!account) return;
    await this.db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "User" WHERE id = ${account.id}::uuid FOR UPDATE`;
      if (!locked.length) return;
      const user = await tx.user.findUnique({ where: { id: account.id },
        select: { status: true, emailNormalized: true } });
      if (!user || user.status !== "ACTIVE" || user.emailNormalized !== normalized) return;
      const last = await tx.passwordResetToken.findFirst({ where: { userId: account.id },
        select: { createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      const now = new Date();
      if (last && now.getTime() - last.createdAt.getTime() < RESET_COOLDOWN_MS) return;
      const open = await tx.passwordResetToken.findMany({ where: { userId: account.id,
        consumedAt: null, revokedAt: null }, select: { id: true } });
      if (open.length) {
        const ids = open.map((row) => row.id);
        await tx.passwordResetOutbox.updateMany({ where: { tokenId: { in: ids },
          status: { in: ["QUEUED", "PROCESSING"] } }, data: { status: "CANCELLED",
          payloadCiphertext: null, payloadNonce: null, payloadTag: null, encryptionKeyId: null,
          claimedBy: null, leaseUntil: null, cancelledAt: now } });
        await tx.passwordResetToken.updateMany({ where: { id: { in: ids }, consumedAt: null,
          revokedAt: null }, data: { revokedAt: now } });
      }
      const rawToken = randomBytes(32).toString("base64url");
      const token = await tx.passwordResetToken.create({ data: { userId: account.id,
        emailNormalized: normalized, tokenHash: tokenHash(rawToken),
        expiresAt: new Date(now.getTime() + RESET_TTL_MS) }, select: { id: true, expiresAt: true } });
      const id = randomUUID();
      const sealed = this.crypto.encrypt(id, "RESET_PASSWORD", token.id, {
        version: 1, recipient: normalized, rawToken, tokenId: token.id,
        expiresAt: token.expiresAt.toISOString(), resetBaseUrl: this.settings.resetUrl,
        sender: this.settings.sender,
      });
      await tx.passwordResetOutbox.create({ data: { id, tokenId: token.id,
        idempotencyKey: `reset:${token.id}`, payloadCiphertext: Uint8Array.from(sealed.payloadCiphertext),
        payloadNonce: Uint8Array.from(sealed.payloadNonce), payloadTag: Uint8Array.from(sealed.payloadTag),
        encryptionKeyId: sealed.encryptionKeyId } });
    }, { maxWait: 10_000, timeout: 30_000 });
  }

  async confirm(rawToken: string, newPassword: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) throw invalidToken();
    const hash = tokenHash(rawToken);
    const locator = await this.db.passwordResetToken.findUnique({ where: { tokenHash: hash },
      select: { userId: true } });
    if (!locator) throw invalidToken();
    const passwordHash = await this.password.hash(newPassword);
    await this.db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "User" WHERE id = ${locator.userId}::uuid FOR UPDATE`;
      if (!locked.length) throw invalidToken();
      const token = await tx.passwordResetToken.findUnique({ where: { tokenHash: hash },
        select: { id: true, userId: true, emailNormalized: true, expiresAt: true,
          consumedAt: true, revokedAt: true } });
      const user = await tx.user.findUnique({ where: { id: locator.userId },
        select: { status: true, emailNormalized: true } });
      const now = new Date();
      if (!token || !user || token.userId !== locator.userId || token.consumedAt || token.revokedAt ||
          token.expiresAt <= now || user.status !== "ACTIVE" ||
          user.emailNormalized !== token.emailNormalized) throw invalidToken();
      await tx.passwordResetOutbox.updateMany({ where: { tokenId: token.id,
        status: { in: ["QUEUED", "PROCESSING"] } }, data: { status: "CANCELLED",
          payloadCiphertext: null, payloadNonce: null, payloadTag: null, encryptionKeyId: null,
          claimedBy: null, leaseUntil: null, cancelledAt: now } });
      await tx.passwordResetToken.update({ where: { id: token.id }, data: { consumedAt: now } });
      await tx.user.update({ where: { id: locator.userId }, data: { passwordHash } });
      await tx.authSession.updateMany({ where: { userId: locator.userId, revokedAt: null },
        data: { revokedAt: now } });
      await tx.auditLog.create({ data: { actorUserId: locator.userId, action: "auth.password_reset",
        targetType: "User", targetId: locator.userId } });
    }, { maxWait: 10_000, timeout: 30_000 });
  }
}
