import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type {
  CompanyJobQueryDto, CreateJobDto, JobLocationDto, PublicJobQueryDto, UpdateJobDto,
} from "./dto/job.dto";
import type { ReplaceScreeningQuestionsDto } from "./dto/screening-question.dto";
import { applicantQuestionSelect, jobSelect } from "./job-select";
import { publicJobVisibility } from "./public-job-visibility";
import { normalizeScreeningQuestions } from "./screening-question.rules";

type JobRow = Prisma.JobGetPayload<{ select: typeof jobSelect }>;
type JobChanges = Partial<CreateJobDto>;
const publicJobSelect = {
  ...jobSelect,
  company: { select: { id: true, name: true, slug: true, logoAssetKey: true } },
  locations: { select: { id: true, isPrimary: true, addressLine: true,
    province: { select: { code: true, name: true } },
    ward: { select: { code: true, name: true } } }, orderBy: [{ isPrimary: "desc" }, { id: "asc" }] },
} satisfies Prisma.JobSelect;

function badRequest(code: string, message: string): BadRequestException {
  return new BadRequestException({ code, message });
}
function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ code, message });
}
function notFound(): NotFoundException {
  return new NotFoundException({ code: "JOB_NOT_FOUND", message: "Job was not found." });
}

@Injectable()
export class JobsService {
  constructor(private readonly db: PrismaService) {}

  private async requireActor(tx: Prisma.TransactionClient, companyId: string, userId: string) {
    const member = await tx.companyMember.findFirst({
      where: { companyId, userId, status: "ACTIVE", removedAt: null, company: { status: "ACTIVE" } },
      select: { id: true },
    });
    if (!member) {
      throw new ForbiddenException({ code: "AUTHORIZATION_FORBIDDEN", message: "Active company membership is required." });
    }
    return member;
  }

