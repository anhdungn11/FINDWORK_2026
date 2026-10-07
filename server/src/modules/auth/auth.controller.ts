import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
} from "@nestjs/swagger";
import {
  Throttle,
  ThrottlerGuard,
} from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AUTH_REFRESH_COOKIE_NAME } from "./auth.constants";
import { AuthService } from "./auth.service";
import { CurrentAuth } from "./decorators/current-auth.decorator";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AccessTokenGuard } from "./guards/access-token.guard";
import { AuthOriginGuard } from "./guards/auth-origin.guard";
import { AuthCookieService } from "./services/auth-cookie.service";
import type {
  AuthCommandResult,
  AuthenticatedPrincipal,
  AuthResponse,
} from "./types/auth.types";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Throttle({
    default: {
      limit: 5,
      ttl: 600_000,
    },
  })
  @UseGuards(AuthOriginGuard, ThrottlerGuard)
  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.register(
      dto,
      this.getRequestMetadata(request),
    );

    this.setRefreshCookie(response, result);

    return this.toAuthResponse(result);
  }

  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @UseGuards(AuthOriginGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.login(
      dto,
      this.getRequestMetadata(request),
    );

    this.setRefreshCookie(response, result);

    return this.toAuthResponse(result);
  }

  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @UseGuards(AuthOriginGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.refresh(
      this.getRefreshToken(request),
    );

    this.setRefreshCookie(response, result);

    return this.toAuthResponse(result);
  }

  @UseGuards(AuthOriginGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("logout")
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(
      this.getRefreshToken(request),
    );

    this.authCookieService.clearRefreshCookie(response);
  }

  @ApiBearerAuth("access-token")
  @UseGuards(AccessTokenGuard)
  @Get("me")
  me(
    @CurrentAuth() auth: AuthenticatedPrincipal,
  ) {
    return auth.user;
  }

  private setRefreshCookie(
    response: Response,
    result: AuthCommandResult,
  ): void {
    this.authCookieService.setRefreshCookie(
      response,
      result.refreshToken,
      result.refreshExpiresAt,
    );
  }

  private toAuthResponse(
    result: AuthCommandResult,
  ): AuthResponse {
    return {
      accessToken: result.accessToken,
      accessTokenExpiresInSeconds:
        result.accessTokenExpiresInSeconds,
      user: result.user,
    };
  }

  private getRefreshToken(
    request: Request,
  ): string | undefined {
    const cookies = request.cookies as
      | Record<string, unknown>
      | undefined;

    const value = cookies?.[AUTH_REFRESH_COOKIE_NAME];

    return typeof value === "string"
      ? value
      : undefined;
  }

  private getRequestMetadata(request: Request) {
    return {
      userAgent: request.get("user-agent"),
      ipAddress: request.ip,
    };
  }
}