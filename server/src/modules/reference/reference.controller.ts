import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CertificateQueryDto, ReferenceQueryDto, SkillCategoryQueryDto, SkillQueryDto, WardQueryDto } from "./dto/reference-query.dto";
import { ReferenceService } from "./reference.service";

@ApiTags("Reference")
@Controller("reference")
export class ReferenceController {
  constructor(private readonly reference: ReferenceService) {}

  @Get("job-categories") @ApiOperation({ summary: "List job categories" })
  jobCategories(@Query() query: ReferenceQueryDto) { return this.reference.jobCategories(query); }

  @Get("skill-categories") @ApiOperation({ summary: "List skill categories" })
  skillCategories(@Query() query: SkillCategoryQueryDto) { return this.reference.skillCategories(query); }

  @Get("skills") @ApiOperation({ summary: "List skills" })
  skills(@Query() query: SkillQueryDto) { return this.reference.skills(query); }

  @Get("languages") @ApiOperation({ summary: "List languages" })
  languages(@Query() query: ReferenceQueryDto) { return this.reference.languages(query); }

  @Get("language-certificate-types") @ApiOperation({ summary: "List language certificate types" })
  certificates(@Query() query: CertificateQueryDto) { return this.reference.certificates(query); }

  @Get("provinces") @ApiOperation({ summary: "List provinces" })
  provinces(@Query() query: ReferenceQueryDto) { return this.reference.provinces(query); }

  @Get("wards") @ApiOperation({ summary: "List wards" })
  wards(@Query() query: WardQueryDto) { return this.reference.wards(query); }
}
