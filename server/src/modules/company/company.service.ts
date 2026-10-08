import { ConflictException, Injectable } from "@nestjs/common";
import { CompanyRepository } from "./company.repository";
import type { CreateCompanyDto } from "./dto/create-company.dto";

@Injectable()
export class CompanyService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async create(actorUserId: string, dto: CreateCompanyDto) {
    try {
      return await this.companyRepository.createCompanyWithOwner({
        actorUserId,
        name: dto.name,
        slug: dto.slug,
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        const target = this.uniqueConstraintTarget(error);
        const slugConflict = target.includes("slug");
        throw new ConflictException({
          code: slugConflict ? "COMPANY_SLUG_ALREADY_EXISTS" : "COMPANY_CONFLICT",
          message: slugConflict
            ? "A company with this slug already exists."
            : "Company creation conflicts with an existing record.",
        });
      }
      throw error;
    }
  }

  private uniqueConstraintTarget(error: unknown): string {
    if (typeof error !== "object" || error === null || !("meta" in error)) {
      return "";
    }
    const metadata = (error as { meta?: unknown }).meta;
    if (typeof metadata !== "object" || metadata === null || !("target" in metadata)) {
      return "";
    }
    const target = (metadata as { target?: unknown }).target;
    return typeof target === "string"
      ? target.toLowerCase()
      : Array.isArray(target)
        ? target.map(String).join(",").toLowerCase()
        : "";
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    );
  }
}
