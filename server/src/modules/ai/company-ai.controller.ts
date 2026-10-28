import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequireCompanyPermissions } from "../authorization/decorators/require-company-permissions.decorator";
import { RequirePlatformCapability } from "../authorization/decorators/require-platform-capability.decorator";
import { CompanyPermissionGuard } from "../authorization/guards/company-permission.guard";
import { CompanyAiService } from "./company-ai.service";
import { DraftJobAiDto, ImproveJobAiDto, ScreeningQuestionsAiDto, InterviewQuestionsAiDto, RecruitmentPlanAiDto } from "./company-ai.dto";

@ApiTags("Company Business AI")
@ApiBearerAuth("access-token")
@Controller("companies/:companyId/ai")
@UseGuards(AccessTokenGuard, CompanyPermissionGuard, ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class CompanyAiController {
  constructor(private readonly ai: CompanyAiService) {}

  @Get("status")
  @RequireCompanyPermissions("company.view")
  @RequirePlatformCapability("ai.business.access")
  status(@Param("companyId", ParseUUIDPipe) companyId: string) {
    return this.ai.status(companyId);
  }

  @Get("quota")
  @RequireCompanyPermissions("company.view")
  @RequirePlatformCapability("ai.business.access")
  quota(@Param("companyId", ParseUUIDPipe) companyId: string) {
    return this.ai.quota(companyId);
  }

  @Post("draft-job") @HttpCode(200)
  @RequireCompanyPermissions("ai.business.generate")
  @RequirePlatformCapability("ai.business.access")
  draftJob(@Param("companyId", ParseUUIDPipe) companyId: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: DraftJobAiDto) {
    return this.ai.generate(companyId, auth.userId, "DRAFT_JOB", { ...dto });
  }

  @Post("improve-job") @HttpCode(200)
  @RequireCompanyPermissions("ai.business.generate")
  @RequirePlatformCapability("ai.business.access")
  improveJob(@Param("companyId", ParseUUIDPipe) companyId: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: ImproveJobAiDto) {
    return this.ai.generate(companyId, auth.userId, "IMPROVE_JOB", { ...dto });
  }

  @Post("screening-questions") @HttpCode(200)
  @RequireCompanyPermissions("ai.business.generate")
  @RequirePlatformCapability("ai.business.access")
  screeningQuestions(@Param("companyId", ParseUUIDPipe) companyId: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: ScreeningQuestionsAiDto) {
    return this.ai.generate(companyId, auth.userId, "SCREENING_QUESTIONS", { ...dto });
  }

  @Post("interview-questions") @HttpCode(200)
  @RequireCompanyPermissions("ai.business.generate")
  @RequirePlatformCapability("ai.business.access")
  interviewQuestions(@Param("companyId", ParseUUIDPipe) companyId: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: InterviewQuestionsAiDto) {
    return this.ai.generate(companyId, auth.userId, "INTERVIEW_QUESTIONS", { ...dto });
  }

  @Post("recruitment-plan") @HttpCode(200)
  @RequireCompanyPermissions("ai.business.generate")
  @RequirePlatformCapability("ai.business.access")
  recruitmentPlan(@Param("companyId", ParseUUIDPipe) companyId: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: RecruitmentPlanAiDto) {
    return this.ai.generate(companyId, auth.userId, "RECRUITMENT_PLAN", { ...dto });
  }
}
