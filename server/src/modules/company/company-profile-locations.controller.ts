import {
  Body, Controller, Delete, ForbiddenException, Get, HttpCode,
  Param, ParseUUIDPipe, Patch, Post, Put, Req, UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { RequireCompanyPermissions } from "../authorization/decorators/require-company-permissions.decorator";
import {
  CompanyPermissionGuard, type CompanyAuthorizedRequest,
} from "../authorization/guards/company-permission.guard";
import { CompanyProfileLocationsService } from "./company-profile-locations.service";
import { CreateCompanyLocationDto } from "./dto/create-company-location.dto";
import { UpdateCompanyLocationDto } from "./dto/update-company-location.dto";
import { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";

type CompanyPermission = "company.view" | "company.update";

@ApiTags("Companies")
@ApiBearerAuth("access-token")
@Controller("companies/:companyId")
@UseGuards(AccessTokenGuard, CompanyPermissionGuard)
export class CompanyProfileLocationsController {
  constructor(private readonly service: CompanyProfileLocationsService) {}

  private requireCompanyWide(request: CompanyAuthorizedRequest, code: CompanyPermission): void {
    if (request.companyAuthorization?.permissions[code]?.scope !== "COMPANY") {
      throw new ForbiddenException({
        code: "AUTHORIZATION_COMPANY_SCOPE_REQUIRED",
        message: "A company-wide permission is required.",
      });
    }
  }

  @Get("profile")
  @ApiOperation({ summary: "Read company profile" })
  @RequireCompanyPermissions("company.view")
  getProfile(@Param("companyId", ParseUUIDPipe) companyId: string, @Req() req: CompanyAuthorizedRequest) {
    this.requireCompanyWide(req, "company.view");
    return this.service.getProfile(companyId);
  }

  @Patch("profile")
  @ApiOperation({ summary: "Update company profile" })
  @RequireCompanyPermissions("company.update")
  updateProfile(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest,
    @Body() dto: UpdateCompanyProfileDto,
  ) {
    this.requireCompanyWide(req, "company.update");
    return this.service.updateProfile(companyId, auth.userId, dto);
  }

  @Get("locations")
  @ApiOperation({ summary: "List company locations" })
  @RequireCompanyPermissions("company.view")
  listLocations(@Param("companyId", ParseUUIDPipe) companyId: string, @Req() req: CompanyAuthorizedRequest) {
    this.requireCompanyWide(req, "company.view");
    return this.service.listLocations(companyId);
  }

  @Get("locations/:locationId")
  @ApiOperation({ summary: "Read company location" })
  @RequireCompanyPermissions("company.view")
  getLocation(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("locationId", ParseUUIDPipe) locationId: string,
    @Req() req: CompanyAuthorizedRequest,
  ) {
    this.requireCompanyWide(req, "company.view");
    return this.service.getLocation(companyId, locationId);
  }

  @Post("locations")
  @ApiOperation({ summary: "Create company location" })
  @RequireCompanyPermissions("company.update")
  createLocation(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest,
    @Body() dto: CreateCompanyLocationDto,
  ) {
    this.requireCompanyWide(req, "company.update");
    return this.service.createLocation(companyId, auth.userId, dto);
  }

  @Patch("locations/:locationId")
  @ApiOperation({ summary: "Update company location" })
  @RequireCompanyPermissions("company.update")
  updateLocation(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("locationId", ParseUUIDPipe) locationId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest,
    @Body() dto: UpdateCompanyLocationDto,
  ) {
    this.requireCompanyWide(req, "company.update");
    return this.service.updateLocation(companyId, locationId, auth.userId, dto);
  }

  @Put("locations/:locationId/headquarters")
  @ApiOperation({ summary: "Transfer company headquarters" })
  @RequireCompanyPermissions("company.update")
  promoteHeadquarters(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("locationId", ParseUUIDPipe) locationId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest,
  ) {
    this.requireCompanyWide(req, "company.update");
    return this.service.promoteHeadquarters(companyId, locationId, auth.userId);
  }

  @Delete("locations/:locationId")
  @ApiOperation({ summary: "Delete company location" })
  @HttpCode(200)
  @RequireCompanyPermissions("company.update")
  deleteLocation(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("locationId", ParseUUIDPipe) locationId: string,
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Req() req: CompanyAuthorizedRequest,
  ) {
    this.requireCompanyWide(req, "company.update");
    return this.service.deleteLocation(companyId, locationId, auth.userId);
  }
}
