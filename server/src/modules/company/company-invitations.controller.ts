import {
  Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe,
  Post, Req, UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequireCompanyPermissions } from "../authorization/decorators/require-company-permissions.decorator";
import {
  CompanyPermissionGuard, type CompanyAuthorizedRequest,
} from "../authorization/guards/company-permission.guard";
import { CompanyInvitationsService } from "./company-invitations.service";
import { AcceptCompanyInvitationDto } from "./dto/accept-company-invitation.dto";
import { CreateCompanyInvitationDto } from "./dto/create-company-invitation.dto";

function requireCompanyScope(req: CompanyAuthorizedRequest, code: string): void {
  if (req.companyAuthorization?.permissions[code]?.scope !== "COMPANY") {
    throw new ForbiddenException({
      code: "AUTHORIZATION_COMPANY_SCOPE_REQUIRED",
      message: "A company-wide permission is required.",
    });
  }
}

@ApiTags("Company Invitations")
@ApiBearerAuth("access-token")
@Controller("companies/:companyId/invitations")
@UseGuards(AccessTokenGuard, CompanyPermissionGuard)
export class CompanyInvitationsController {
  constructor(private readonly service: CompanyInvitationsService) {}

  @Get()
  @ApiOperation({ summary: "List invitations (no token hashes or secrets)" })
  @RequireCompanyPermissions("company.member.view")
  list(@Param("companyId", ParseUUIDPipe) companyId: string, @Req() req: CompanyAuthorizedRequest) {
    requireCompanyScope(req, "company.member.view");
    return this.service.list(companyId);
  }

  @Post()
  @ApiOperation({ summary: "Create invitation; delivery is unavailable in 4.3C.1 by default" })
  @RequireCompanyPermissions("company.member.invite")
  create(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest,
    @Body() dto: CreateCompanyInvitationDto,
  ) {
    requireCompanyScope(req, "company.member.invite");
    return this.service.create(companyId, auth.userId, dto);
  }

  @Post(":invitationId/revoke")
  @ApiOperation({ summary: "Revoke pending invitation" })
  @RequireCompanyPermissions("company.member.invite")
  revoke(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("invitationId", ParseUUIDPipe) invitationId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest,
  ) {
    requireCompanyScope(req, "company.member.invite");
    return this.service.revoke(companyId, invitationId, auth.userId);
  }
}

@ApiTags("Company Invitations")
@ApiBearerAuth("access-token")
@Controller("company-invitations")
@UseGuards(AccessTokenGuard)
export class CompanyInvitationAcceptanceController {
  constructor(private readonly service: CompanyInvitationsService) {}

  @Post("accept")
  @ApiOperation({ summary: "Accept an invitation as the logged-in invited email; defaults to VIEWER" })
  accept(@CurrentAuth() auth: AuthenticatedPrincipal, @Body() dto: AcceptCompanyInvitationDto) {
    return this.service.accept(auth.userId, dto);
  }
}
