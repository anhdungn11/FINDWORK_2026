import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

interface CreateRegisteredUserInput {
  email: string;
  emailNormalized: string;
  passwordHash: string;
  sessionId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

interface CreateSessionInput {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByNormalizedEmail(emailNormalized: string) {
    return this.prisma.user.findUnique({
      where: {
        emailNormalized,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
        emailVerifiedAt: true,
      },
    });
  }

  async createRegisteredUserWithSession(
    input: CreateRegisteredUserInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const candidateRole = await tx.role.findUnique({
        where: {
          systemCode: "CANDIDATE",
        },
        select: {
          id: true,
          kind: true,
          isActive: true,
        },
      });

      if (
        !candidateRole ||
        candidateRole.kind !== "SYSTEM" ||
        !candidateRole.isActive
      ) {
        throw new Error(
          "CANDIDATE system role is not provisioned or active.",
        );
      }

      const user = await tx.user.create({
        data: {
          email: input.email,
          emailNormalized: input.emailNormalized,
          passwordHash: input.passwordHash,
        },
        select: {
          id: true,
          email: true,
          status: true,
          emailVerifiedAt: true,
        },
      });

      await tx.systemUserRole.create({
        data: {
          userId: user.id,
          roleId: candidateRole.id,
          assignedByUserId: null,
        },
      });

      await tx.authSession.create({
        data: {
          id: input.sessionId,
          userId: user.id,
          refreshTokenHash: input.refreshTokenHash,
          expiresAt: input.expiresAt,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
        },
      });

      return user;
    });
  }

  createSession(input: CreateSessionInput) {
    return this.prisma.authSession.create({
      data: {
        id: input.id,
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      },
    });
  }

  findSessionWithUser(sessionId: string) {
    return this.prisma.authSession.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        id: true,
        userId: true,
        refreshTokenHash: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            emailVerifiedAt: true,
          },
        },
      },
    });
  }

  findAccessSession(sessionId: string) {
    return this.prisma.authSession.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            emailVerifiedAt: true,
          },
        },
      },
    });
  }

  async rotateRefreshToken(
    sessionId: string,
    userId: string,
    oldRefreshTokenHash: string,
    newRefreshTokenHash: string,
    now: Date,
  ): Promise<boolean> {
    const result = await this.prisma.authSession.updateMany({
      where: {
        id: sessionId,
        userId,
        refreshTokenHash: oldRefreshTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
        user: {
          status: "ACTIVE",
        },
      },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        lastUsedAt: now,
      },
    });

    return result.count === 1;
  }

  async revokeSession(
    sessionId: string,
    refreshTokenHash: string,
    now: Date,
  ): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        id: sessionId,
        refreshTokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        lastUsedAt: now,
      },
    });
  }
}
