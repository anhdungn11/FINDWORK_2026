import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
} from "../auth.constants";
import type {
  AccessTokenPayload,
  RefreshTokenParts,
} from "../types/auth.types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly accessTtlSeconds: number;
  private readonly refreshPepper: string;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.accessSecret =
      configService.getOrThrow<string>("JWT_ACCESS_SECRET");

    this.accessTtlSeconds =
      configService.getOrThrow<number>("JWT_ACCESS_TTL_SECONDS");

    this.refreshPepper =
      configService.getOrThrow<string>("REFRESH_TOKEN_PEPPER");
  }

  getAccessTtlSeconds(): number {
    return this.accessTtlSeconds;
  }

  async signAccessToken(
    userId: string,
    sessionId: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        sid: sessionId,
      },
      {
        secret: this.accessSecret,
        algorithm: "HS256",
        expiresIn: this.accessTtlSeconds,
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
      },
    );
  }

  async verifyAccessToken(
    token: string,
  ): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: this.accessSecret,
      algorithms: ["HS256"],
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
    });
  }

  createRefreshToken(sessionId: string): {
    token: string;
    secret: string;
  } {
    const secret = randomBytes(32).toString("base64url");

    return {
      token: `${sessionId}.${secret}`,
      secret,
    };
  }

  hashRefreshSecret(secret: string): string {
    return createHmac("sha256", this.refreshPepper)
      .update(secret)
      .digest("base64url");
  }

  matchesRefreshSecret(
    storedHash: string,
    secret: string,
  ): boolean {
    const suppliedHash = this.hashRefreshSecret(secret);

    const storedBuffer = Buffer.from(storedHash);
    const suppliedBuffer = Buffer.from(suppliedHash);

    if (storedBuffer.length !== suppliedBuffer.length) {
      return false;
    }

    return timingSafeEqual(storedBuffer, suppliedBuffer);
  }

  parseRefreshToken(
    token: string | undefined,
  ): RefreshTokenParts | null {
    if (!token) {
      return null;
    }

    const separator = token.indexOf(".");

    if (
      separator <= 0 ||
      separator !== token.lastIndexOf(".")
    ) {
      return null;
    }

    const sessionId = token.slice(0, separator);
    const secret = token.slice(separator + 1);

    if (!UUID_PATTERN.test(sessionId) || secret.length < 32) {
      return null;
    }

    return {
      sessionId,
      secret,
    };
  }
}