import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;
const present = (_: unknown, value: unknown) => value !== undefined;

export class AdminPageQueryDto {
  @ApiPropertyOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000) page = 1;
  @ApiPropertyOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class AdminUserQueryDto extends AdminPageQueryDto {
  @ApiPropertyOptional({ enum: ["ACTIVE", "SUSPENDED", "DISABLED"] })
  @ValidateIf(present) @IsIn(["ACTIVE", "SUSPENDED", "DISABLED"])
  status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
  @ApiPropertyOptional() @Transform(trim) @ValidateIf(present) @IsString() @MinLength(2) @MaxLength(100)
  q?: string;
}

export class AdminCompanyQueryDto extends AdminPageQueryDto {
  @ApiPropertyOptional({ enum: ["ACTIVE", "SUSPENDED", "ARCHIVED"] })
  @ValidateIf(present) @IsIn(["ACTIVE", "SUSPENDED", "ARCHIVED"])
  status?: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  @ApiPropertyOptional({ enum: ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] })
  @ValidateIf(present) @IsIn(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"])
  verificationStatus?: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  @ApiPropertyOptional() @Transform(trim) @ValidateIf(present) @IsString() @MinLength(2) @MaxLength(100)
  q?: string;
}

export class AdminJobQueryDto extends AdminPageQueryDto {
  @ApiPropertyOptional({ enum: ["DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "EXPIRED", "ARCHIVED"] })
  @ValidateIf(present) @IsIn(["DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "EXPIRED", "ARCHIVED"])
  status?: "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED" | "EXPIRED" | "ARCHIVED";
  @ApiPropertyOptional() @ValidateIf(present) @IsUUID("4")
  companyId?: string;
}

export class SetUserStatusDto { @IsIn(["ACTIVE", "SUSPENDED"]) status!: "ACTIVE" | "SUSPENDED"; }
export class SetCompanyVerificationDto { @IsIn(["VERIFIED", "REJECTED"]) status!: "VERIFIED" | "REJECTED"; }
export class SetCompanyStatusDto { @IsIn(["ACTIVE", "SUSPENDED"]) status!: "ACTIVE" | "SUSPENDED"; }
