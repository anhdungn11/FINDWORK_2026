import "reflect-metadata";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { randomInt, randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/exceptions/api-exception.filter";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { assertSafeIntegrationDatabase } from "./integration-safety";

const API = "/api/v1/reference";
const ROUTES = [
  "job-categories", "skill-categories", "skills", "languages",
  "language-certificate-types", "provinces", "wards",
] as const;
type Route = typeof ROUTES[number];
type Owned = {
  ward: string[];
  province: string[];
  certificate: string[];
  language: string[];
  skill: string[];
  skillCategoryChild: string[];
  skillCategoryParent: string[];
  jobCategory: string[];
};

describe("Reference HTTP integration (fixture scoped)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owned: Owned;
  let visible: Record<Route, string>;
  let hidden: Record<Route, string>;
  let excluded: Record<Route, string[]>;
  let codes: { activeCategory: string; activeParent: string; activeLanguage: string; activeProvince: string };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    const config = app.get(ConfigService);
    app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await assertSafeIntegrationDatabase(prisma, config);
  });

  beforeEach(async () => {
    owned = { ward: [], province: [], certificate: [], language: [], skill: [],
      skillCategoryChild: [], skillCategoryParent: [], jobCategory: [] };
    visible = {} as Record<Route, string>;
    hidden = {} as Record<Route, string>;
    excluded = {
      "job-categories": [], "skill-categories": [], skills: [], languages: [],
      "language-certificate-types": [], provinces: [], wards: [],
    };
    const token = randomUUID().replace(/-/g, "").slice(0, 18);
    const slug = (suffix: string) => `cp8a-${token}-${suffix}`;
    const existingProvinces = new Set((await prisma.province.findMany({ select: { code: true } })).map((row) => row.code));
    const freeProvinces = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, "0"))
      .filter((code) => !existingProvinces.has(code)).slice(0, 2);
    const existingLanguages = new Set((await prisma.language.findMany({ select: { code: true } })).map((row) => row.code));
    const freeLanguages: string[] = [];
    for (const a of "qzxv" ) for (const b of "abcdefghijklmnopqrstuvwxyz") for (const d of "abcdefghijklmnopqrstuvwxyz") {
      const code = `${a}${b}${d}`;
      if (!existingLanguages.has(code) && freeLanguages.length < 2) freeLanguages.push(code);
    }
    if (freeProvinces.length < 2 || freeLanguages.length < 2) {
      throw new Error("BLOCKED: no unused Province/Language codes for isolated fixtures.");
    }

    const job = await prisma.jobCategory.create({ data: { code: slug("job-active"), name: "CP8A active job", sortOrder: -1000 } });
    owned.jobCategory.push(job.id);
    const hiddenJob = await prisma.jobCategory.create({ data: { code: slug("job-inactive"), name: "CP8A inactive job", isActive: false } });
    owned.jobCategory.push(hiddenJob.id);
    visible["job-categories"] = job.id; hidden["job-categories"] = hiddenJob.id;
    excluded["job-categories"].push(hiddenJob.id);

    const category = await prisma.skillCategory.create({ data: { code: slug("category-active"), name: "CP8A active category", sortOrder: -1000 } });
    owned.skillCategoryParent.push(category.id);
    const inactiveCategory = await prisma.skillCategory.create({ data: { code: slug("category-inactive"), name: "CP8A inactive category", isActive: false } });
    owned.skillCategoryParent.push(inactiveCategory.id);
    const child = await prisma.skillCategory.create({ data: { code: slug("child-active"), name: "CP8A active child", parentId: category.id, sortOrder: -1000 } });
    owned.skillCategoryChild.push(child.id);
    const hiddenChild = await prisma.skillCategory.create({ data: { code: slug("child-hidden"), name: "CP8A hidden child", parentId: inactiveCategory.id } });
    owned.skillCategoryChild.push(hiddenChild.id);
    visible["skill-categories"] = child.id; hidden["skill-categories"] = hiddenChild.id;
    excluded["skill-categories"].push(inactiveCategory.id, hiddenChild.id);

    const skill = await prisma.skill.create({ data: { code: slug("skill-active"), name: "CP8A active skill", categoryId: category.id, sortOrder: -1000 } });
    owned.skill.push(skill.id);
    const inactiveSkill = await prisma.skill.create({ data: { code: slug("skill-inactive"), name: "CP8A inactive skill", categoryId: category.id, isActive: false } });
    owned.skill.push(inactiveSkill.id);
    const hiddenSkill = await prisma.skill.create({ data: { code: slug("skill-hidden"), name: "CP8A hidden skill", categoryId: inactiveCategory.id } });
    owned.skill.push(hiddenSkill.id);
    visible.skills = skill.id; hidden.skills = hiddenSkill.id;
    excluded.skills.push(inactiveSkill.id, hiddenSkill.id);

    const language = await prisma.language.create({ data: { code: freeLanguages[0]!, label: "CP8A active language", englishLabel: "CP8A active", sortOrder: -1000 } });
    owned.language.push(language.id);
    const inactiveLanguage = await prisma.language.create({ data: { code: freeLanguages[1]!, label: "CP8A inactive language", englishLabel: "CP8A inactive", isActive: false } });
    owned.language.push(inactiveLanguage.id);
    visible.languages = language.id; hidden.languages = inactiveLanguage.id;
    excluded.languages.push(inactiveLanguage.id);

    const cert = await prisma.languageCertificateType.create({ data: { code: `CP8A_${token}_ACTIVE`, languageId: language.id, label: "CP8A active certificate", scoreFields: [], sortOrder: -1000 } });
    owned.certificate.push(cert.id);
    const inactiveCert = await prisma.languageCertificateType.create({ data: { code: `CP8A_${token}_INACTIVE`, languageId: language.id, label: "CP8A inactive certificate", scoreFields: [], isActive: false } });
    owned.certificate.push(inactiveCert.id);
    const hiddenCert = await prisma.languageCertificateType.create({ data: { code: `CP8A_${token}_HIDDEN`, languageId: inactiveLanguage.id, label: "CP8A hidden certificate", scoreFields: [] } });
    owned.certificate.push(hiddenCert.id);
    visible["language-certificate-types"] = cert.id; hidden["language-certificate-types"] = hiddenCert.id;
    excluded["language-certificate-types"].push(inactiveCert.id, hiddenCert.id);

    const province = await prisma.province.create({ data: { code: freeProvinces[0]!, name: `000 CP8A ${token}`, divisionType: "province" } });
    owned.province.push(province.id);
    const inactiveProvince = await prisma.province.create({ data: { code: freeProvinces[1]!, name: `999 CP8A ${token}`, divisionType: "province", isActive: false } });
    owned.province.push(inactiveProvince.id);
    visible.provinces = province.id; hidden.provinces = inactiveProvince.id;
    excluded.provinces.push(inactiveProvince.id);

    const wardCode = () => String(randomInt(1_000_000_000, 10_000_000_000));
    const ward = await prisma.ward.create({ data: { code: wardCode(), provinceId: province.id, name: `000 CP8A ward ${token}`, divisionType: "ward", codename: slug("ward-active") } });
    owned.ward.push(ward.id);
    const inactiveWard = await prisma.ward.create({ data: { code: wardCode(), provinceId: province.id, name: `999 CP8A ward ${token}`, divisionType: "ward", codename: slug("ward-inactive"), isActive: false } });
    owned.ward.push(inactiveWard.id);
    const hiddenWard = await prisma.ward.create({ data: { code: wardCode(), provinceId: inactiveProvince.id, name: `888 CP8A ward ${token}`, divisionType: "ward", codename: slug("ward-hidden") } });
    owned.ward.push(hiddenWard.id);
    visible.wards = ward.id; hidden.wards = hiddenWard.id;
    excluded.wards.push(inactiveWard.id, hiddenWard.id);
    codes = { activeCategory: category.code, activeParent: category.code, activeLanguage: language.code, activeProvince: province.code };
  });

  afterEach(async () => {
    if (!prisma || !owned) return;
    const remove = async (key: keyof typeof owned, model: { deleteMany: (args: { where: { id: { in: string[] } } }) => Promise<unknown> }) => {
      if (owned[key].length) await model.deleteMany({ where: { id: { in: owned[key] } } });
    };
    await remove("ward", prisma.ward);
    await remove("province", prisma.province);
    await remove("certificate", prisma.languageCertificateType);
    await remove("language", prisma.language);
    await remove("skill", prisma.skill);
    await remove("skillCategoryChild", prisma.skillCategory);
    await remove("skillCategoryParent", prisma.skillCategory);
    await remove("jobCategory", prisma.jobCategory);
  });

  afterAll(async () => app?.close());

  async function all(route: Route, filters: Record<string, string> = {}) {
    const data: Array<{ id: string; code: string; [key: string]: unknown }> = [];
    let page = 1;
    let totalPages = 1;
    do {
      const response = await request(app.getHttpServer()).get(`${API}/${route}`)
        .query({ ...filters, page, pageSize: 100 }).expect(200);
      data.push(...response.body.data);
      totalPages = response.body.pagination.totalPages;
      page += 1;
    } while (page <= totalPages);
    return data;
  }

  it.each(ROUTES)("GET %s returns active DB UUIDs and excludes inactive fixtures", async (route) => {
    const data = await all(route);
    const explicitActive = await all(route, { active: "true" });
    expect(data.map((row) => row.id)).toContain(visible[route]);
    expect(explicitActive.map((row) => row.id)).toContain(visible[route]);
    for (const id of excluded[route]) expect(data.map((row) => row.id)).not.toContain(id);
    expect(visible[route]).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it.each(ROUTES)("GET %s rejects active=false and active=all", async (route) => {
    for (const active of ["false", "all"]) {
      await request(app.getHttpServer()).get(`${API}/${route}`).query({ active }).expect(400);
    }
  });

  it("filters children by active parent code and hides children of inactive parents", async () => {
    const categories = await all("skill-categories", { parentCode: codes.activeParent });
    expect(categories.map((row) => row.id)).toContain(visible["skill-categories"]);
    expect(categories.map((row) => row.id)).not.toContain(hidden["skill-categories"]);
    const skills = await all("skills", { categoryCode: codes.activeCategory });
    expect(skills.map((row) => row.id)).toContain(visible.skills);
    expect(skills.map((row) => row.id)).not.toContain(hidden.skills);
    const certificates = await all("language-certificate-types", { languageCode: codes.activeLanguage });
    expect(certificates.map((row) => row.id)).toContain(visible["language-certificate-types"]);
    expect(certificates.map((row) => row.id)).not.toContain(hidden["language-certificate-types"]);
    const wards = await all("wards", { provinceCode: codes.activeProvince });
    expect(wards.map((row) => row.id)).toContain(visible.wards);
    expect(wards.map((row) => row.id)).not.toContain(hidden.wards);
  });

  it.each(ROUTES)("GET %s paginates consistently", async (route) => {
    const first = await request(app.getHttpServer()).get(`${API}/${route}`)
      .query({ page: 1, pageSize: 1 }).expect(200);
    const second = await request(app.getHttpServer()).get(`${API}/${route}`)
      .query({ page: 2, pageSize: 1 }).expect(200);
    expect(first.body.pagination).toEqual(expect.objectContaining({ page: 1, pageSize: 1 }));
    expect(second.body.pagination).toEqual(expect.objectContaining({ page: 2, pageSize: 1 }));
    expect(second.body.pagination.total).toBe(first.body.pagination.total);
    expect(first.body.data).toHaveLength(1);
    if (first.body.pagination.total > 1) {
      expect(second.body.data).toHaveLength(1);
      expect(second.body.data[0].id).not.toBe(first.body.data[0].id);
    } else {
      expect(second.body.data).toHaveLength(0);
    }
  });
});
