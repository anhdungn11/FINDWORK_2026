import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequireCompanyPermissions } from "../authorization/decorators/require-company-permissions.decorator";
import { CompanyPermissionGuard, type CompanyAuthorizedRequest } from "../authorization/guards/company-permission.guard";
import { CompanyMembersService } from "./company-members.service";
import { TransferCompanyOwnershipDto, UpdateCompanyMemberDto } from "./dto/update-company-member.dto";

function requireCompanyScope(req: CompanyAuthorizedRequest, code: string) {
  if (req.companyAuthorization?.permissions[code]?.scope !== "COMPANY") {
    throw new ForbiddenException({ code: "AUTHORIZATION_COMPANY_SCOPE_REQUIRED", message: "A company-wide permission is required." });
  }
}

@ApiTags("Company Members")
@ApiBearerAuth("access-token")
@Controller("companies/:companyId/members")
@UseGuards(AccessTokenGuard, CompanyPermissionGuard)
export class CompanyMembersController {
  constructor(private readonly members: CompanyMembersService) {}

  @Get()
  @RequireCompanyPermissions("company.member.view")
  list(@Param("companyId", ParseUUIDPipe) companyId: string, @Req() req: CompanyAuthorizedRequest) {
    requireCompanyScope(req, "company.member.view");
    return this.members.list(companyId);
  }

  @Patch(":memberId/role")
  @RequireCompanyPermissions("company.member.update", "company.role.manage")
  updateRole(@Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest, @Body() dto: UpdateCompanyMemberDto) {
    requireCompanyScope(req, "company.member.update");
    requireCompanyScope(req, "company.role.manage");
    return this.members.updateRole(companyId, memberId, auth.userId, dto);
  }

  @Delete(":memberId")
  @HttpCode(200)
  @RequireCompanyPermissions("company.member.remove")
  remove(@Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest) {
    requireCompanyScope(req, "company.member.remove");
    return this.members.remove(companyId, memberId, auth.userId);
  }

  @Post("ownership-transfer")
  @HttpCode(200)
  @RequireCompanyPermissions("company.ownership.transfer")
  transferOwnership(@Param("companyId", ParseUUIDPipe) companyId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: CompanyAuthorizedRequest,
    @Body() dto: TransferCompanyOwnershipDto) {
    requireCompanyScope(req, "company.ownership.transfer");
    return this.members.transferOwnership(companyId, auth.userId, dto.memberId);
  }
}
