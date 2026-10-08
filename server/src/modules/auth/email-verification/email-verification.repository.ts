import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import {
  EMAIL_VERIFICATION_COOLDOWN_MS,
  EMAIL_VERIFICATION_TTL_MS,
} from "./email-verification.constants";
import type { EmailVerificationEnqueueInput } from "./email-verification-enqueue.service";

interface IssueInput {
  userId: string;
  rawToken: string;
  tokenHash: string;
}

type EnqueueCallback = (
  tx: Prisma.TransactionClient,
  input: EmailVerificationEnqueueInput,
) => Promise<void>;

function invalidToken(): UnauthorizedException {
  return new UnauthorizedException({
    code: "AUTH_EMAIL_VERIFICATION_TOKEN_INVALID",
    message: "Verification token is invalid or expired.",
  });
}

/** All verification writes acquire the User row lock FIRST. */
@Injectable()
export class EmailVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async lockUser(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<boolean> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE
    `;
    return rows.length === 1;
  }

  async issue(input: IssueInput, enqueue: EnqueueCallback): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (!(await this.lockUser(tx, input.userId))) {
        throw new ForbiddenException({
          code: "AUTH_ACCOUNT_UNAVAILABLE",
          message: "Account is unavailable.",
        });
      }

      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          emailNormalized: true,
          status: true,
          emailVerifiedAt: true,
        },
      });
      if (!user || user.status !== "ACTIVE") {
        throw new ForbiddenException({
          code: "AUTH_ACCOUNT_UNAVAILABLE",
          message: "Account is unavailable.",
        });
      }
      // Already verified is a harmless, no-write no-op for an authenticated user.
      if (user.emailVerifiedAt) return;

      const now = new Date();
      const last = await tx.emailVerificationToken.findFirst({
        where: { userId: user.id },
        select: { createdAt: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      if (last && now.getTime() - last.createdAt.getTime() < EMAIL_VERIFICATION_COOLDOWN_MS) {
        throw new HttpException(
          {
            code: "AUTH_EMAIL_VERIFICATION_COOLDOWN",
            message: "Please wait before requesting another verification email.",
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const openTokens = await tx.emailVerificationToken.findMany({
        where: { userId: user.id, consumedAt: null, revokedAt: null },
        select: { id: true },
      });
      const openIds = openTokens.map((item) => item.id);
      if (openIds.length) {
        // Old plaintext must not remain encrypted in a queued/leased job.
        // Future workers must also verify token validity before dispatch.
        await tx.emailOutbox.updateMany({
          where: {
            verificationTokenId: { in: openIds },
            status: { in: ["QUEUED", "PROCESSING"] },
          },
          data: {
            status: "CANCELLED",
            cancelledAt: now,
            claimedBy: null,
            leaseUntil: null,
            payloadCiphertext: null,
            payloadNonce: null,
            payloadTag: null,
            encryptionKeyId: null,
          },
        });
        await tx.emailVerificationToken.updateMany({
          where: { id: { in: openIds }, consumedAt: null, revokedAt: null },
          data: { revokedAt: now },
        });
      }

      const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS);
      const token = await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          emailNormalized: user.emailNormalized,
          tokenHash: input.tokenHash,
          expiresAt,
        },
        select: { id: true },
      });

      // If enqueue rejects or fails to write an encrypted outbox row,
      // the ENTIRE transaction (including revocations) rolls back.
      await enqueue(tx, {
        verificationTokenId: token.id,
        userId: user.id,
        emailNormalized: user.emailNormalized,
        rawToken: input.rawToken,
        expiresAt,
      });
      const queued = await tx.emailOutbox.count({
        where: {
          verificationTokenId: token.id,
          kind: "VERIFY_EMAIL",
          status: "QUEUED",
        },
      });
      if (queued !== 1) {
        throw new Error("Atomic encrypted email-verification enqueue did not persist exactly one queued job.");
      }
    }, { maxWait: 10_000, timeout: 30_000 });
  }

  async confirm(tokenHash: string): Promise<void> {
    // Lookup outside transaction only identifies which User row to lock.
    // All validity checks are repeated after acquiring the lock.
    const locator = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash }, select: { userId: true },
    });
    if (!locator) throw invalidToken();

    await this.prisma.$transaction(async (tx) => {
      if (!(await this.lockUser(tx, locator.userId))) throw invalidToken();

      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "EmailVerificationToken"
        WHERE "tokenHash" = ${tokenHash} FOR UPDATE
      `;
      if (rows.length !== 1) throw invalidToken();

      const token = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
          emailNormalized: true,
          expiresAt: true,
          consumedAt: true,
          revokedAt: true,
        },
      });
      const user = await tx.user.findUnique({
        where: { id: locator.userId },
        select: {
          id: true,
          emailNormalized: true,
          emailVerifiedAt: true,
          status: true,
        },
      });
      const now = new Date();
      if (
        !token ||
        token.userId !== locator.userId ||
        token.consumedAt !== null ||
        token.revokedAt !== null ||
        token.expiresAt <= now ||
        !user ||
        user.status !== "ACTIVE" ||
        user.emailVerifiedAt !== null ||
        token.emailNormalized !== user.emailNormalized
      ) {
        throw invalidToken();
      }

      // If confirmation wins the race with a still-pending delivery,
      // make the queued payload unrecoverable in the same transaction.
      // An in-flight provider request remains at-least-once; worker must
      // independently recheck token eligibility immediately before send.
      await tx.emailOutbox.updateMany({
        where: {
          verificationTokenId: token.id,
          status: { in: ["QUEUED", "PROCESSING"] },
        },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          claimedBy: null,
          leaseUntil: null,
          payloadCiphertext: null,
          payloadNonce: null,
          payloadTag: null,
          encryptionKeyId: null,
        },
      });
      await tx.emailVerificationToken.update({
        where: { id: token.id },
        data: { consumedAt: now },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: now },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "auth.email_verified",
          targetType: "User",
          targetId: user.id,
          // No email or token, including its hash, is recorded in audit data.
        },
      });
    }, { maxWait: 10_000, timeout: 30_000 });
  }
}
