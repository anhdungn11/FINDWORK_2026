import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentAuth } from "../auth/decorators/current-auth.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { AuthenticatedPrincipal } from "../auth/types/auth.types";
import { CompanyService } from "./company.service";
import { CompanyCreatedResponseDto } from "./dto/company-created-response.dto";
import { CreateCompanyDto } from "./dto/create-company.dto";

@ApiTags("Companies")
@Controller("companies")
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

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
