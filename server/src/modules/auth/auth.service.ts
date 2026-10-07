import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { AuthRepository } from "./auth.repository";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import { PasswordService } from "./services/password.service";
import { TokenService } from "./services/token.service";
import type {
  AuthCommandResult,
  AuthRequestMetadata,
  PublicAuthUser,
} from "./types/auth.types";

@Injectable()
export class AuthService {
  private readonly refreshTtlDays: number;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.refreshTtlDays =
      configService.getOrThrow<number>("REFRESH_TOKEN_TTL_DAYS");
  }

  async register(
    dto: RegisterDto,
    metadata: AuthRequestMetadata,
  ): Promise<AuthCommandResult> {
    const email = dto.email.trim();
    const emailNormalized = this.normalizeEmail(email);

    const passwordHash =
      await this.passwordService.hash(dto.password);

    const sessionId = randomUUID();
    const refresh = this.tokenService.createRefreshToken(sessionId);
    const refreshTokenHash =
      this.tokenService.hashRefreshSecret(refresh.secret);

    const expiresAt = this.createRefreshExpiry();

    try {
      const user =
        await this.authRepository.createRegisteredUserWithSession({
          email,
          emailNormalized,
          passwordHash,
          sessionId,
          refreshTokenHash,
          expiresAt,
          userAgent: this.normalizeUserAgent(metadata.userAgent),
          ipAddress: this.normalizeIpAddress(metadata.ipAddress),
        });

      const accessToken =
        await this.tokenService.signAccessToken(
          user.id,
          sessionId,
        );

      return {
        accessToken,
        accessTokenExpiresInSeconds:
          this.tokenService.getAccessTtlSeconds(),
        refreshToken: refresh.token,
        refreshExpiresAt: expiresAt,
        user: this.toPublicUser(user),
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({
          code: "AUTH_EMAIL_ALREADY_REGISTERED",
          message: "An account with this email already exists.",
        });
      }

      throw error;
    }
  }

  async login(
    dto: LoginDto,
    metadata: AuthRequestMetadata,
  ): Promise<AuthCommandResult> {
    const emailNormalized = this.normalizeEmail(dto.email);

    const user =
      await this.authRepository.findUserByNormalizedEmail(
        emailNormalized,
      );

    if (!user) {
      await this.passwordService.hash(dto.password);
      throw this.invalidCredentials();
    }

    const passwordValid =
      await this.passwordService.verify(
        user.passwordHash,
        dto.password,
      );

    if (!passwordValid) {
      throw this.invalidCredentials();
    }

    if (user.status !== "ACTIVE") {
      throw new ForbiddenException({
        code: "AUTH_ACCOUNT_UNAVAILABLE",
        message: "This account is not available for authentication.",
      });
    }

    const sessionId = randomUUID();

    const refresh =
      this.tokenService.createRefreshToken(sessionId);

    const refreshTokenHash =
      this.tokenService.hashRefreshSecret(refresh.secret);

    const expiresAt = this.createRefreshExpiry();

    await this.authRepository.createSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      expiresAt,
      userAgent: this.normalizeUserAgent(metadata.userAgent),
      ipAddress: this.normalizeIpAddress(metadata.ipAddress),
    });

    const accessToken =
      await this.tokenService.signAccessToken(
        user.id,
        sessionId,
      );

    return {
      accessToken,
      accessTokenExpiresInSeconds:
        this.tokenService.getAccessTtlSeconds(),
      refreshToken: refresh.token,
      refreshExpiresAt: expiresAt,
      user: this.toPublicUser(user),
    };
  }

  async refresh(
    rawRefreshToken: string | undefined,
  ): Promise<AuthCommandResult> {
    const parts =
      this.tokenService.parseRefreshToken(rawRefreshToken);

    if (!parts) {
      throw this.invalidSession();
    }

    const session =
      await this.authRepository.findSessionWithUser(
        parts.sessionId,
      );

    const now = new Date();

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== "ACTIVE"
    ) {
      throw this.invalidSession();
    }

    if (
      !this.tokenService.matchesRefreshSecret(
        session.refreshTokenHash,
        parts.secret,
      )
    ) {
      throw this.invalidSession();
    }

    const nextRefresh =
      this.tokenService.createRefreshToken(session.id);

    const nextRefreshHash =
      this.tokenService.hashRefreshSecret(
        nextRefresh.secret,
      );

    const rotated =
      await this.authRepository.rotateRefreshToken(
        session.id,
        session.userId,
        session.refreshTokenHash,
        nextRefreshHash,
        now,
      );

    if (!rotated) {
      throw this.invalidSession();
    }

    const accessToken =
      await this.tokenService.signAccessToken(
        session.user.id,
        session.id,
      );

    return {
      accessToken,
      accessTokenExpiresInSeconds:
        this.tokenService.getAccessTtlSeconds(),
      refreshToken: nextRefresh.token,
      refreshExpiresAt: session.expiresAt,
      user: this.toPublicUser(session.user),
    };
  }

  async logout(
    rawRefreshToken: string | undefined,
  ): Promise<void> {
    const parts =
      this.tokenService.parseRefreshToken(rawRefreshToken);

    if (!parts) {
      return;
    }

    const refreshTokenHash =
      this.tokenService.hashRefreshSecret(parts.secret);

    await this.authRepository.revokeSession(
      parts.sessionId,
      refreshTokenHash,
      new Date(),
    );
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private createRefreshExpiry(): Date {
    const expiresAt = new Date();

    expiresAt.setUTCDate(
      expiresAt.getUTCDate() + this.refreshTtlDays,
    );

    return expiresAt;
  }

  private normalizeUserAgent(
    userAgent: string | undefined,
  ): string | undefined {
    const value = userAgent?.trim();

    return value ? value.slice(0, 1024) : undefined;
  }

  private normalizeIpAddress(
    ipAddress: string | undefined,
  ): string | undefined {
    const value = ipAddress?.trim();

    return value ? value.slice(0, 64) : undefined;
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    status: string;
    emailVerifiedAt: Date | null;
  }): PublicAuthUser {
    return {
      id: user.id,
      email: user.email,
      status: "ACTIVE",
      emailVerified: user.emailVerifiedAt !== null,
    };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    });
  }

  private invalidSession(): UnauthorizedException {
    return new UnauthorizedException({
      code: "AUTH_SESSION_INVALID",
      message: "Authentication session is invalid or expired.",
    });
  }

  private isUniqueConstraintError(
    error: unknown,
  ): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    );
  }
}