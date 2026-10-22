import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { AccountTypeGuard, RequireAccountTypes } from "../auth/guards/account-type.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequireCompanyPermissions } from "../authorization/decorators/require-company-permissions.decorator";
import { RequirePermissions } from "../authorization/decorators/require-permissions.decorator";
import { CompanyPermissionGuard, type CompanyAuthorizedRequest } from "../authorization/guards/company-permission.guard";
import { PermissionGuard, type AuthorizedRequest } from "../authorization/guards/permission.guard";
import { ApplicationsService } from "./applications.service";
import { ApplicationPageQueryDto, AssignApplicationDto, ReviewApplicationDto, SubmitApplicationDto } from "./dto/application.dto";

function requireOwn(req: AuthorizedRequest, code: "application.create" | "application.view") {
  if (req.authorization?.permissions[code]?.scope !== "OWN") {
    throw new ForbiddenException({ code: "AUTHORIZATION_OWN_SCOPE_REQUIRED", message: "Own-scope permission is required." });
  }
}
function requireCompany(req: CompanyAuthorizedRequest, code: "application.view" | "application.review") {
  if (req.companyAuthorization?.permissions[code]?.scope !== "COMPANY") {
    throw new ForbiddenException({ code: "AUTHORIZATION_COMPANY_SCOPE_REQUIRED", message: "Company-wide permission is required." });
  }
}

@ApiTags("Candidate Applications")
@ApiBearerAuth("access-token")
@Controller()
@UseGuards(AccessTokenGuard, AccountTypeGuard, PermissionGuard)
@RequireAccountTypes("CANDIDATE", "LEGACY_UNCLASSIFIED")
export class CandidateApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post("jobs/:jobId/applications")
  @RequirePermissions("application.create")
  submit(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest,
    @Param("jobId", ParseUUIDPipe) jobId: string, @Body() dto: SubmitApplicationDto) {
    requireOwn(req, "application.create");
    return this.applications.submit(auth.userId, jobId, dto);
  }

  @Get("candidate/applications")
  @RequirePermissions("application.view")
  list(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest, @Query() query: ApplicationPageQueryDto) {
    requireOwn(req, "application.view");
    return this.applications.listCandidate(auth.userId, query);
  }

  @Get("candidate/applications/:applicationId")
  @RequirePermissions("application.view")
  get(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest,
    @Param("applicationId", ParseUUIDPipe) applicationId: string) {
    requireOwn(req, "application.view");
    return this.applications.getCandidate(auth.userId, applicationId);
  }
}

@ApiTags("Company Applications")
@ApiBearerAuth("access-token")
@Controller("companies/:companyId/jobs/:jobId/applications")
@UseGuards(AccessTokenGuard, CompanyPermissionGuard)
export class CompanyApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  @RequireCompanyPermissions("application.view")
  list(@Param("companyId", ParseUUIDPipe) companyId: string, @Param("jobId", ParseUUIDPipe) jobId: string,
    @Req() req: CompanyAuthorizedRequest, @Query() query: ApplicationPageQueryDto) {
    requireCompany(req, "application.view");
    return this.applications.listCompany(companyId, jobId, query);
  }

  @Get(":applicationId")
  @RequireCompanyPermissions("application.view")
  get(@Param("companyId", ParseUUIDPipe) companyId: string, @Param("jobId", ParseUUIDPipe) jobId: string,
    @Param("applicationId", ParseUUIDPipe) applicationId: string, @Req() req: CompanyAuthorizedRequest) {
    requireCompany(req, "application.view");
    return this.applications.getCompany(companyId, jobId, applicationId);
  }

  @Patch(":applicationId/status")
  @RequireCompanyPermissions("application.review")
  review(@Param("companyId", ParseUUIDPipe) companyId: string, @Param("jobId", ParseUUIDPipe) jobId: string,
    @Param("applicationId", ParseUUIDPipe) applicationId: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest, @Body() dto: ReviewApplicationDto) {
    requireCompany(req, "application.review");
    return this.applications.review(companyId, jobId, applicationId, auth.userId, dto);
  }

  @Patch(":applicationId/assignment")
  @RequireCompanyPermissions("application.review")
  assign(@Param("companyId", ParseUUIDPipe) companyId: string, @Param("jobId", ParseUUIDPipe) jobId: string,
    @Param("applicationId", ParseUUIDPipe) applicationId: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest, @Body() dto: AssignApplicationDto) {
    requireCompany(req, "application.review");
    return this.applications.assign(companyId, jobId, applicationId, auth.userId, dto);
  }
}
