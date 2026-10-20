import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { publicJobVisibility } from "../jobs/public-job-visibility";
import type { CareerCategoriesQueryDto, CareerCategoriesResponseDto } from "./dto/career-categories.dto";

@Injectable()
export class CareerDiscoveryService {
  constructor(private readonly db: PrismaService) {}

  async categories(query: CareerCategoriesQueryDto): Promise<CareerCategoriesResponseDto> {
    const where: Prisma.JobCategoryWhereInput = {
      isActive: true,
      ...(query.q && { OR: [
        { name: { contains: query.q, mode: "insensitive" } },
        { code: { contains: query.q, mode: "insensitive" } },
      ] }),
    };
    const [categories, total] = await Promise.all([
      this.db.jobCategory.findMany({
        where,
        select: { id: true, code: true, name: true, isActive: true, sortOrder: true },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.jobCategory.count({ where }),
    ]);

    // Count only the current page's categories. The timestamp is shared by every
    // visibility condition, including publication and expiration boundaries.
    const now = new Date();
    const counts = categories.length === 0 ? [] : await this.db.job.groupBy({
      by: ["categoryId"],
      where: {
        ...publicJobVisibility(now),
        company: { status: "ACTIVE" },
        categoryId: { in: categories.map((category) => category.id) },
      },
      _count: { _all: true },
    });
    const countsByCategory = new Map(counts.map((row) => [row.categoryId, row._count._all]));

    return {
      data: categories.map((category) => ({
        ...category,
        publishedJobCount: countsByCategory.get(category.id) ?? 0,
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }
}
