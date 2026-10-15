import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsInt, Min } from "class-validator";

export class ImportCandidateOnboardingDto {
  @ApiProperty({ minimum: 1, description: "Current saved draft version" })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({ enum: [true], description: "Acknowledges the private initial profile state" })
  @Equals(true)
  confirmPrivacy!: true;
}
