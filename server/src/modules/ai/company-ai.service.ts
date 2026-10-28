import { BadRequestException, HttpException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AiProviderService } from "./ai-provider.service";
import { COMPANY_AI_INSTRUCTIONS, companyAiPrompt, parseCompanyAiOutput, type CompanyAiFeature } from "./company-ai-output";

type Reservation = { id: string; companyId: string; monthStart: Date; dayStart: Date };
const quotaExceeded = () => new HttpException({ code: "AI_COMPANY_QUOTA_EXCEEDED",
  message: "Company AI request quota is exhausted." }, 429);
const period = (now: Date) => ({
  monthStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  dayStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
});
const sameDay = (a: Date, b: Date) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

@Injectable()
export class CompanyAiService {
  constructor(private readonly db: PrismaService, private readonly provider: AiProviderService,
    private readonly config: ConfigService) {}

  private limits() {
    return { monthly: this.config.get<number>("FINDWORK_COMPANY_AI_MONTHLY_LIMIT") ?? 100,
      daily: this.config.get<number>("FINDWORK_COMPANY_AI_DAILY_LIMIT") ?? 20 };
  }

  async status(companyId: string) {
    const quota = await this.db.companyAiQuota.findUnique({ where: { companyId }, select: { companyId: true } });
    const configured = this.provider.isConfigured();
    const available = Boolean(quota) && configured;
    return { status: !quota ? "unavailable" : configured ? "available" : "unconfigured", version: "1.0.0",
      features: { jobDrafting: available, jobReview: available, screeningQuestions: available,
        interviewQuestions: available, recruitmentPlan: available },
      supportedModels: configured ? [this.provider.modelName()] : [] };
  }

  async quota(companyId: string) {
    const row = await this.db.companyAiQuota.findUnique({ where: { companyId } });
    if (!row) throw new ServiceUnavailableException({ code: "AI_COMPANY_QUOTA_NOT_PROVISIONED" });
    const now = new Date();
    const current = period(now);
    const limits = this.limits();
    const monthlyCreditsTotal = Math.min(row.monthlyLimit, limits.monthly);
    const dailyRequestsLimit = Math.min(row.dailyLimit, limits.daily);
    const monthlyUsed = sameDay(row.monthStart, current.monthStart) ? row.monthlyUsed : 0;
    const dailyRequestsUsed = sameDay(row.dayStart, current.dayStart) ? row.dailyUsed : 0;
    return { companyId, planName: "Company AI request quota", monthlyCreditsTotal,
      monthlyCreditsRemaining: Math.max(0, monthlyCreditsTotal - monthlyUsed),
      dailyRequestsUsed, dailyRequestsLimit,
      renewsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString() };
  }

  private async reserve(companyId: string, actorUserId: string, feature: CompanyAiFeature,
    model: string): Promise<Reservation> {
    const current = period(new Date());
    const monthKey = current.monthStart.toISOString().slice(0, 10);
    const dayKey = current.dayStart.toISOString().slice(0, 10);
    const limits = this.limits();
    return this.db.$transaction(async (tx) => {
      // This single conditional UPDATE locks one company row, so concurrent requests
      // cannot overdraw either period. A missing quota row fails closed.
      const rows = await tx.$queryRaw<Array<{ monthStart: Date; dayStart: Date }>>`
        UPDATE "CompanyAiQuota"
        SET "monthStart" = ${monthKey}::date,
            "dayStart" = ${dayKey}::date,
            "monthlyUsed" = CASE WHEN "monthStart" = ${monthKey}::date THEN "monthlyUsed" + 1 ELSE 1 END,
            "dailyUsed" = CASE WHEN "dayStart" = ${dayKey}::date THEN "dailyUsed" + 1 ELSE 1 END,
            "updatedAt" = NOW()
        WHERE "companyId" = ${companyId}::uuid
          AND (CASE WHEN "monthStart" = ${monthKey}::date THEN "monthlyUsed" ELSE 0 END)
              < LEAST("monthlyLimit", ${limits.monthly})
          AND (CASE WHEN "dayStart" = ${dayKey}::date THEN "dailyUsed" ELSE 0 END)
              < LEAST("dailyLimit", ${limits.daily})
        RETURNING "monthStart", "dayStart"
      `;
      if (rows.length !== 1) {
        const exists = await tx.companyAiQuota.findUnique({ where: { companyId }, select: { companyId: true } });
        if (!exists) throw new ServiceUnavailableException({ code: "AI_COMPANY_QUOTA_NOT_PROVISIONED" });
        throw quotaExceeded();
      }
      const log = await tx.companyAiGenerationLog.create({ data: {
        companyId, actorUserId, feature, status: "PENDING", model,
      }, select: { id: true } });
      return { id: log.id, companyId, monthStart: rows[0]!.monthStart, dayStart: rows[0]!.dayStart };
    });
  }

  private async release(reservation: Reservation, inputTokens = 0, outputTokens = 0) {
    const monthKey = reservation.monthStart.toISOString().slice(0, 10);
    const dayKey = reservation.dayStart.toISOString().slice(0, 10);
    await this.db.$transaction(async (tx) => {
      const updated = await tx.companyAiGenerationLog.updateMany({ where: { id: reservation.id, status: "PENDING" },
        data: { status: "FAILED", inputTokens, outputTokens } });
      if (updated.count !== 1) return;
      await tx.$executeRaw`
        UPDATE "CompanyAiQuota"
        SET "monthlyUsed" = CASE WHEN "monthStart" = ${monthKey}::date
              THEN GREATEST("monthlyUsed" - 1, 0) ELSE "monthlyUsed" END,
            "dailyUsed" = CASE WHEN "dayStart" = ${dayKey}::date
              THEN GREATEST("dailyUsed" - 1, 0) ELSE "dailyUsed" END,
            "updatedAt" = NOW()
        WHERE "companyId" = ${reservation.companyId}::uuid
      `;
    });
  }

  async generate(companyId: string, actorUserId: string, feature: CompanyAiFeature,
    input: Record<string, unknown>) {
    if (Object.values(input).some((value) => value === null ||
        (Array.isArray(value) && value.some((item) => item === null))) ||
        Buffer.byteLength(JSON.stringify(input), "utf8") > 12_000) {
      throw new BadRequestException({ code: "AI_MESSAGE_INVALID" });
    }
    if (feature === "IMPROVE_JOB" && input.jobId) {
      const job = await this.db.job.findFirst({ where: { id: input.jobId as string, companyId },
        select: { id: true } });
      if (!job) throw new NotFoundException({ code: "JOB_NOT_FOUND" });
    }
    const model = this.provider.modelName();
    const reservation = await this.reserve(companyId, actorUserId, feature, model);
    let tokens: { inputTokens: number; outputTokens: number } | undefined;
    try {
      const result = await this.provider.generate([], companyAiPrompt(feature, input), undefined,
        { instructions: COMPANY_AI_INSTRUCTIONS, maxOutputTokens: 3000 });
      tokens = { inputTokens: result.inputTokens, outputTokens: result.outputTokens };
      const output = parseCompanyAiOutput(feature, result.text);
      await this.db.companyAiGenerationLog.update({ where: { id: reservation.id },
        data: { status: "SUCCEEDED", inputTokens: result.inputTokens, outputTokens: result.outputTokens } });
      return output;
    } catch (error) {
      await this.release(reservation, tokens?.inputTokens, tokens?.outputTokens);
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException({ code: "AI_PROVIDER_UNAVAILABLE" });
    }
  }
}
