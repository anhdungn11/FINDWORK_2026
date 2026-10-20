import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CareerDiscoveryService } from "./career-discovery.service";
import { CareerCategoriesQueryDto, CareerCategoriesResponseDto } from "./dto/career-categories.dto";

@ApiTags("Career Discovery")
@Controller("career")
export class CareerDiscoveryController {
  constructor(private readonly discovery: CareerDiscoveryService) {}

  @Get("categories")
  @ApiOperation({ summary: "Browse active job categories with current public job counts" })
  @ApiOkResponse({ type: CareerCategoriesResponseDto })
  categories(@Query() query: CareerCategoriesQueryDto): Promise<CareerCategoriesResponseDto> {
    return this.discovery.categories(query);
  }
}
