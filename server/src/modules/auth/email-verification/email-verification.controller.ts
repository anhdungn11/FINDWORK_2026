import {
  Body, Controller, HttpCode, HttpStatus, Post, UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { CurrentAuth } from "../decorators/current-auth.decorator";
import { AccessTokenGuard } from "../guards/access-token.guard";
import { AuthOriginGuard } from "../guards/auth-origin.guard";
import type { AuthenticatedPrincipal } from "../types/auth.types";
import { ConfirmEmailVerificationDto } from "./dto/confirm-email-verification.dto";
import { EmailVerificationService } from "./email-verification.service";

@ApiTags("Email Verification")
@Controller("auth/email-verification")
export class EmailVerificationController {
  constructor(private readonly service: EmailVerificationService) {}

  @Post("request")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Request verification; disabled until encrypted delivery is wired" })
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @UseGuards(AccessTokenGuard, AuthOriginGuard, ThrottlerGuard)
  request(@CurrentAuth() auth: AuthenticatedPrincipal): Promise<void> {
    return this.service.request(auth.userId);
  }

  @Post("confirm")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Confirm a single-use email-verification token" })
  @Throttle({ default: { limit: 60, ttl: 600_000 } })
  @UseGuards(AuthOriginGuard, ThrottlerGuard)
  confirm(@Body() dto: ConfirmEmailVerificationDto): Promise<void> {
    return this.service.confirm(dto.token);
  }
}
