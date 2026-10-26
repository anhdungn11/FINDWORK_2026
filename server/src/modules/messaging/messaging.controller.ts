import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { AccountTypeGuard, RequireAccountTypes } from "../auth/guards/account-type.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequireCompanyPermissions } from "../authorization/decorators/require-company-permissions.decorator";
import { RequirePermissions } from "../authorization/decorators/require-permissions.decorator";
import { CompanyPermissionGuard, type CompanyAuthorizedRequest } from "../authorization/guards/company-permission.guard";
import { PermissionGuard, type AuthorizedRequest } from "../authorization/guards/permission.guard";
import { MessagingPageDto, SendApplicationMessageDto } from "./messaging.dto";
import { MessagingService } from "./messaging.service";

function own(req: AuthorizedRequest) {
  if (req.authorization?.permissions["application.view"]?.scope !== "OWN") {
    throw new ForbiddenException({ code: "AUTHORIZATION_OWN_SCOPE_REQUIRED" });
  }
}
function company(req: CompanyAuthorizedRequest, permission: "application.view" | "application.review") {
  if (req.companyAuthorization?.permissions[permission]?.scope !== "COMPANY") {
    throw new ForbiddenException({ code: "AUTHORIZATION_COMPANY_SCOPE_REQUIRED" });
  }
}

@ApiTags("Candidate Messaging")
@ApiBearerAuth("access-token")
@Controller("candidate/conversations")
@UseGuards(AccessTokenGuard, AccountTypeGuard, PermissionGuard)
@RequireAccountTypes("CANDIDATE", "LEGACY_UNCLASSIFIED")
export class CandidateMessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get() @RequirePermissions("application.view")
  list(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest, @Query() query: MessagingPageDto) {
    own(req); return this.messaging.list("CANDIDATE", auth.userId, query);
  }
  @Get(":applicationId/messages") @RequirePermissions("application.view")
  messages(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest,
    @Param("applicationId", ParseUUIDPipe) id: string, @Query() query: MessagingPageDto) {
    own(req); return this.messaging.messages("CANDIDATE", auth.userId, id, query);
  }
  @Post(":applicationId/messages") @RequirePermissions("application.view")
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) @UseGuards(ThrottlerGuard)
  send(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest,
    @Param("applicationId", ParseUUIDPipe) id: string, @Body() dto: SendApplicationMessageDto) {
    own(req); return this.messaging.send("CANDIDATE", auth.userId, id, dto.body);
  }
  @Post(":applicationId/read") @RequirePermissions("application.view")
  read(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest,
    @Param("applicationId", ParseUUIDPipe) id: string) {
    own(req); return this.messaging.markRead("CANDIDATE", auth.userId, id);
  }
}

@ApiTags("Company Messaging")
@ApiBearerAuth("access-token")
@Controller("companies/:companyId/conversations")
@UseGuards(AccessTokenGuard, CompanyPermissionGuard)
export class CompanyMessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get() @RequireCompanyPermissions("application.view")
  list(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: CompanyAuthorizedRequest,
    @Param("companyId", ParseUUIDPipe) companyId: string, @Query() query: MessagingPageDto) {
    company(req, "application.view"); return this.messaging.list("COMPANY", auth.userId, query, companyId);
  }
  @Get(":applicationId/messages") @RequireCompanyPermissions("application.view")
  messages(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: CompanyAuthorizedRequest,
    @Param("companyId", ParseUUIDPipe) companyId: string, @Param("applicationId", ParseUUIDPipe) id: string,
    @Query() query: MessagingPageDto) {
    company(req, "application.view"); return this.messaging.messages("COMPANY", auth.userId, id, query, companyId);
  }
  @Post(":applicationId/messages") @RequireCompanyPermissions("application.review")
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) @UseGuards(ThrottlerGuard)
  send(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: CompanyAuthorizedRequest,
    @Param("companyId", ParseUUIDPipe) companyId: string, @Param("applicationId", ParseUUIDPipe) id: string,
    @Body() dto: SendApplicationMessageDto) {
    company(req, "application.review"); return this.messaging.send("COMPANY", auth.userId, id, dto.body, companyId);
  }
  @Post(":applicationId/read") @RequireCompanyPermissions("application.view")
  read(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: CompanyAuthorizedRequest,
    @Param("companyId", ParseUUIDPipe) companyId: string, @Param("applicationId", ParseUUIDPipe) id: string) {
    company(req, "application.view"); return this.messaging.markRead("COMPANY", auth.userId, id, companyId);
  }
}
