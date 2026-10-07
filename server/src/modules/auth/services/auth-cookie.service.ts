import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CookieOptions, Response } from "express";
import { AUTH_REFRESH_COOKIE_NAME } from "../auth.constants";

@Injectable()
export class AuthCookieService {
  private readonly secure: boolean;
  private readonly path: string;

  constructor(configService: ConfigService) {
    this.secure =
      configService.getOrThrow<string>("NODE_ENV") === "production";

    const apiPrefix =
      configService.getOrThrow<string>("API_PREFIX");

    this.path = `/${apiPrefix}/auth`;
  }

  setRefreshCookie(
    response: Response,
    token: string,
    expiresAt: Date,
  ): void {
    response.cookie(
      AUTH_REFRESH_COOKIE_NAME,
      token,
      {
        ...this.baseOptions(),
        expires: expiresAt,
      },
    );
  }

  clearRefreshCookie(response: Response): void {
    response.clearCookie(
      AUTH_REFRESH_COOKIE_NAME,
      this.baseOptions(),
    );
  }

  private baseOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: "lax",
      path: this.path,
    };
  }
}