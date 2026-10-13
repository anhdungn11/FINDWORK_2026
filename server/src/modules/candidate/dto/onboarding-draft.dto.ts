import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsObject, Max, Min } from "class-validator";

export class SaveCandidateOnboardingDraftDto {
  @ApiProperty({ description: "Seven sections of the draft (JSON object). Never accepts bearer tokens." })
  @IsObject()
  data!: Record<string, unknown>;

  @ApiProperty({ minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  stepIndex!: number;

  @ApiProperty({ minimum: 0, description: "Optimistic version; zero only for a new draft." })
  @IsInt()
  @Min(0)
  version!: number;
}
