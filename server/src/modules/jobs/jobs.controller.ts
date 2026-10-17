import {
  Body, Controller, ForbiddenException, Get, HttpCode, Param,
  ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequireCompanyPermissions } from "../authorization/decorators/require-company-permissions.decorator";
import { CompanyPermissionGuard, type CompanyAuthorizedRequest } from "../authorization/guards/company-permission.guard";
import { CompanyJobQueryDto, CreateJobDto, JobVersionDto, PublicJobQueryDto, UpdateJobDto } from "./dto/job.dto";
import { ReplaceScreeningQuestionsDto } from "./dto/screening-question.dto";
import { JobsService } from "./jobs.service";

function requireCompanyScope(req: CompanyAuthorizedRequest, code: "company.view" | "company.update"): void {
  if (req.companyAuthorization?.permissions[code]?.scope !== "COMPANY") {
    throw new ForbiddenException({ code: "AUTHORIZATION_COMPANY_SCOPE_REQUIRED", message: "A company-wide permission is required." });
  }
}

@ApiTags("Company Jobs")
@ApiBearerAuth("access-token")
@Controller("companies/:companyId/jobs")
@UseGuards(AccessTokenGuard, CompanyPermissionGuard)
export class CompanyJobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post()
  @ApiOperation({ summary: "Create a company-owned draft job" })
  @RequireCompanyPermissions("company.update")
  create(@Param("companyId", ParseUUIDPipe) companyId: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest, @Body() dto: CreateJobDto) {
    requireCompanyScope(req, "company.update");
    return this.jobs.create(companyId, auth.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List company-owned jobs, including drafts" })
  @RequireCompanyPermissions("company.view")
  list(@Param("companyId", ParseUUIDPipe) companyId: string, @Req() req: CompanyAuthorizedRequest,
    @Query() query: CompanyJobQueryDto) {
    requireCompanyScope(req, "company.view");
    return this.jobs.listCompany(companyId, query);
  }

  @Get(":jobId")
  @ApiOperation({ summary: "Read a company-owned job" })
  @RequireCompanyPermissions("company.view")
  get(@Param("companyId", ParseUUIDPipe) companyId: string, @Param("jobId", ParseUUIDPipe) jobId: string,
    @Req() req: CompanyAuthorizedRequest) {
    requireCompanyScope(req, "company.view");
    return this.jobs.getCompany(companyId, jobId);
  }

  @Get(":jobId/screening-questions")
  @ApiOperation({ summary: "List the active screening questions of an owned job" })
  @RequireCompanyPermissions("company.view")
  questions(@Param("companyId", ParseUUIDPipe) companyId: string, @Param("jobId", ParseUUIDPipe) jobId: string,
    @Req() req: CompanyAuthorizedRequest) {
    requireCompanyScope(req, "company.view");
    return this.jobs.listScreeningQuestions(companyId, jobId);
  }

  @Put(":jobId/screening-questions")
  @ApiOperation({ summary: "Replace screening questions on a draft or paused owned job" })
  @RequireCompanyPermissions("company.update")
  replaceQuestions(@Param("companyId", ParseUUIDPipe) companyId: string, @Param("jobId", ParseUUIDPipe) jobId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: CompanyAuthorizedRequest,
    @Body() dto: ReplaceScreeningQuestionsDto) {
    requireCompanyScope(req, "company.update");
    return this.jobs.replaceScreeningQuestions(companyId, jobId, auth.userId, dto);
  }

  @Patch(":jobId")
  @ApiOperation({ summary: "Edit a draft job using optimistic versioning" })
  @RequireCompanyPermissions("company.update")
  update(@Param("companyId", ParseUUIDPipe) companyId: string, @Param("jobId", ParseUUIDPipe) jobId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: CompanyAuthorizedRequest, @Body() dto: UpdateJobDto) {
    requireCompanyScope(req, "company.update");
    return this.jobs.update(companyId, jobId, auth.userId, dto);
  }

  @Post(":jobId/publish") @HttpCode(200)
  @ApiOperation({ summary: "Publish a draft or paused job" })
  @RequireCompanyPermissions("company.update")
  publish(@Param("companyId", ParseUUIDPipe) companyId: string, @Param("jobId", ParseUUIDPipe) jobId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: CompanyAuthorizedRequest, @Body() dto: JobVersionDto) {
    requireCompanyScope(req, "company.update");
    return this.jobs.transition(companyId, jobId, auth.userId, dto.version, "publish");
  }

  @Post(":jobId/pause") @HttpCode(200)
  @ApiOperation({ summary: "Unpublish an active job" })
  @RequireCompanyPermissions("company.update")
  pause(@Param("companyId", ParseUUIDPipe) companyId: string, @Param("jobId", ParseUUIDPipe) jobId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: CompanyAuthorizedRequest, @Body() dto: JobVersionDto) {
    requireCompanyScope(req, "company.update");
    return this.jobs.transition(companyId, jobId, auth.userId, dto.version, "pause");
  }

  @Post(":jobId/close") @HttpCode(200)
  @ApiOperation({ summary: "Close a published or paused job" })
  @RequireCompanyPermissions("company.update")
  close(@Param("companyId", ParseUUIDPipe) companyId: string, @Param("jobId", ParseUUIDPipe) jobId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: CompanyAuthorizedRequest, @Body() dto: JobVersionDto) {
    requireCompanyScope(req, "company.update");
    return this.jobs.transition(companyId, jobId, auth.userId, dto.version, "close");
  }
}

@ApiTags("Jobs")
@Controller("jobs")
export class PublicJobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  @ApiOperation({ summary: "Search available published jobs" })
  list(@Query() query: PublicJobQueryDto) { return this.jobs.listPublic(query); }

  @Get(":jobId")
  @ApiOperation({ summary: "Read an available published job" })
  get(@Param("jobId", ParseUUIDPipe) jobId: string) { return this.jobs.getPublic(jobId); }
}
