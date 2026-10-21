import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { CompanyService } from "./company.service";
import { CompanyCreatedResponseDto } from "./dto/company-created-response.dto";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { FeaturedCompanyQueryDto } from "./dto/featured-company-query.dto";
import { PublicCompanyQueryDto } from "./dto/public-company-query.dto";

@ApiTags("Companies")
@Controller("companies")
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @ApiBearerAuth("access-token")
  @UseGuards(AccessTokenGuard)
  @Get("me")
  listMyWorkspace(@CurrentAuth() auth: AuthenticatedPrincipal) {
    return this.companyService.listActiveWorkspace(auth.userId);
  }

  @Get()
  @ApiOperation({ summary: "Discover active companies with a public profile only" })
  listPublic(@Query() query: PublicCompanyQueryDto) {
    return this.companyService.listPublic(query);
  }

  @Get("featured")
  @ApiOperation({ summary: "Discover verified companies with an available published job" })
  listFeatured(@Query() query: FeaturedCompanyQueryDto) {
    return this.companyService.listFeatured(query);
  }

  @Get(":companyId")
  @ApiOperation({ summary: "Read an active company's public profile" })
  getPublic(@Param("companyId", ParseUUIDPipe) companyId: string) {
    return this.companyService.getPublic(companyId);
  }

  @ApiBearerAuth("access-token")
  @ApiCreatedResponse({ type: CompanyCreatedResponseDto })
  @ApiUnauthorizedResponse({ description: "A valid access token is required." })
  @ApiConflictResponse({ description: "Company slug already exists." })
  @UseGuards(AccessTokenGuard)
  @Post()
  create(
    @CurrentAuth() auth: AuthenticatedPrincipal,
    @Body() dto: CreateCompanyDto,
  ): Promise<CompanyCreatedResponseDto> {
    return this.companyService.create(auth.userId, dto);
  }
}
