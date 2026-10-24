import { Injectable } from "@nestjs/common";
import { isISO31661Alpha2 } from "class-validator";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CertificateQueryDto, LocationQueryDto, ReferenceQueryDto, SkillCategoryQueryDto, SkillQueryDto, WardQueryDto } from "./dto/reference-query.dto";

function searchKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d").toLocaleLowerCase("vi").trim();
}

const countryNames = new Intl.DisplayNames(["vi"], { type: "region" });
const englishCountryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countries = Array.from({ length: 26 * 26 }, (_, i) => String.fromCharCode(65 + Math.floor(i / 26), 65 + i % 26))
  .filter((code) => isISO31661Alpha2(code))
  .map((code) => ({ code, name: countryNames.of(code) ?? code, englishName: englishCountryNames.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name, "vi") || a.code.localeCompare(b.code));

@Injectable()
export class ReferenceService {
  constructor(private readonly db: PrismaService) {}

  private whereActive() {
    return { isActive: true };
  }

  private page(query: ReferenceQueryDto) {
    return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
  }

  private result<T>(data: T[], total: number, query: ReferenceQueryDto) {
    return { data, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  }

  async jobCategories(query: ReferenceQueryDto) {
    const where = this.whereActive();
    const [data, total] = await Promise.all([
      this.db.jobCategory.findMany({ where, orderBy: [{ sortOrder: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, name: true, isActive: true, sortOrder: true } }),
      this.db.jobCategory.count({ where }),
    ]);
    return this.result(data, total, query);
  }

  async skillCategories(query: SkillCategoryQueryDto) {
    const where = { ...this.whereActive(), ...(query.parentCode
      ? { parent: { code: query.parentCode, isActive: true } }
      : { OR: [{ parentId: null }, { parent: { isActive: true } }] }) };
    const [rows, total] = await Promise.all([
      this.db.skillCategory.findMany({ where, orderBy: [{ sortOrder: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, name: true, isActive: true, sortOrder: true, parent: { select: { code: true } } } }),
      this.db.skillCategory.count({ where }),
    ]);
    return this.result(rows.map(({ parent, ...row }) => ({ ...row, parentCode: parent?.code ?? null })), total, query);
  }

  async skills(query: SkillQueryDto) {
    const where = { ...this.whereActive(), category: { isActive: true, ...(query.categoryCode && { code: query.categoryCode }) } };
    const [rows, total] = await Promise.all([
      this.db.skill.findMany({ where, orderBy: [{ sortOrder: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, name: true, aliases: true, isActive: true, sortOrder: true, category: { select: { code: true } } } }),
      this.db.skill.count({ where }),
    ]);
    return this.result(rows.map(({ category, ...row }) => ({ ...row, categoryCode: category.code })), total, query);
  }

  async languages(query: ReferenceQueryDto) {
    const where = this.whereActive();
    const [data, total] = await Promise.all([
      this.db.language.findMany({ where, orderBy: [{ sortOrder: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, label: true, englishLabel: true, isActive: true, sortOrder: true } }),
      this.db.language.count({ where }),
    ]);
    return this.result(data, total, query);
  }

  async certificates(query: CertificateQueryDto) {
    const where = { ...this.whereActive(), language: { isActive: true, ...(query.languageCode && { code: query.languageCode }) } };
    const [rows, total] = await Promise.all([
      this.db.languageCertificateType.findMany({ where, orderBy: [{ sortOrder: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, label: true, supportsOverallScore: true, supportsLevel: true, levelOptions: true, scoreFields: true, isActive: true, sortOrder: true, language: { select: { code: true } } } }),
      this.db.languageCertificateType.count({ where }),
    ]);
    return this.result(rows.map(({ language, ...row }) => ({ ...row, languageCode: language.code })), total, query);
  }

  countries(query: LocationQueryDto) {
    const key = query.q ? searchKey(query.q) : null;
    const rows = key ? countries.filter((row) => row.code.toLowerCase().includes(key) ||
      searchKey(row.name).includes(key) || searchKey(row.englishName).includes(key)) : countries;
    return this.result(rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize), rows.length, query);
  }

  async provinces(query: LocationQueryDto) {
    const where = this.whereActive();
    if (query.q) {
      const key = searchKey(query.q);
      const rows = await this.db.province.findMany({ where, orderBy: [{ name: "asc" }, { code: "asc" }],
        select: { id: true, code: true, name: true, divisionType: true, isActive: true } });
      const matches = rows.filter((row) => searchKey(row.name).includes(key) || row.code.includes(key));
      return this.result(matches.slice((query.page - 1) * query.pageSize, query.page * query.pageSize), matches.length, query);
    }
    const [data, total] = await Promise.all([
      this.db.province.findMany({ where, orderBy: [{ name: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, name: true, divisionType: true, isActive: true } }),
      this.db.province.count({ where }),
    ]);
    return this.result(data, total, query);
  }

  async wards(query: WardQueryDto) {
    const where = { ...this.whereActive(), province: { isActive: true, ...(query.provinceCode && { code: query.provinceCode }) } };
    if (query.q) {
      const key = searchKey(query.q);
      const rows = await this.db.ward.findMany({ where, orderBy: [{ name: "asc" }, { code: "asc" }],
        select: { id: true, code: true, name: true, divisionType: true, codename: true, isActive: true,
          province: { select: { code: true } } } });
      const matches = rows.filter((row) => searchKey(row.name).includes(key) || row.code.includes(key));
      return this.result(matches.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
        .map(({ province, ...row }) => ({ ...row, provinceCode: province.code })), matches.length, query);
    }
    const [rows, total] = await Promise.all([
      this.db.ward.findMany({ where, orderBy: [{ name: "asc" }, { code: "asc" }], ...this.page(query), select: { id: true, code: true, name: true, divisionType: true, codename: true, isActive: true, province: { select: { code: true } } } }),
      this.db.ward.count({ where }),
    ]);
    return this.result(rows.map(({ province, ...row }) => ({ ...row, provinceCode: province.code })), total, query);
  }
}
