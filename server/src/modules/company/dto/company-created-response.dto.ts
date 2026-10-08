import { ApiProperty } from "@nestjs/swagger";

export class CompanyCreatedResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ["ACTIVE", "SUSPENDED", "ARCHIVED"] })
  status!: "ACTIVE" | "SUSPENDED" | "ARCHIVED";

  @ApiProperty({ enum: ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] })
  verificationStatus!: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}
