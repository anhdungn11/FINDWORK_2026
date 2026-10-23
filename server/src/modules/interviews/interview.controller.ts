import { Body, Controller, ForbiddenException, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { AccountTypeGuard, RequireAccountTypes } from "../auth/guards/account-type.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequireCompanyPermissions } from "../authorization/decorators/require-company-permissions.decorator";
import { CompanyPermissionGuard, type CompanyAuthorizedRequest } from "../authorization/guards/company-permission.guard";
import { RequirePermissions } from "../authorization/decorators/require-permissions.decorator";
import { PermissionGuard, type AuthorizedRequest } from "../authorization/guards/permission.guard";
import { RescheduleInterviewDto, ScheduleInterviewDto } from "./interview.dto";
import { InterviewService } from "./interview.service";

function requireCompany(req: CompanyAuthorizedRequest, code: "application.view" | "application.review") {
  if (req.companyAuthorization?.permissions[code]?.scope !== "COMPANY") {
    throw new ForbiddenException({ code: "AUTHORIZATION_COMPANY_SCOPE_REQUIRED" });
  }
}

@ApiTags("Interviews")
@ApiBearerAuth("access-token")
@Controller("companies/:companyId/applications/:applicationId/interviews")
@UseGuards(AccessTokenGuard, CompanyPermissionGuard)
export class CompanyApplicationInterviewsController {
  constructor(private readonly interviews: InterviewService) {}

  @Post()
  @RequireCompanyPermissions("application.review")
  schedule(@Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: CompanyAuthorizedRequest,
    @Body() dto: ScheduleInterviewDto) {
    requireCompany(req, "application.review");
    return this.interviews.schedule(companyId, applicationId, auth.userId, dto);
  }

  @Get()
  @RequireCompanyPermissions("application.view")
  list(@Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("applicationId", ParseUUIDPipe) applicationId: string, @Req() req: CompanyAuthorizedRequest) {
    requireCompany(req, "application.view");
    return this.interviews.listCompany(companyId, applicationId);
  }
}

@ApiTags("Interviews")
@ApiBearerAuth("access-token")
@Controller("companies/:companyId/interviews")
@UseGuards(AccessTokenGuard, CompanyPermissionGuard)
export class CompanyInterviewsController {
  constructor(private readonly interviews: InterviewService) {}
  @Patch(":interviewId/cancel") @HttpCode(200)
  @RequireCompanyPermissions("application.review")
  cancel(@Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("interviewId", ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest) {
    requireCompany(req, "application.review");
    return this.interviews.updateStatus(companyId, id, auth.userId, "cancel");
  }
  @Patch(":interviewId/complete") @HttpCode(200)
  @RequireCompanyPermissions("application.review")
  complete(@Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("interviewId", ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest) {
    requireCompany(req, "application.review");
    return this.interviews.updateStatus(companyId, id, auth.userId, "complete");
  }
  @Patch(":interviewId/reschedule")
  @RequireCompanyPermissions("application.review")
  reschedule(@Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("interviewId", ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest, @Body() dto: RescheduleInterviewDto) {
    requireCompany(req, "application.review");
    return this.interviews.updateStatus(companyId, id, auth.userId, "reschedule", dto.scheduledAt);
  }
}

@ApiTags("Candidate Interviews")
@ApiBearerAuth("access-token")
@Controller("candidate/applications/:applicationId/interviews")
@UseGuards(AccessTokenGuard, AccountTypeGuard, PermissionGuard)
@RequireAccountTypes("CANDIDATE", "LEGACY_UNCLASSIFIED")
export class CandidateInterviewsController {
  constructor(private readonly interviews: InterviewService) {}
  @Get()
  @RequirePermissions("application.view")
  list(@Param("applicationId", ParseUUIDPipe) applicationId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest) {
    if (req.authorization?.permissions["application.view"]?.scope !== "OWN") {
      throw new ForbiddenException({ code: "AUTHORIZATION_OWN_SCOPE_REQUIRED" });
    }
    return this.interviews.listCandidate(auth.userId, applicationId);
  }
}
