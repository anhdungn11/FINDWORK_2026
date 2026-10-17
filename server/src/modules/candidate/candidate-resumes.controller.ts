import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards, ForbiddenException } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequirePermissions } from "../authorization/decorators/require-permissions.decorator";
import { PermissionGuard, type AuthorizedRequest } from "../authorization/guards/permission.guard";
import { CandidateResumesService } from "./candidate-resumes.service";
import { CreateBuilderResumeDto, UpdateBuilderResumeDto } from "./dto/create-builder-resume.dto";

function requireOwn(req: AuthorizedRequest, permission: "resume.create" | "resume.view" | "resume.update"): void {
  if (req.authorization?.permissions[permission]?.scope !== "OWN") {
    throw new ForbiddenException({ code: "AUTHORIZATION_OWN_SCOPE_REQUIRED", message: "Own-scope permission is required." });
  }
}

@ApiTags("Candidate Resumes")
@ApiBearerAuth("access-token")
@Controller("candidate/resumes")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class CandidateResumesController {
  constructor(private readonly resumes: CandidateResumesService) {}

  @Post()
  @ApiOperation({ summary: "Persist a builder resume; no file upload or attachment" })
  @RequirePermissions("resume.create")
  create(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest, @Body() dto: CreateBuilderResumeDto) {
    requireOwn(req, "resume.create");
    return this.resumes.create(auth.userId, dto);
  }

  @Patch(":resumeId")
  @ApiOperation({ summary: "Save the next version of an owned builder resume" })
  @RequirePermissions("resume.update")
  update(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest,
    @Param("resumeId", ParseUUIDPipe) resumeId: string, @Body() dto: UpdateBuilderResumeDto) {
    requireOwn(req, "resume.update");
    return this.resumes.update(auth.userId, resumeId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List own persisted resumes" })
  @RequirePermissions("resume.view")
  list(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest) {
    requireOwn(req, "resume.view");
    return this.resumes.list(auth.userId);
  }

  @Get(":resumeId")
  @ApiOperation({ summary: "Read own builder resume content" })
  @RequirePermissions("resume.view")
  get(@CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: AuthorizedRequest,
    @Param("resumeId", ParseUUIDPipe) resumeId: string) {
    requireOwn(req, "resume.view");
    return this.resumes.get(auth.userId, resumeId);
  }
}
