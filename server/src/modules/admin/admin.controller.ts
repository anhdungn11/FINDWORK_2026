import { Body, Controller, ForbiddenException, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequirePermissions } from "../authorization/decorators/require-permissions.decorator";
import { PermissionGuard, type AuthorizedRequest } from "../authorization/guards/permission.guard";
import { AdminService } from "./admin.service";
import { AdminCompanyQueryDto, AdminJobQueryDto, AdminPageQueryDto, AdminUserQueryDto, SetCompanyStatusDto, SetCompanyVerificationDto, SetUserStatusDto } from "./dto/admin.dto";

function requireSystem(req: AuthorizedRequest, ...codes: string[]) {
  if (codes.some((code) => req.authorization?.permissions[code]?.scope !== "SYSTEM")) {
    throw new ForbiddenException({ code: "AUTHORIZATION_SYSTEM_SCOPE_REQUIRED", message: "System-level permission is required." });
  }
}

@ApiTags("Platform Admin")
@ApiBearerAuth("access-token")
@Controller("admin")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard")
  @RequirePermissions("user.view", "company.view", "job.view")
  dashboard(@Req() req: AuthorizedRequest) {
    requireSystem(req, "user.view", "company.view", "job.view");
    return this.admin.dashboard();
  }

  @Get("users")
  @RequirePermissions("user.view")
  users(@Req() req: AuthorizedRequest, @Query() query: AdminUserQueryDto) {
    requireSystem(req, "user.view");
    return this.admin.users(query);
  }

  @Get("users/:userId")
  @RequirePermissions("user.view")
  user(@Req() req: AuthorizedRequest, @Param("userId", ParseUUIDPipe) userId: string) {
    requireSystem(req, "user.view");
    return this.admin.user(userId);
  }

  @Patch("users/:userId/status")
  @RequirePermissions("user.update")
  setUserStatus(@Req() req: AuthorizedRequest, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("userId", ParseUUIDPipe) userId: string, @Body() dto: SetUserStatusDto) {
    requireSystem(req, "user.update");
    return this.admin.setUserStatus(auth.userId, userId, dto.status);
  }

  @Post("users/:userId/disable")
  @HttpCode(200)
  @RequirePermissions("user.disable")
  disableUser(@Req() req: AuthorizedRequest, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("userId", ParseUUIDPipe) userId: string) {
    requireSystem(req, "user.disable");
    return this.admin.setUserStatus(auth.userId, userId, "DISABLED");
  }

  @Get("companies")
  @RequirePermissions("company.view")
  companies(@Req() req: AuthorizedRequest, @Query() query: AdminCompanyQueryDto) {
    requireSystem(req, "company.view");
    return this.admin.companies(query);
  }

  @Get("companies/:companyId")
  @RequirePermissions("company.view")
  company(@Req() req: AuthorizedRequest, @Param("companyId", ParseUUIDPipe) companyId: string) {
    requireSystem(req, "company.view");
    return this.admin.company(companyId);
  }

  @Patch("companies/:companyId/verification")
  @RequirePermissions("company.verify")
  verifyCompany(@Req() req: AuthorizedRequest, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("companyId", ParseUUIDPipe) companyId: string, @Body() dto: SetCompanyVerificationDto) {
    requireSystem(req, "company.verify");
    return this.admin.setCompanyVerification(auth.userId, companyId, dto.status, dto.reason);
  }

  @Patch("companies/:companyId/status")
  @RequirePermissions("company.suspend")
  setCompanyStatus(@Req() req: AuthorizedRequest, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("companyId", ParseUUIDPipe) companyId: string, @Body() dto: SetCompanyStatusDto) {
    requireSystem(req, "company.suspend");
    return this.admin.setCompanyStatus(auth.userId, companyId, dto.status);
  }

  @Get("jobs")
  @RequirePermissions("job.view")
  jobs(@Req() req: AuthorizedRequest, @Query() query: AdminJobQueryDto) {
    requireSystem(req, "job.view");
    return this.admin.jobs(query);
  }

  @Get("jobs/:jobId")
  @RequirePermissions("job.view")
  job(@Req() req: AuthorizedRequest, @Param("jobId", ParseUUIDPipe) jobId: string) {
    requireSystem(req, "job.view");
    return this.admin.job(jobId);
  }

  @Post("jobs/:jobId/close")
  @HttpCode(200)
  @RequirePermissions("job.moderate")
  closeJob(@Req() req: AuthorizedRequest, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("jobId", ParseUUIDPipe) jobId: string) {
    requireSystem(req, "job.moderate");
    return this.admin.closeJob(auth.userId, jobId);
  }

  @Get("audit")
  @RequirePermissions("audit.view")
  audits(@Req() req: AuthorizedRequest, @Query() query: AdminPageQueryDto) {
    requireSystem(req, "audit.view");
    return this.admin.audits(query);
  }
}
