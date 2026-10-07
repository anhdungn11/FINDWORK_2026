import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthService, type HealthResponse } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Check API and PostgreSQL connectivity" })
  @ApiOkResponse({
    schema: {
      example: {
        status: "ok",
        database: "up",
        timestamp: "2026-10-05T14:00:00.000Z",
      },
    },
  })
  check(): Promise<HealthResponse> {
    return this.healthService.check();
  }
}
