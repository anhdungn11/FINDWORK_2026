import { BadRequestException, Controller, ForbiddenException, Get, Param,
  ParseUUIDPipe, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { isUUID } from "class-validator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RequireCompanyPermissions } from "../authorization/decorators/require-company-permissions.decorator";
import { RequirePermissions } from "../authorization/decorators/require-permissions.decorator";
import { RequirePlatformCapability } from "../authorization/decorators/require-platform-capability.decorator";
import { CompanyPermissionGuard, type CompanyAuthorizedRequest } from "../authorization/guards/company-permission.guard";
import { PermissionGuard, type AuthorizedRequest } from "../authorization/guards/permission.guard";
import type { ReportPeriodQuery } from "./report-period";
import { ReportingService } from "./reporting.service";

function requireSystem(req: AuthorizedRequest) {
  if (["user.view", "company.view", "job.view", "audit.view"].some((code) =>
    req.authorization?.permissions[code]?.scope !== "SYSTEM")) {
    throw new ForbiddenException({ code: "AUTHORIZATION_SYSTEM_SCOPE_REQUIRED" });
  }
}

function requireCompany(req: CompanyAuthorizedRequest, companyId: string) {
  if (req.companyAuthorization?.companyId !== companyId ||
      ["company.view", "application.view"].some((code) =>
        req.companyAuthorization?.permissions[code]?.scope !== "COMPANY")) {
    throw new ForbiddenException({ code: "AUTHORIZATION_COMPANY_SCOPE_REQUIRED" });
  }
}

@ApiTags("Admin Reports")
@ApiBearerAuth("access-token")
@Controller("admin/reports")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AdminReportsController {
  constructor(private readonly reports: ReportingService) {}

  @Get("summary")
  @RequirePermissions("user.view", "company.view", "job.view", "audit.view")
  summary(@Req() req: AuthorizedRequest, @Query() query: ReportPeriodQuery) {
    requireSystem(req);
    return this.reports.adminSummary(query);
  }
}

@ApiTags("Company Recruitment Reports")
@ApiBearerAuth("access-token")
@Controller("companies/:companyId/reports")
@UseGuards(AccessTokenGuard, CompanyPermissionGuard)
export class CompanyReportsController {
  constructor(private readonly reports: ReportingService) {}

  @Get("recruitment")
  @RequireCompanyPermissions("company.view", "application.view")
  @RequirePlatformCapability("application.view")
  recruitment(@Param("companyId", ParseUUIDPipe) companyId: string,
    @Req() req: CompanyAuthorizedRequest,
    @Query() query: ReportPeriodQuery & { jobId?: unknown }) {
    requireCompany(req, companyId);
    if (query.jobId !== undefined && (typeof query.jobId !== "string" || !isUUID(query.jobId))) {
      throw new BadRequestException({ code: "INVALID_JOB_ID" });
    }
    return this.reports.companyRecruitment(companyId, query, query.jobId as string | undefined);
  }
}