  private async requireCategory(tx: Prisma.TransactionClient, categoryId: string): Promise<void> {
    const category = await tx.jobCategory.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true } });
    if (!category) throw badRequest("JOB_CATEGORY_INVALID", "An active job category is required.");
  }

  private async resolveLocation(tx: Prisma.TransactionClient, location: JobLocationDto) {
    const province = await tx.province.findFirst({ where: { code: location.provinceCode, isActive: true }, select: { id: true } });
    if (!province) throw badRequest("JOB_PROVINCE_INVALID", "An active province is required.");
    let wardId: string | null = null;
    if (location.wardCode) {
      const ward = await tx.ward.findFirst({ where: { code: location.wardCode, provinceId: province.id, isActive: true }, select: { id: true } });
      if (!ward) throw badRequest("JOB_WARD_INVALID", "An active ward in the selected province is required.");
      wardId = ward.id;
    }
    return { countryCode: "VN", provinceId: province.id, wardId, addressLine: location.addressLine ?? null, isPrimary: true };
  }

  private toPublicJob<T extends { company: { logoAssetKey: string | null; id: string } }>(row: T) {
    const { logoAssetKey, ...company } = row.company;
    return { ...row, company: { ...company,
      logoUrl: logoAssetKey ? `/api/v1/companies/${company.id}/media/logo` : null } };
  }

  private checkValues(input: JobChanges, current?: JobRow): void {
    const minMonths = input.experienceMinMonths !== undefined ? input.experienceMinMonths : current?.experienceMinMonths;
    const maxMonths = input.experienceMaxMonths !== undefined ? input.experienceMaxMonths : current?.experienceMaxMonths;
    if (minMonths != null && maxMonths != null && minMonths > maxMonths) {
      throw badRequest("JOB_INVALID_RANGE", "Experience minimum exceeds maximum.");
    }
    const minSalary = input.salaryMin !== undefined ? input.salaryMin : current?.salaryMin?.toString();
    const maxSalary = input.salaryMax !== undefined ? input.salaryMax : current?.salaryMax?.toString();
    if (minSalary != null && maxSalary != null && new Prisma.Decimal(minSalary).greaterThan(new Prisma.Decimal(maxSalary))) {
      throw badRequest("JOB_INVALID_RANGE", "Salary minimum exceeds maximum.");
    }
  }

  private async ownedJob(tx: Prisma.TransactionClient, companyId: string, jobId: string): Promise<JobRow> {
    const job = await tx.job.findFirst({ where: { id: jobId, companyId }, select: jobSelect });
    if (!job) throw notFound();
    return job;
  }

  async create(companyId: string, userId: string, dto: CreateJobDto) {
    this.checkValues(dto);
    return this.db.$transaction(async (tx) => {
      const member = await this.requireActor(tx, companyId, userId);
      await this.requireCategory(tx, dto.categoryId);
      const location = dto.location ? await this.resolveLocation(tx, dto.location) : null;
      const created = await tx.job.create({
        data: {
          companyId, createdByMemberId: member.id, categoryId: dto.categoryId,
          title: dto.title, description: dto.description,
          employmentType: dto.employmentType, workplaceType: dto.workplaceType,
          experienceMinMonths: dto.experienceMinMonths, experienceMaxMonths: dto.experienceMaxMonths,
          salaryMin: dto.salaryMin, salaryMax: dto.salaryMax,
          currency: dto.currency, salaryPeriod: dto.salaryPeriod,
          salaryNegotiable: dto.salaryNegotiable, showSalary: dto.showSalary,
          applicationDeadline: dto.applicationDeadline ? new Date(dto.applicationDeadline) : null,
          ...(location && { locations: { create: location } }),
        },
        select: { id: true },
      });
      await tx.auditLog.create({ data: {
        actorUserId: userId, companyId, action: "job.create", targetType: "Job", targetId: created.id,
        afterData: { status: "DRAFT" },
      } });
      return tx.job.findUniqueOrThrow({ where: { id: created.id }, select: jobSelect });
    });
  }

  async listCompany(companyId: string, query: CompanyJobQueryDto) {
    const where: Prisma.JobWhereInput = { companyId, ...(query.status && { status: query.status }) };
    const [data, total] = await Promise.all([
      this.db.job.findMany({ where, select: jobSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.job.count({ where }),
    ]);
    return { data, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  }

  async getCompany(companyId: string, jobId: string) {
    const job = await this.db.job.findFirst({ where: { id: jobId, companyId }, select: jobSelect });
    if (!job) throw notFound();
    return job;
  }

  async listScreeningQuestions(companyId: string, jobId: string) {
    const job = await this.db.job.findFirst({ where: { id: jobId, companyId }, select: { id: true, version: true } });
    if (!job) throw notFound();
    const questions = await this.db.screeningQuestion.findMany({
      where: { jobId, isActive: true }, select: applicantQuestionSelect,
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    });
    return { jobId, version: job.version, questions };
  }

  async replaceScreeningQuestions(companyId: string, jobId: string, userId: string, dto: ReplaceScreeningQuestionsDto) {
    const questions = normalizeScreeningQuestions(dto.questions);
    return this.db.$transaction(async (tx) => {
      await this.requireActor(tx, companyId, userId);
      const job = await tx.job.findFirst({ where: { id: jobId, companyId }, select: { status: true, version: true } });
      if (!job) throw notFound();
      if (job.status !== "DRAFT" && job.status !== "PAUSED") {
        throw conflict("SCREENING_JOB_STATE_CONFLICT", "Pause the job before changing screening questions.");
      }
      if (job.version !== dto.version) throw conflict("JOB_VERSION_CONFLICT", "Job version is stale.");
      const changed = await tx.job.updateMany({
        where: { id: jobId, companyId, status: job.status, version: dto.version },
        data: { version: { increment: 1 } },
      });
      if (changed.count !== 1) throw conflict("JOB_VERSION_CONFLICT", "Job changed during screening question update.");
      await tx.screeningQuestion.updateMany({ where: { jobId, isActive: true }, data: { isActive: false } });
      if (questions.length) {
        await tx.screeningQuestion.createMany({ data: questions.map((question) => ({
          jobId, type: question.type, label: question.label, isRequired: question.isRequired,
          displayOrder: question.displayOrder, options: question.options,
        })) });
      }
      await tx.auditLog.create({ data: {
        actorUserId: userId, companyId, action: "job.screening_questions.replace", targetType: "Job", targetId: jobId,
        metadata: { fromVersion: dto.version, count: questions.length },
      } });
      const active = await tx.screeningQuestion.findMany({ where: { jobId, isActive: true },
        select: applicantQuestionSelect, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
      return { jobId, version: dto.version + 1, questions: active };
    });
  }

  async update(companyId: string, jobId: string, userId: string, dto: UpdateJobDto) {
    const { version, ...changes } = dto;
    if (Object.keys(changes).length === 0) throw badRequest("JOB_UPDATE_EMPTY", "At least one job field is required.");
    for (const key of ["categoryId", "title", "description", "employmentType", "workplaceType", "experienceMinMonths", "experienceMaxMonths", "currency", "salaryPeriod", "salaryNegotiable", "showSalary"] as const) {
      if (Object.hasOwn(changes, key) && changes[key] === null) throw badRequest("JOB_FIELD_INVALID", `${key} cannot be null.`);
    }
    return this.db.$transaction(async (tx) => {
      await this.requireActor(tx, companyId, userId);
      const current = await this.ownedJob(tx, companyId, jobId);
      if (current.status !== "DRAFT" && current.status !== "PUBLISHED" && current.status !== "PAUSED") {
        throw conflict("JOB_STATE_CONFLICT", "This job cannot be edited.");
      }
      if (current.version !== version) throw conflict("JOB_VERSION_CONFLICT", "Job version is stale.");
      if (changes.categoryId !== undefined) await this.requireCategory(tx, changes.categoryId);
      this.checkValues(changes, current);
      const deadline = changes.applicationDeadline !== undefined
        ? changes.applicationDeadline ? new Date(changes.applicationDeadline) : null
        : current.applicationDeadline;
      if (current.status === "PUBLISHED" && deadline && deadline <= new Date()) {
        throw conflict("JOB_DEADLINE_EXPIRED", "A published job deadline must be in the future.");
      }
      const { location: locationInput, ...jobChanges } = changes;
      const location = locationInput ? await this.resolveLocation(tx, locationInput) : null;
      const updated = await tx.job.updateMany({
        where: { id: jobId, companyId, status: current.status, version },
        data: {
          ...jobChanges,
          ...(changes.applicationDeadline !== undefined && {
            applicationDeadline: changes.applicationDeadline ? new Date(changes.applicationDeadline) : null,
          }),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw conflict("JOB_VERSION_CONFLICT", "Job changed during update.");
      if (location) {
        const currentLocation = await tx.jobLocation.findFirst({ where: { jobId, isPrimary: true }, select: { id: true } });
        if (currentLocation) await tx.jobLocation.update({ where: { id: currentLocation.id }, data: location });
        else await tx.jobLocation.create({ data: { ...location, jobId } });
      }
      await tx.auditLog.create({ data: {
        actorUserId: userId, companyId, action: "job.update", targetType: "Job", targetId: jobId,
        metadata: { changedFields: Object.keys(changes), fromVersion: version },
      } });
      return tx.job.findUniqueOrThrow({ where: { id: jobId }, select: jobSelect });
    });
  }

  async transition(companyId: string, jobId: string, userId: string, version: number, action: "publish" | "pause" | "close") {
    return this.db.$transaction(async (tx) => {
      await this.requireActor(tx, companyId, userId);
      const current = await this.ownedJob(tx, companyId, jobId);
      if (current.version !== version) throw conflict("JOB_VERSION_CONFLICT", "Job version is stale.");
      const allowed = action === "publish" ? current.status === "DRAFT" || current.status === "PAUSED"
        : action === "pause" ? current.status === "PUBLISHED"
          : current.status === "PUBLISHED" || current.status === "PAUSED";
      if (!allowed) throw conflict("JOB_STATE_CONFLICT", `Cannot ${action} a ${current.status.toLowerCase()} job.`);
      const now = new Date();
      if (action === "publish") {
        await this.requireCategory(tx, current.categoryId);
        if ((current.applicationDeadline && current.applicationDeadline <= now) || (current.expiresAt && current.expiresAt <= now)) {
          throw conflict("JOB_DEADLINE_EXPIRED", "Job deadline or expiry must be in the future.");
        }
      }
      const status = action === "publish" ? "PUBLISHED" : action === "pause" ? "PAUSED" : "CLOSED";
      const updated = await tx.job.updateMany({
        where: { id: jobId, companyId, version, status: current.status },
        data: { status, version: { increment: 1 }, ...(action === "publish" && { publishedAt: now }) },
      });
      if (updated.count !== 1) throw conflict("JOB_VERSION_CONFLICT", "Job changed during transition.");
      await tx.auditLog.create({ data: {
        actorUserId: userId, companyId, action: `job.${action}`, targetType: "Job", targetId: jobId,
        beforeData: { status: current.status, version }, afterData: { status, version: version + 1 },
      } });
      return tx.job.findUniqueOrThrow({ where: { id: jobId }, select: jobSelect });
    });
  }

  private publicWhere(query?: PublicJobQueryDto): Prisma.JobWhereInput {
    const salaryFilter = query?.salaryAtLeast !== undefined || query?.salaryAtMost !== undefined ||
      query?.currency !== undefined || query?.salaryPeriod !== undefined ||
      query?.sort === "salary_asc" || query?.sort === "salary_desc";
    return {
      ...publicJobVisibility(new Date()), company: { status: "ACTIVE" },
      ...(query?.q && { OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        { company: { name: { contains: query.q, mode: "insensitive" } } },
      ] satisfies Prisma.JobWhereInput[] }),
      ...(query?.companyId && { companyId: query.companyId }),
      ...(query?.categoryCode && { category: { isActive: true, code: query.categoryCode } }),
      ...(query?.employmentType && { employmentType: query.employmentType }),
      ...(query?.workplaceType && { workplaceType: query.workplaceType }),
      ...(query?.provinceCode && { locations: { some: { province: { code: query.provinceCode, isActive: true } } } }),
      ...(salaryFilter && { showSalary: true, salaryNegotiable: false,
        currency: query?.currency ?? "VND", salaryPeriod: query?.salaryPeriod ?? "MONTH" }),
      ...(query?.salaryAtLeast && { salaryMax: { gte: query.salaryAtLeast } }),
      ...(query?.salaryAtMost && { salaryMin: { lte: query.salaryAtMost } }),
      ...((query?.sort === "salary_asc" || query?.sort === "salary_desc") && { salaryMin: {
        ...(query?.salaryAtMost && { lte: query.salaryAtMost }), not: null,
      } }),
    };
  }

  async listPublic(query: PublicJobQueryDto) {
    if (query.salaryAtLeast && query.salaryAtMost &&
        new Prisma.Decimal(query.salaryAtLeast).greaterThan(new Prisma.Decimal(query.salaryAtMost))) {
      throw badRequest("JOB_INVALID_RANGE", "Salary minimum exceeds maximum.");
    }
    const where = this.publicWhere(query);
    const orderBy: Prisma.JobOrderByWithRelationInput[] = query.sort === "salary_asc"
      ? [{ salaryMin: "asc" }, { publishedAt: "desc" }, { id: "desc" }]
      : query.sort === "salary_desc"
        ? [{ salaryMin: "desc" }, { publishedAt: "desc" }, { id: "desc" }]
        : [{ publishedAt: "desc" }, { id: "desc" }];
    const [data, total] = await this.db.$transaction([
      this.db.job.findMany({ where, select: publicJobSelect, orderBy, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.job.count({ where }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return { data: data.map((row) => this.toPublicJob(row)), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  }

  async getPublic(jobId: string) {
    const job = await this.db.job.findFirst({ where: { id: jobId, ...this.publicWhere() },
      select: { ...publicJobSelect, screeningQuestions: {
        where: { isActive: true }, select: applicantQuestionSelect,
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      } },
    });
    if (!job) throw notFound();
    return this.toPublicJob(job);
  }
}
