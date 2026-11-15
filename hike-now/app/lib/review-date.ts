export type ReviewDatePeriod = "all" | "week" | "month" | "year";

const PERIOD_DAYS: Record<Exclude<ReviewDatePeriod, "all">, number> = {
  week: 7,
  month: 30,
  year: 365,
};

export function isReviewDatePeriod(value: unknown): value is ReviewDatePeriod {
  return value === "all" || value === "week" || value === "month" || value === "year";
}

export function getReviewDateRange(
  period: ReviewDatePeriod,
  now?: Date,
): { startDate: string; endDate: string } | null {
  if (period === "all") return null;

  const referenceDate = now ?? new Date();
  const end = new Date(Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  ));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - PERIOD_DAYS[period] + 1);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
