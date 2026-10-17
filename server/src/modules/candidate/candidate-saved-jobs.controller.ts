import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequirePermissions } from "../authorization/decorators/require-permissions.decorator";
import { PermissionGuard, type AuthorizedRequest } from "../authorization/guards/permission.guard";
import { CandidateSavedJobsService } from "./candidate-saved-jobs.service";
import { SaveJobDto, SavedJobsPageQueryDto } from "./dto/saved-job.dto";

function requireOwn(req: AuthorizedRequest): void {
  if (req.authorization?.permissions["saved_job.manage"]?.scope !== "OWN") {
    throw new ForbiddenException({ code: "AUTHORIZATION_OWN_SCOPE_REQUIRED", message: "Own-scope permission is required." });
  }
}

@ApiTags("Candidate Saved Jobs")
@ApiBearerAuth("access-token")
@Controller("candidate/saved-jobs")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class CandidateSavedJobsController {
  constructor(private readonly savedJobs: CandidateSavedJobsService) {}

  @Post()
  @ApiOperation({ summary: "Save an available public job" })
  @RequirePermissions("saved_job.manage")
  save(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest, @Body() dto: SaveJobDto) {
    requireOwn(req);
    return this.savedJobs.save(auth.userId, dto.jobId);
  }

  @Get()
  @ApiOperation({ summary: "List own saved jobs" })
  @RequirePermissions("saved_job.manage")
  list(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest, @Query() query: SavedJobsPageQueryDto) {
    requireOwn(req);
    return this.savedJobs.list(auth.userId, query);
  }

  @Get(":jobId/status")
  @ApiOperation({ summary: "Check own saved state for a job UUID" })
  @RequirePermissions("saved_job.manage")
  status(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest,
    @Param("jobId", ParseUUIDPipe) jobId: string) {
    requireOwn(req);
    return this.savedJobs.status(auth.userId, jobId);
  }

  @Delete(":jobId")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove an owned saved job" })
  @RequirePermissions("saved_job.manage")
  async remove(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest,
    @Param("jobId", ParseUUIDPipe) jobId: string): Promise<void> {
    requireOwn(req);
    await this.savedJobs.remove(auth.userId, jobId);
  }
}
