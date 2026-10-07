import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequirePermissions } from "../authorization/decorators/require-permissions.decorator";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import { CandidateService } from "./candidate.service";
import { PutCandidateCareerPreferenceDto } from "./dto/career-preference.dto";
import {
  CreateCandidateEducationDto,
  UpdateCandidateEducationDto,
} from "./dto/education.dto";
import {
  CreateCandidateExperienceDto,
  UpdateCandidateExperienceDto,
} from "./dto/experience.dto";
import {
  CreateCandidateLanguageCertificateDto,
  UpdateCandidateLanguageCertificateDto,
} from "./dto/language-certificate.dto";
import {
  CreateCandidateLanguageDto,
  UpdateCandidateLanguageDto,
} from "./dto/language.dto";
import { UpdateCandidatePrivacyDto } from "./dto/privacy.dto";
import {
  CreateCandidateProfileDto,
  UpdateCandidateProfileDto,
} from "./dto/profile.dto";
import {
  CreateCandidateSkillDto,
  UpdateCandidateSkillDto,
} from "./dto/skill.dto";

@ApiTags("Candidate")
@ApiBearerAuth("access-token")
@Controller("candidate")
@UseGuards(AccessTokenGuard)
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Post("profile")
  @ApiOperation({
    summary: "Start candidate context and create the current user's profile",
  })
  createProfile(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: CreateCandidateProfileDto,
  ) {
    return this.candidateService.createProfile(auth.userId, dto);
  }

  @Get("profile")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.view")
  @ApiOperation({ summary: "Get the current candidate profile" })
  getProfile(@CurrentAuth() auth: AuthenticatedPrincipal) {
    return this.candidateService.getProfile(auth.userId);
  }

  @Patch("profile")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Update the current candidate profile" })
  updateProfile(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: UpdateCandidateProfileDto,
  ) {
    return this.candidateService.updateProfile(auth.userId, dto);
  }

  @Get("education")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.view")
  @ApiOperation({ summary: "List the current candidate's education" })
  listEducation(@CurrentAuth() auth: AuthenticatedPrincipal) {
    return this.candidateService.listEducation(auth.userId);
  }

  @Post("education")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Add education to the current candidate profile" })
  createEducation(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: CreateCandidateEducationDto,
  ) {
    return this.candidateService.createEducation(auth.userId, dto);
  }

  @Patch("education/:id")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Update an owned education record" })
  updateEducation(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateEducationDto,
  ) {
    return this.candidateService.updateEducation(auth.userId, id, dto);
  }

  @Delete("education/:id")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Delete an owned education record" })
  deleteEducation(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.candidateService.deleteEducation(auth.userId, id);
  }

  @Get("experience")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.view")
  @ApiOperation({ summary: "List the current candidate's work experience" })
  listExperience(@CurrentAuth() auth: AuthenticatedPrincipal) {
    return this.candidateService.listExperience(auth.userId);
  }

  @Post("experience")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Add work experience to the current candidate profile" })
  createExperience(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: CreateCandidateExperienceDto,
  ) {
    return this.candidateService.createExperience(auth.userId, dto);
  }

  @Patch("experience/:id")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Update an owned experience record" })
  updateExperience(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateExperienceDto,
  ) {
    return this.candidateService.updateExperience(auth.userId, id, dto);
  }

  @Delete("experience/:id")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Delete an owned experience record" })
  deleteExperience(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.candidateService.deleteExperience(auth.userId, id);
  }

  @Get("skills")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.view")
  @ApiOperation({ summary: "List the current candidate's skills" })
  listSkills(@CurrentAuth() auth: AuthenticatedPrincipal) {
    return this.candidateService.listSkills(auth.userId);
  }

  @Post("skills")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Add a skill to the current candidate profile" })
  createSkill(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: CreateCandidateSkillDto,
  ) {
    return this.candidateService.createSkill(auth.userId, dto);
  }

  @Patch("skills/:id")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Update an owned candidate skill" })
  updateSkill(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateSkillDto,
  ) {
    return this.candidateService.updateSkill(auth.userId, id, dto);
  }

  @Delete("skills/:id")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Delete an owned candidate skill" })
  deleteSkill(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.candidateService.deleteSkill(auth.userId, id);
  }

  @Get("languages")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.view")
  @ApiOperation({ summary: "List the current candidate's languages" })
  listLanguages(@CurrentAuth() auth: AuthenticatedPrincipal) {
    return this.candidateService.listLanguages(auth.userId);
  }

  @Post("languages")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Add a language to the current candidate profile" })
  createLanguage(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: CreateCandidateLanguageDto,
  ) {
    return this.candidateService.createLanguage(auth.userId, dto);
  }

  @Patch("languages/:id")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Update an owned candidate language" })
  updateLanguage(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateLanguageDto,
  ) {
    return this.candidateService.updateLanguage(auth.userId, id, dto);
  }

  @Delete("languages/:id")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Delete an owned candidate language" })
  deleteLanguage(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.candidateService.deleteLanguage(auth.userId, id);
  }

  @Post("languages/:languageId/certificates")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Add a certificate to an owned candidate language" })
  createCertificate(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("languageId", ParseUUIDPipe) languageId: string,
    @Body() dto: CreateCandidateLanguageCertificateDto,
  ) {
    return this.candidateService.createCertificate(
      auth.userId,
      languageId,
      dto,
    );
  }

  @Patch("languages/:languageId/certificates/:certificateId")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Update an owned language certificate" })
  updateCertificate(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("languageId", ParseUUIDPipe) languageId: string,
    @Param("certificateId", ParseUUIDPipe) certificateId: string,
    @Body() dto: UpdateCandidateLanguageCertificateDto,
  ) {
    return this.candidateService.updateCertificate(
      auth.userId,
      languageId,
      certificateId,
      dto,
    );
  }

  @Delete("languages/:languageId/certificates/:certificateId")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Delete an owned language certificate" })
  deleteCertificate(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Param("languageId", ParseUUIDPipe) languageId: string,
    @Param("certificateId", ParseUUIDPipe) certificateId: string,
  ) {
    return this.candidateService.deleteCertificate(
      auth.userId,
      languageId,
      certificateId,
    );
  }

  @Get("career-preference")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.view")
  @ApiOperation({ summary: "Get the current candidate's career preference" })
  getCareerPreference(@CurrentAuth() auth: AuthenticatedPrincipal) {
    return this.candidateService.getCareerPreference(auth.userId);
  }

  @Put("career-preference")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Create or atomically replace career preference" })
  putCareerPreference(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: PutCandidateCareerPreferenceDto,
  ) {
    return this.candidateService.putCareerPreference(auth.userId, dto);
  }

  @Get("privacy")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.view")
  @ApiOperation({ summary: "Get the current candidate's privacy settings" })
  getPrivacy(@CurrentAuth() auth: AuthenticatedPrincipal) {
    return this.candidateService.getPrivacy(auth.userId);
  }

  @Patch("privacy")
  @UseGuards(PermissionGuard)
  @RequirePermissions("profile.update")
  @ApiOperation({ summary: "Update the current candidate's privacy settings" })
  updatePrivacy(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: UpdateCandidatePrivacyDto,
  ) {
    return this.candidateService.updatePrivacy(auth.userId, dto);
  }
}
