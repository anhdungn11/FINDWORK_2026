import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Req, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequireCompanyPermissions } from "../authorization/decorators/require-company-permissions.decorator";
import { CompanyPermissionGuard, type CompanyAuthorizedRequest } from "../authorization/guards/company-permission.guard";
import { RequirePermissions } from "../authorization/decorators/require-permissions.decorator";
import { PermissionGuard, type AuthorizedRequest } from "../authorization/guards/permission.guard";
import { CompanyLegalService } from "./company-legal.service";
import { LegalEvidenceUploadDto, UpdateCompanyLegalDto } from "./dto/company-legal.dto";

function secureDownload(response: Response, mimeType: string) {
  response.setHeader("Content-Type", mimeType);
  response.setHeader("Content-Disposition", "attachment; filename=legal-evidence");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
}

@ApiTags("Company Legal")
@ApiBearerAuth("access-token")
@Controller("companies/:companyId/legal")
@UseGuards(AccessTokenGuard, CompanyPermissionGuard)
export class CompanyLegalController {
  constructor(private readonly legal: CompanyLegalService) {}
  private requireWide(req: CompanyAuthorizedRequest, code: "company.view" | "company.update") {
    if (req.companyAuthorization?.permissions[code]?.scope !== "COMPANY") {
      throw new ForbiddenException({ code: "AUTHORIZATION_COMPANY_SCOPE_REQUIRED" });
    }
  }

  @Get()
  @RequireCompanyPermissions("company.update")
  get(@Param("companyId", ParseUUIDPipe) id: string, @Req() req: CompanyAuthorizedRequest) {
    this.requireWide(req, "company.update");
    return this.legal.get(id);
  }

  @Patch()
  @RequireCompanyPermissions("company.update")
  update(@Param("companyId", ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest, @Body() dto: UpdateCompanyLegalDto) {
    this.requireWide(req, "company.update");
    return this.legal.update(id, auth.userId, dto);
  }

  @Post("evidence")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10_485_760, files: 1 } }))
  @RequireCompanyPermissions("company.update")
  upload(@Param("companyId", ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest, @Body() dto: LegalEvidenceUploadDto,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; originalname: string }) {
    this.requireWide(req, "company.update");
    return this.legal.upload(id, auth.userId, dto, file);
  }

  @Delete("evidence/:evidenceId")
  @HttpCode(200)
  @RequireCompanyPermissions("company.update")
  remove(@Param("companyId", ParseUUIDPipe) id: string, @Param("evidenceId", ParseUUIDPipe) evidenceId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal, @Req() req: CompanyAuthorizedRequest) {
    this.requireWide(req, "company.update");
    return this.legal.remove(id, evidenceId, auth.userId);
  }

  @Get("evidence/:evidenceId")
  @RequireCompanyPermissions("company.update")
  async download(@Param("companyId", ParseUUIDPipe) id: string, @Param("evidenceId", ParseUUIDPipe) evidenceId: string,
    @Req() req: CompanyAuthorizedRequest, @Res({ passthrough: true }) res: Response) {
    this.requireWide(req, "company.update");
    const { bytes, mimeType } = await this.legal.download(id, evidenceId);
    secureDownload(res, mimeType);
    return new StreamableFile(bytes);
  }
}

@ApiTags("Platform Admin")
@ApiBearerAuth("access-token")
@Controller("admin/companies/:companyId/legal")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AdminCompanyLegalController {
  constructor(private readonly legal: CompanyLegalService) {}
  private requireSystem(req: AuthorizedRequest) {
    if (req.authorization?.permissions["company.verify"]?.scope !== "SYSTEM") {
      throw new ForbiddenException({ code: "AUTHORIZATION_SYSTEM_SCOPE_REQUIRED" });
    }
  }

  @Get()
  @RequirePermissions("company.verify")
  get(@Param("companyId", ParseUUIDPipe) id: string, @Req() req: AuthorizedRequest) {
    this.requireSystem(req);
    return this.legal.get(id);
  }

  @Get("evidence/:evidenceId")
  @RequirePermissions("company.verify")
  async download(@Param("companyId", ParseUUIDPipe) id: string, @Param("evidenceId", ParseUUIDPipe) evidenceId: string,
    @Req() req: AuthorizedRequest, @CurrentAuth() auth: AuthenticatedPrincipal,
    @Res({ passthrough: true }) res: Response) {
    this.requireSystem(req);
    const { bytes, mimeType } = await this.legal.download(id, evidenceId);
    await this.legal.auditDownload(auth.userId, id, evidenceId);
    secureDownload(res, mimeType);
    return new StreamableFile(bytes);
  }
}
