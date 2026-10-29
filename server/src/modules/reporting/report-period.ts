import { BadRequestException } from "@nestjs/common";
import { isISO8601 } from "class-validator";

export type ReportPeriodKey = "7d" | "30d" | "90d" | "all" | "custom";
export type ReportPeriodQuery = { period?: unknown; startDate?: unknown; endDate?: unknown };

const days: Partial<Record<ReportPeriodKey, number>> = { "7d": 7, "30d": 30, "90d": 90 };

function invalid(): never {
  throw new BadRequestException({ code: "INVALID_PERIOD_PARAMS",
    message: "Provide a valid period and, for custom, inclusive ISO 8601 dates with UTC offsets." });
}

function date(value: unknown): Date {
  if (typeof value !== "string" || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !isISO8601(value, { strict: true, strictSeparator: true })) invalid();
  const result = new Date(value);
  if (!Number.isFinite(result.getTime())) invalid();
  return result;
}

export function resolveReportPeriod(query: ReportPeriodQuery, now = new Date()) {
  const key = query.period ?? "30d";
  if (key !== "7d" && key !== "30d" && key !== "90d" && key !== "all" && key !== "custom") invalid();
  let start: Date | null;
  let end: Date;
  if (key === "custom") {
    start = date(query.startDate);
    end = date(query.endDate);
    if (start > end) invalid();
  } else {
    if (query.startDate !== undefined || query.endDate !== undefined) invalid();
    start = key === "all" ? null : new Date(now.getTime() - days[key]! * 86_400_000);
    end = now;
  }
  return { key, startDate: start?.toISOString() ?? null, endDate: end.toISOString(),
    generatedAt: now.toISOString(), start, end };
}

export function periodDateFilter(period: ReturnType<typeof resolveReportPeriod>) {
  return { ...(period.start && { gte: period.start }), lte: period.end };
}

export function publicPeriod(period: ReturnType<typeof resolveReportPeriod>) {
  return { key: period.key, startDate: period.startDate,
    endDate: period.endDate, generatedAt: period.generatedAt };
}
