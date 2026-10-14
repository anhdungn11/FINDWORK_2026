import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CertificateQueryDto, ReferenceQueryDto, SkillCategoryQueryDto, SkillQueryDto, WardQueryDto } from "./dto/reference-query.dto";

@Injectable()
export class ReferenceService {
  constructor(private readonly db: PrismaService) {}

  private whereActive(query: ReferenceQueryDto) {
    return query.active === "all" ? {} : { isActive: query.active === "true" };
  }

  private page(query: ReferenceQueryDto) {
    return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
  }

  private result<T>(data: T[], total: number, query: ReferenceQueryDto) {
    return { data, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  }

  async jobCategories(query: ReferenceQueryDto) {
    const where = this.whereActive(query);
    const [data, total] = await Promise.all([
      this.db.jobCategory.findMany({ where, orderBy: [{ sortOrder: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, name: true, isActive: true, sortOrder: true } }),
      this.db.jobCategory.count({ where }),
    ]);
    return this.result(data, total, query);
  }

  async skillCategories(query: SkillCategoryQueryDto) {
    const where = { ...this.whereActive(query), ...(query.parentCode && { parent: { code: query.parentCode } }) };
    const [rows, total] = await Promise.all([
      this.db.skillCategory.findMany({ where, orderBy: [{ sortOrder: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, name: true, isActive: true, sortOrder: true, parent: { select: { code: true } } } }),
      this.db.skillCategory.count({ where }),
    ]);
    return this.result(rows.map(({ parent, ...row }) => ({ ...row, parentCode: parent?.code ?? null })), total, query);
  }

  async skills(query: SkillQueryDto) {
    const where = { ...this.whereActive(query), ...(query.categoryCode && { category: { code: query.categoryCode } }) };
    const [rows, total] = await Promise.all([
      this.db.skill.findMany({ where, orderBy: [{ sortOrder: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, name: true, aliases: true, isActive: true, sortOrder: true, category: { select: { code: true } } } }),
      this.db.skill.count({ where }),
    ]);
    return this.result(rows.map(({ category, ...row }) => ({ ...row, categoryCode: category.code })), total, query);
  }

  async languages(query: ReferenceQueryDto) {
    const where = this.whereActive(query);
    const [data, total] = await Promise.all([
      this.db.language.findMany({ where, orderBy: [{ sortOrder: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, label: true, englishLabel: true, isActive: true, sortOrder: true } }),
      this.db.language.count({ where }),
    ]);
    return this.result(data, total, query);
  }

  async certificates(query: CertificateQueryDto) {
    const where = { ...this.whereActive(query), ...(query.languageCode && { language: { code: query.languageCode } }) };
    const [rows, total] = await Promise.all([
      this.db.languageCertificateType.findMany({ where, orderBy: [{ sortOrder: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, label: true, supportsOverallScore: true, supportsLevel: true, levelOptions: true, scoreFields: true, isActive: true, sortOrder: true, language: { select: { code: true } } } }),
      this.db.languageCertificateType.count({ where }),
    ]);
    return this.result(rows.map(({ language, ...row }) => ({ ...row, languageCode: language.code })), total, query);
  }

  async provinces(query: ReferenceQueryDto) {
    const where = this.whereActive(query);
    const [data, total] = await Promise.all([
      this.db.province.findMany({ where, orderBy: [{ name: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, name: true, divisionType: true, isActive: true } }),
      this.db.province.count({ where }),
    ]);
    return this.result(data, total, query);
  }

  async wards(query: WardQueryDto) {
    const where = { ...this.whereActive(query), ...(query.provinceCode && { province: { code: query.provinceCode } }) };
    const [rows, total] = await Promise.all([
      this.db.ward.findMany({ where, orderBy: [{ name: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, name: true, divisionType: true, codename: true, isActive: true, province: { select: { code: true } } } }),
      this.db.ward.count({ where }),
    ]);
    return this.result(rows.map(({ province, ...row }) => ({ ...row, provinceCode: province.code })), total, query);
  }
}
